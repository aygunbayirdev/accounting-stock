import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map } from 'rxjs';
import { EntityPickerComponent, PickerOption } from '../../shared/entity-picker/entity-picker.component';
import { ReportsService } from '../../core/services/reports.service';
import { ContactsService } from '../../core/services/contacts.service';
import { ContactStatementDto } from '../../core/models/report.models';

@Component({
  standalone: true,
  selector: 'app-contact-statement-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, EntityPickerComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Cari Ekstre</span>
    </div>

    <div class="filters">
      <app-entity-picker
        label="Cari"
        [fetcher]="contactFetcher"
        [value]="contactId"
        [width]="'320px'"
        (valueChange)="onContactSelected($event)">
      </app-entity-picker>

      <mat-form-field appearance="outline">
        <mat-label>Başlangıç</mat-label>
        <input matInput type="date" [(ngModel)]="fromDate">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Bitiş</mat-label>
        <input matInput type="date" [(ngModel)]="toDate">
      </mat-form-field>

      <button mat-stroked-button color="primary" [disabled]="!contactId || loading" (click)="load()">
        Görüntüle
      </button>
      <button mat-stroked-button [disabled]="!contactId || exporting" (click)="export()">
        <mat-icon>file_download</mat-icon>
        Excel'e Aktar
      </button>
    </div>

    @if (loading) {
      <div class="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>
    } @else if (statement) {
      <div class="statement-header">
        <span class="contact-name">{{ statement.contactName }}</span>
        <span class="balance-chip" [class.negative]="isNegative(currentBalance)">
          Güncel Bakiye: {{ formatAmount(currentBalance) }}
        </span>
      </div>

      @if (statement.items.length === 0) {
        <p class="empty">Seçilen tarih aralığında hareket bulunmuyor.</p>
      } @else {
        <div class="table-wrap">
          <table class="statement-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Belge No</th>
                <th>Açıklama</th>
                <th class="amount-col">Borç</th>
                <th class="amount-col">Alacak</th>
                <th class="amount-col">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              @for (line of statement.items; track $index) {
                <tr [class.opening]="line.type === 'DEVİR'">
                  <td>{{ line.dateUtc | date:'dd.MM.yyyy' }}</td>
                  <td>{{ line.type }}</td>
                  <td>{{ line.documentNo }}</td>
                  <td>{{ line.description }}</td>
                  <td class="amount-col">{{ line.debt !== '0.00' ? formatAmount(line.debt) : '' }}</td>
                  <td class="amount-col">{{ line.credit !== '0.00' ? formatAmount(line.credit) : '' }}</td>
                  <td class="amount-col" [class.negative]="isNegative(line.balance)">{{ formatAmount(line.balance) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <p class="empty">Ekstre görüntülemek için bir cari seçip "Görüntüle"ye tıklayın.</p>
    }
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; font-size:20px; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:8px; }

    .loading { display:flex; justify-content:center; padding: 48px 0; }
    .empty { color: rgba(0,0,0,0.6); }

    .statement-header { display:flex; align-items:center; gap:16px; padding: 8px 0 16px; }
    .contact-name { font-size: 18px; font-weight: 600; }
    .balance-chip {
      font-weight: 600; font-variant-numeric: tabular-nums;
      padding: 4px 12px; border-radius: 16px;
      background: rgba(46,125,50,0.12); color: #2e7d32;
    }
    .balance-chip.negative { background: rgba(198,40,40,0.12); color: #c62828; }

    .table-wrap { overflow-x: auto; }
    .statement-table { width: 100%; border-collapse: collapse; min-width: 720px; }
    .statement-table th { text-align: left; font-size: 12px; color: rgba(0,0,0,0.6); font-weight: 500; padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.12); }
    .statement-table td { padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .statement-table tr.opening { background: rgba(0,0,0,0.03); font-style: italic; }
    .amount-col { text-align: right; font-variant-numeric: tabular-nums; }
    .amount-col.negative { color: #c62828; }
  `]
})
export class ContactStatementPageComponent {
  contactId: number | null = null;
  fromDate: string | null = null;
  toDate: string | null = null;

  statement: ContactStatementDto | null = null;
  loading = false;
  exporting = false;

  get currentBalance(): string {
    if (!this.statement || this.statement.items.length === 0) return '0.00';
    return this.statement.items[this.statement.items.length - 1].balance;
  }

  constructor(
    private reportsService: ReportsService,
    private contactsService: ContactsService,
    private snack: MatSnackBar
  ) {}

  contactFetcher = (search: string): Observable<PickerOption[]> =>
    this.contactsService.list({ search: search || null, pageSize: 20 }).pipe(
      map(res => res.items.map(c => ({ id: c.id, label: c.code, sublabel: c.name })))
    );

  onContactSelected(id: number | null) {
    this.contactId = id;
    this.statement = null;
  }

  load() {
    if (!this.contactId) return;
    this.loading = true;
    this.reportsService.getContactStatement(this.contactId, this.toIsoStart(this.fromDate), this.toIsoEnd(this.toDate)).subscribe({
      next: res => {
        this.statement = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  export() {
    if (!this.contactId) return;
    this.exporting = true;
    this.reportsService.exportContactStatement(this.contactId, this.toIsoStart(this.fromDate), this.toIsoEnd(this.toDate)).subscribe({
      next: blob => {
        const contactName = this.statement?.contactName ?? 'Cari';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ekstre_${contactName.replace(/\s+/g, '_')}.xlsx`;
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
