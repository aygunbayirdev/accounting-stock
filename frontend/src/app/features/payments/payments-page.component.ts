import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { PaymentsService } from '../../core/services/payments.service';
import { PaymentListItemDto, getPaymentDirectionDisplayName } from '../../core/models/payment.models';
import { PaymentFormDialogComponent, PaymentFormDialogData } from './payment-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-payments-page',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent],
  template: `
    <div class="toolbar">
      <span class="title">Ödemeler</span>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Ödeme
      </button>
    </div>

    <app-list-grid
      #grid
      title="Ödemeler"
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
  `]
})
export class PaymentsPageComponent {
  sortWhitelist = ['dateUtc', 'amount']; // BE whitelist

  colDefs: ColDef<PaymentListItemDto>[] = [
    { field: 'dateUtc', headerName: 'Tarih (UTC)', sortable: true, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '' },
    { headerName: 'Tür', sortable: false, minWidth: 110, valueGetter: p => p.data ? getPaymentDirectionDisplayName(p.data.direction) : '' },
    { field: 'accountCode', headerName: 'Hesap Kodu', sortable: false, minWidth: 120 },
    { field: 'accountName', headerName: 'Hesap Adı', sortable: false, minWidth: 160 },
    { field: 'contactCode', headerName: 'Cari Kodu', sortable: false, minWidth: 120 },
    { field: 'contactName', headerName: 'Cari Adı', sortable: false, minWidth: 160 },
    { field: 'amount', headerName: 'Tutar', sortable: true, type: 'rightAligned', minWidth: 120 },
    { field: 'currency', headerName: 'PB', sortable: false, maxWidth: 100 },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<PaymentListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<PaymentListItemDto>;

  constructor(
    private service: PaymentsService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) { }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string; }) =>
    this.service.list(q);

  openCreate() {
    const ref = this.dialog.open<PaymentFormDialogComponent, PaymentFormDialogData>(PaymentFormDialogComponent, {
      data: { payment: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Ödeme oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: PaymentListItemDto) {
    this.service.getById(row.id).subscribe(full => {
      const ref = this.dialog.open<PaymentFormDialogComponent, PaymentFormDialogData>(PaymentFormDialogComponent, {
        data: {
          payment: full,
          accountLabel: `${row.accountCode} - ${row.accountName}`,
          contactLabel: row.contactCode ? `${row.contactCode} - ${row.contactName}` : null
        }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(full.id, {
          id: full.id,
          rowVersion: full.rowVersion,
          ...result
        }).subscribe({
          next: () => {
            this.snack.open('Ödeme güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  confirmDelete(row: PaymentListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Ödemeyi Sil',
        message: `${row.accountCode} hesabındaki ${row.amount} ${row.currency} tutarındaki ödemeyi silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.getById(row.id).subscribe(full => {
        this.service.delete(row.id, full.rowVersion).subscribe({
          next: () => {
            this.snack.open('Ödeme silindi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }
}
