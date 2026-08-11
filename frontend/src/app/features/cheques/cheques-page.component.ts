import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { ChequesService } from '../../core/services/cheques.service';
import {
  ChequeDetailDto, ChequeStatus, ChequeStatusStr, ChequeTypeStr, ChequeDirectionStr,
  getChequeTypeDisplayName, getChequeDirectionDisplayName, getChequeStatusDisplayName
} from '../../core/models/cheque.models';
import { MatIconModule } from '@angular/material/icon';
import { ChequeActionsCell, ChequeActionsContext } from './cheque-actions.cell';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ChequeFormDialogComponent } from './cheque-form-dialog.component';
import { ChequeCashDialogComponent } from './cheque-cash-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

@Component({
  standalone: true,
  selector: 'app-cheques-page',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ListGridComponent,
    HasPermissionDirective
  ],
  template: `
    <span class="title">Filtreler</span>

    <div class="toolbar">
      <div class="filters">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Tür</mat-label>
          <mat-select [(ngModel)]="type">
            <mat-option [value]="null">Tümü</mat-option>
            <mat-option value="Cheque">Çek</mat-option>
            <mat-option value="PromissoryNote">Senet</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Yön</mat-label>
          <mat-select [(ngModel)]="direction">
            <mat-option [value]="null">Tümü</mat-option>
            <mat-option value="Inbound">Alınan</mat-option>
            <mat-option value="Outbound">Verilen</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Durum</mat-label>
          <mat-select [(ngModel)]="status">
            <mat-option [value]="null">Tümü</mat-option>
            <mat-option value="Pending">Portföyde</mat-option>
            <mat-option value="Paid">Tahsil/Ödendi</mat-option>
            <mat-option value="Endorsed">Ciro Edildi</mat-option>
            <mat-option value="Bounced">Karşılıksız</mat-option>
            <mat-option value="Cancelled">İptal</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button (click)="apply()">Uygula</button>
        <button mat-button (click)="reset()">Sıfırla</button>
      </div>
      <span class="spacer"></span>
      <button *appHasPermission="'Cheque.Create'" mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Çek/Senet
      </button>
    </div>

    <app-list-grid
      #grid
      title="Çek/Senetler"
      [columns]="colDefs"
      [sortWhitelist]="sortWhitelist"
      [fetcher]="fetcher"
      [context]="gridContext">
    </app-list-grid>
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; }
    .spacer { flex:1; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
    .filter-field { min-width: 180px; }
  `]
})
export class ChequesPageComponent {
  // Backend ListChequesQuery Sort desteklemiyor.
  sortWhitelist: string[] = [];
  type: ChequeTypeStr | null = null;
  direction: ChequeDirectionStr | null = null;
  status: ChequeStatusStr | null = null;

  colDefs: ColDef<ChequeDetailDto>[] = [
    { field: 'id', headerName: 'ID', sortable: false, maxWidth: 80, pinned: 'left' },
    { field: 'chequeNumber', headerName: 'Çek/Senet No', sortable: false, minWidth: 140, pinned: 'left' },
    { field: 'type', headerName: 'Tür', sortable: false, maxWidth: 90, valueFormatter: p => getChequeTypeDisplayName(p.value) },
    { field: 'direction', headerName: 'Yön', sortable: false, maxWidth: 100, valueFormatter: p => getChequeDirectionDisplayName(p.value) },
    { field: 'status', headerName: 'Durum', sortable: false, minWidth: 130, valueFormatter: p => getChequeStatusDisplayName(p.value) },
    { field: 'amount', headerName: 'Tutar', sortable: false, type: 'rightAligned', minWidth: 120 },
    { field: 'currency', headerName: 'Para Birimi', sortable: false, maxWidth: 100 },
    { field: 'contactName', headerName: 'Cari', sortable: false, minWidth: 180, valueGetter: p => p.data?.contactName ?? '—' },
    {
      field: 'issueDate', headerName: 'Düzenleme Tarihi', sortable: false, minWidth: 130,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('tr-TR') : ''
    },
    {
      field: 'dueDate', headerName: 'Vade Tarihi', sortable: false, minWidth: 130,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('tr-TR') : ''
    },
    { field: 'drawerName', headerName: 'Keşideci', sortable: false, minWidth: 150, valueGetter: p => p.data?.drawerName ?? '—' },
    { field: 'bankName', headerName: 'Banka', sortable: false, minWidth: 140, valueGetter: p => p.data?.bankName ?? '—' },
    {
      headerName: '',
      colId: 'actions',
      width: 190,
      pinned: 'right',
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: ChequeActionsCell
    }
  ];

