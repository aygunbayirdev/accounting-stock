import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { PaymentsService } from '../../core/services/payments.service';
import { PaymentListItemDto } from '../../core/models/payment.models';

@Component({
  standalone: true,
  selector: 'app-payments-page',
  imports: [CommonModule, ListGridComponent],
  template: `
    <app-list-grid
      title="Ödemeler"
      [columns]="colDefs"
      [sortWhitelist]="sortWhitelist"
      [fetcher]="fetcher">
    </app-list-grid>
  `
})
export class PaymentsPageComponent {
  sortWhitelist = ['dateUtc', 'amount']; // BE whitelist

  colDefs: ColDef<PaymentListItemDto>[] = [
    { field: 'dateUtc', headerName: 'Tarih (UTC)', sortable: true, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '' },
    { field: 'accountId', headerName: 'Hesap #', sortable: false, minWidth: 140 },
    { field: 'accountCode', headerName: 'Hesap Kodu', sortable: false, minWidth: 120 },
    { field: 'accountName', headerName: 'Hesap Adı', sortable: false, minWidth: 160 },
    { field: 'contactId', headerName: 'Cari #', sortable: false, minWidth: 140 },
    { field: 'contactCode', headerName: 'Cari Kodu', sortable: false, minWidth: 120 },
    { field: 'contactName', headerName: 'Cari Adı', sortable: false, minWidth: 160 },
    { field: 'amount', headerName: 'Tutar', sortable: true, type: 'rightAligned', minWidth: 120 },
    { field: 'currency', headerName: 'PB', sortable: false, maxWidth: 100 },
  ];

  constructor(private service: PaymentsService) { }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string; }) =>
    this.service.list(q);
}
