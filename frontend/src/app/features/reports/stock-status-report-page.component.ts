import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReportsService } from '../../core/services/reports.service';
import { StockStatusDto } from '../../core/models/report.models';

@Component({
  standalone: true,
  selector: 'app-stock-status-report-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="toolbar">
      <span class="title">Stok Durumu Raporu</span>
      <span class="spacer"></span>
      <button mat-stroked-button [disabled]="exporting" (click)="export()">
        <mat-icon>file_download</mat-icon>
        Excel'e Aktar
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Ara (Ürün Kodu/Ad)</mat-label>
        <input matInput [(ngModel)]="search">
      </mat-form-field>
    </div>

    @if (loading) {
      <div class="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>
    } @else if (error) {
      <div class="error-state">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error }}</span>
        <button mat-button (click)="reload()">Tekrar Dene</button>
      </div>
    } @else if (filteredRows().length === 0) {
      <p class="empty">{{ rows.length === 0 ? 'Aktif ürün bulunmuyor.' : 'Arama kriterine uyan ürün bulunamadı.' }}</p>
    } @else {
      <div class="table-wrap">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Ürün Kodu</th>
              <th>Ürün Adı</th>
              <th>Birim</th>
              <th class="amount-col">Giren</th>
              <th class="amount-col">Çıkan</th>
              <th class="amount-col">Rezerve</th>
              <th class="amount-col">Mevcut</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filteredRows(); track row.itemId) {
              <tr>
                <td>{{ row.itemCode }}</td>
                <td>{{ row.itemName }}</td>
                <td>{{ row.unit }}</td>
                <td class="amount-col">{{ formatQty(row.quantityIn) }}</td>
                <td class="amount-col">{{ formatQty(row.quantityOut) }}</td>
                <td class="amount-col">{{ formatQty(row.quantityReserved) }}</td>
                <td class="amount-col" [class.negative]="isNegative(row.quantityAvailable)">{{ formatQty(row.quantityAvailable) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; font-size:20px; }
    .spacer { flex:1; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:8px; }
    .search-field { min-width: 280px; }

    .loading { display:flex; justify-content:center; padding: 48px 0; }
    .empty { color: rgba(0,0,0,0.6); }
    .error-state {
      display:flex; align-items:center; gap:10px;
      padding: 16px; border-radius: 8px; max-width: 600px;
      background: rgba(198,40,40,0.08); color: #c62828;
    }
    .error-state span { flex:1; }

    .table-wrap { overflow-x: auto; }
    .stock-table { width: 100%; border-collapse: collapse; min-width: 640px; }
    .stock-table th { text-align: left; font-size: 12px; color: rgba(0,0,0,0.6); font-weight: 500; padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.12); }
    .stock-table td { padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .amount-col { text-align: right; font-variant-numeric: tabular-nums; }
    .amount-col.negative { color: #c62828; font-weight: 600; }
  `]
})
export class StockStatusReportPageComponent implements OnInit {
  rows: StockStatusDto[] = [];
  search = '';
  loading = false;
  error: string | null = null;
  exporting = false;

  constructor(
    private reportsService: ReportsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = null;
    this.reportsService.getStockStatus().subscribe({
      next: res => {
        this.rows = res;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.error = 'Stok durumu yüklenirken bir hata oluştu.';
      }
    });
  }

  filteredRows(): StockStatusDto[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.rows;
    return this.rows.filter(r =>
      r.itemCode.toLowerCase().includes(term) || r.itemName.toLowerCase().includes(term)
    );
  }

  export() {
    this.exporting = true;
    this.reportsService.exportStockStatus().subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'StokDurumu.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => {
        this.snack.open('Excel dışa aktarma başarısız oldu.', 'Kapat', { duration: 3000 });
        this.exporting = false;
      }
    });
  }

  formatQty(value: string): string {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  isNegative(value: string): boolean {
    return Number(value) < 0;
  }
}