  gridContext: ChequeActionsContext<ChequeDetailDto> = {
    onCash: (row) => this.cash(row),
    onEndorse: (row) => this.endorse(row),
    onBounce: (row) => this.bounce(row),
    onCancel: (row) => this.cancel(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<ChequeDetailDto>;

  constructor(
    private service: ChequesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  fetcher = (q: { pageNumber?: number; pageSize?: number }) => {
    return this.service.list({
      page: q.pageNumber,
      pageSize: q.pageSize,
      type: this.type ?? undefined,
      direction: this.direction ?? undefined,
      status: this.status ?? undefined
    });
  };

  apply() { this.grid.reload(); }

  reset() {
    this.type = null;
    this.direction = null;
    this.status = null;
    this.grid.reload();
  }

  openCreate() {
    const ref = this.dialog.open(ChequeFormDialogComponent, { data: {} });
    ref.afterClosed().subscribe(body => {
      if (!body) return;
      this.service.create(body).subscribe({
        next: () => {
          this.snack.open('Çek/Senet oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: err => {
          const msg = err?.error?.message ?? 'Kaydetme hatası.';
          this.snack.open(msg, 'Kapat', { duration: 3000 });
        }
      });
    });
  }

  cash(row: ChequeDetailDto) {
    const ref = this.dialog.open(ChequeCashDialogComponent, { data: { cheque: row } });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.updateStatus(row.id, {
        newStatus: ChequeStatus.Paid,
        rowVersionBase64: row.rowVersionBase64,
        transactionDate: result.transactionDate,
        cashBankAccountId: result.cashBankAccountId
      }).subscribe({
        next: () => {
          this.snack.open(row.direction === 'Inbound' ? 'Tahsilat işlendi.' : 'Ödeme işlendi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: err => this.snack.open(this.concurrencyOrDefault(err, 'İşlem hatası.'), 'Kapat', { duration: 3000 })
      });
    });
  }

  endorse(row: ChequeDetailDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Ciro Et',
        message: `"${row.chequeNumber}" evrağını ciro etmek istediğinize emin misiniz?`,
        danger: false
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.updateStatus(row.id, {
        newStatus: ChequeStatus.Endorsed,
        rowVersionBase64: row.rowVersionBase64
      }).subscribe({
        next: () => {
          this.snack.open('Evrak ciro edildi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: err => this.snack.open(this.concurrencyOrDefault(err, 'Ciro hatası.'), 'Kapat', { duration: 3000 })
      });
    });
  }

  bounce(row: ChequeDetailDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Karşılıksız İşaretle',
        message: `"${row.chequeNumber}" evrağını karşılıksız olarak işaretlemek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.updateStatus(row.id, {
        newStatus: ChequeStatus.Bounced,
        rowVersionBase64: row.rowVersionBase64
      }).subscribe({
        next: () => {
          this.snack.open('Evrak karşılıksız olarak işaretlendi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: err => this.snack.open(this.concurrencyOrDefault(err, 'İşlem hatası.'), 'Kapat', { duration: 3000 })
      });
    });
  }

  cancel(row: ChequeDetailDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Çek/Senedi İptal Et',
        message: `"${row.chequeNumber}" evrağını iptal etmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.updateStatus(row.id, {
        newStatus: ChequeStatus.Cancelled,
        rowVersionBase64: row.rowVersionBase64
      }).subscribe({
        next: () => {
          this.snack.open('Evrak iptal edildi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: err => this.snack.open(this.concurrencyOrDefault(err, 'İptal hatası.'), 'Kapat', { duration: 3000 })
      });
    });
  }

  confirmDelete(row: ChequeDetailDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Çek/Senedi Sil',
        message: `"${row.chequeNumber}" evrağını silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.delete(row.id, row.rowVersionBase64).subscribe({
        next: () => {
          this.snack.open('Çek/Senet silindi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: err => this.snack.open(this.concurrencyOrDefault(err, 'Silme hatası.'), 'Kapat', { duration: 3000 })
      });
    });
  }

  private concurrencyOrDefault(err: any, fallback: string): string {
    if (err?.error?.code === 'concurrency_conflict' || err?.status === 409) {
      return 'Kayıt başka biri tarafından güncellendi. Yeniden yükleyin.';
    }
    return err?.error?.message ?? fallback;
  }
}
