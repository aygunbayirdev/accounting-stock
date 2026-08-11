import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportsService } from '../../core/services/reports.service';
import { BranchesService } from '../../core/services/branches.service';
import { AuthService } from '../../core/services/auth.service';
import { IncomeExpenseDto } from '../../core/models/report.models';
import { BranchListItemDto } from '../../core/models/branch.models';

@Component({
  standalone: true,
  selector: 'app-income-expense-report-page',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="toolbar">
      <span class="title">Gelir/Gider Raporu</span>
    </div>

    <p class="disclaimer">
      <mat-icon>info</mat-icon>
      Nakit bazlı rapordur, gerçek muhasebe kârı değildir. Stok alımları COGS (Satılan Malın Maliyeti) olarak değil, dönem içi stok harcaması olarak gösterilir.
    </p>

    <div class="filters">
      @if (showBranchSelector) {
        <mat-form-field appearance="outline" class="branch-field">
          <mat-label>Şube</mat-label>
          <mat-select [(ngModel)]="branchId">
            <mat-option [value]="null">Tüm Şubeler</mat-option>
            @for (b of branches; track b.id) {
              <mat-option [value]="b.id">{{ b.code }} - {{ b.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <mat-form-field appearance="outline">
        <mat-label>Başlangıç</mat-label>
        <input matInput type="date" [(ngModel)]="fromDate">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Bitiş</mat-label>
        <input matInput type="date" [(ngModel)]="toDate">
      </mat-form-field>

      <button mat-stroked-button color="primary" [disabled]="loading" (click)="load()">
        Görüntüle
      </button>
    </div>

    @if (loading) {
      <div class="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>
    } @else if (error) {
      <div class="error-state">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error }}</span>
        <button mat-button (click)="load()">Tekrar Dene</button>
      </div>
    } @else if (data) {
      <div class="summary-grid">
        <mat-card class="summary-card">
          <mat-icon class="summary-icon income">trending_up</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Net Satışlar</span>
            <span class="summary-value">{{ formatAmount(data.income) }}</span>
          </div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon purchases">inventory_2</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Stok Alımları</span>
            <span class="summary-value">{{ formatAmount(data.inventoryPurchases) }}</span>
          </div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon expenses">receipt_long</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Faaliyet Giderleri</span>
            <span class="summary-value">{{ formatAmount(data.operatingExpenses) }}</span>
          </div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon vat">receipt</mat-icon>
          <div class="summary-body">
            <span class="summary-label">KDV Dengesi</span>
            <span class="summary-value" [class.negative]="isNegative(data.vatBalance)">{{ formatAmount(data.vatBalance) }}</span>
          </div>
        </mat-card>
      </div>

      <div class="totals-grid">
        <mat-card class="total-card" [class.negative]="isNegative(data.grossProfit)">
          <mat-card-content>
            <span class="total-label">Brüt Kâr</span>
            <span class="total-value">{{ formatAmount(data.grossProfit) }}</span>
          </mat-card-content>
        </mat-card>
        <mat-card class="total-card" [class.negative]="isNegative(data.netProfit)">
          <mat-card-content>
            <span class="total-label">Net Kâr/Zarar</span>
            <span class="total-value">{{ formatAmount(data.netProfit) }}</span>
          </mat-card-content>
        </mat-card>
      </div>
    } @else {
      <p class="empty">Tarih aralığı seçip "Görüntüle"ye tıklayın.</p>
    }
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; font-size:20px; }

    .disclaimer {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: rgba(0,0,0,0.6);
      background: rgba(255,152,0,0.08); border-radius: 6px;
      padding: 8px 12px; margin: 8px 0 16px; max-width: 780px;
    }
    .disclaimer mat-icon { font-size: 18px; width: 18px; height: 18px; color: #ef6c00; flex-shrink: 0; }

    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:8px; }
    .branch-field { min-width: 220px; }

    .loading { display:flex; justify-content:center; padding: 48px 0; }
    .empty { color: rgba(0,0,0,0.6); }
    .error-state {
      display:flex; align-items:center; gap:10px;
      padding: 16px; border-radius: 8px; max-width: 600px;
      background: rgba(198,40,40,0.08); color: #c62828;
    }
    .error-state span { flex:1; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }
    .summary-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
    }
    .summary-icon {
      width: 44px; height: 44px; font-size: 44px;
      opacity: 0.85;
    }
    .summary-icon.income { color: #2e7d32; }
    .summary-icon.purchases { color: #1565c0; }
    .summary-icon.expenses { color: #c62828; }
    .summary-icon.vat { color: #6a1b9a; }
    .summary-body { display: flex; flex-direction: column; gap: 4px; }
    .summary-label { font-size: 13px; color: rgba(0,0,0,0.6); }
    .summary-value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .summary-value.negative { color: #c62828; }

    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      max-width: 600px;
    }
    .total-card { background: rgba(46,125,50,0.08); }
    .total-card.negative { background: rgba(198,40,40,0.08); }
    .total-card mat-card-content { display: flex; flex-direction: column; gap: 6px; padding: 8px 4px; }
    .total-label { font-size: 14px; color: rgba(0,0,0,0.6); }
    .total-value { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .total-card.negative .total-value { color: #c62828; }
    .total-card:not(.negative) .total-value { color: #2e7d32; }
  `]
})
export class IncomeExpenseReportPageComponent implements OnInit {
  branches: BranchListItemDto[] = [];
  branchId: number | null = null;
  fromDate: string | null = null;
  toDate: string | null = null;
  showBranchSelector = false;

  data: IncomeExpenseDto | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private reportsService: ReportsService,
    private branchesService: BranchesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.showBranchSelector = !!user && (user.role === 'Admin' || user.isHeadquarters);

    if (this.showBranchSelector) {
      this.branchesService.list().subscribe(branches => {
        this.branches = branches;
      });
    } else {
      this.branchId = user?.branchId ?? null;
    }
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.reportsService.getIncomeExpense(this.branchId, this.toIsoStart(this.fromDate), this.toIsoEnd(this.toDate)).subscribe({
      next: res => {
        this.data = res;
        this.loading = false;
      },
      error: () => {
        this.data = null;
        this.loading = false;
        this.error = 'Gelir/gider raporu yüklenirken bir hata oluştu.';
      }
    });
  }

  formatAmount(value: string): string {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  isNegative(value: string): boolean {
    return Number(value) < 0;
  }

  private toIsoStart(dateStr: string | null): string | null {
    return dateStr ? new Date(dateStr + 'T00:00:00').toISOString() : null;
  }

  private toIsoEnd(dateStr: string | null): string | null {
    return dateStr ? new Date(dateStr + 'T23:59:59').toISOString() : null;
  }
}
