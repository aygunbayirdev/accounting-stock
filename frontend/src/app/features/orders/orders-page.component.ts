import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { OrdersService } from '../../core/services/orders.service';
import { OrderListItemDto, OrderStatus, getOrderStatusDisplayName, getOrderTypeDisplayName } from '../../core/models/order.models';
import { MatIconModule } from '@angular/material/icon';
import { OrderActionsCell, OrderActionsContext } from './order-actions.cell';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BranchListItemDto } from '../../core/models/branch.models';
import { BranchesService } from '../../core/services/branches.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: true,
  selector: 'app-orders-page',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ListGridComponent
  ],
  template: `
    <span class="title">Filtreler</span>

    <div class="toolbar">
      <div class="filters">
        <mat-form-field appearance="outline" class="branch-field">
          <mat-label>Şube</mat-label>
          <mat-select [(ngModel)]="branchId">
            <mat-option [value]="null">Tüm şubeler</mat-option>
            <mat-option *ngFor="let b of branches" [value]="b.id">
              {{ b.code }} - {{ b.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="status-field">
          <mat-label>Durum</mat-label>
          <mat-select [(ngModel)]="status">
            <mat-option [value]="null">Tümü</mat-option>
            <mat-option [value]="OrderStatus.Draft">Taslak</mat-option>
            <mat-option [value]="OrderStatus.Approved">Onaylandı</mat-option>
            <mat-option [value]="OrderStatus.Invoiced">Faturalandı</mat-option>
            <mat-option [value]="OrderStatus.Cancelled">İptal</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button (click)="apply()">Uygula</button>
        <button mat-button (click)="reset()">Sıfırla</button>
      </div>
      <span class="spacer"></span>
      <a mat-stroked-button color="primary" routerLink="/orders/new">
        <mat-icon>add</mat-icon>
        Yeni Sipariş
      </a>
    </div>

    <app-list-grid
      #grid
      title="Siparişler"
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
    :host ::ng-deep .icon-btn{
      display:inline-flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:6px;text-decoration:none;
      margin-left:4px;
    }
    :host ::ng-deep .icon-btn .material-icons{font-size:20px;line-height:20px}
    .branch-field, .status-field { min-width: 200px; }
  `]
})
export class OrdersPageComponent {
  // Backend ListOrdersQuery Sort desteklemiyor — sıralama backend'e gönderilmiyor.
  sortWhitelist: string[] = [];
  OrderStatus = OrderStatus;
  branchId: number | null = null;
  status: OrderStatus | null = null;
  branches: BranchListItemDto[] = [];

  colDefs: ColDef<OrderListItemDto>[] = [
    { field: 'id', headerName: 'ID', sortable: false, maxWidth: 80, pinned: 'left' },
    { field: 'orderNumber', headerName: 'Sipariş No', sortable: false, minWidth: 140, pinned: 'left' },
    {
      field: 'type',
      headerName: 'Tür',
      sortable: false,
      maxWidth: 120,
      valueFormatter: p => getOrderTypeDisplayName(p.value)
    },
    {
      field: 'status',
      headerName: 'Durum',
      sortable: false,
      minWidth: 110,
      valueFormatter: p => getOrderStatusDisplayName(p.value)
    },
    {
      field: 'dateUtc',
      headerName: 'Tarih',
      sortable: false,
      minWidth: 120,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('tr-TR') : ''
    },
    { field: 'contactId', headerName: 'Cari ID', sortable: false, maxWidth: 90 },
    { field: 'contactName', headerName: 'Cari Adı', sortable: false, minWidth: 200 },
    { field: 'branchId', headerName: 'Şube ID', sortable: false, maxWidth: 90 },
    { field: 'currency', headerName: 'Para Birimi', sortable: false, maxWidth: 100 },
    { field: 'totalNet', headerName: 'Net Toplam', sortable: false, type: 'rightAligned', minWidth: 130 },
    { field: 'totalVat', headerName: 'KDV Toplamı', sortable: false, type: 'rightAligned', minWidth: 130 },
    { field: 'totalGross', headerName: 'Genel Toplam', sortable: false, type: 'rightAligned', minWidth: 140 },
    {
      field: 'createdAtUtc',
      headerName: 'Oluşturulma',
      sortable: false,
      minWidth: 150,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleString('tr-TR') : ''
    },
    {
      headerName: '',
      colId: 'actions',
      width: 190,
      pinned: 'right',
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: OrderActionsCell
    }
  ];

  gridContext: OrderActionsContext<OrderListItemDto> = {
    onApprove: (row) => this.approve(row),
    onCancel: (row) => this.cancel(row),
    onConvertToInvoice: (row) => this.convertToInvoice(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<OrderListItemDto>;

  constructor(
    private service: OrdersService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.branchesService.list().subscribe({
      next: (res) => (this.branches = res),
      error: () => { this.branches = []; }
    });
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number }) => {
    return this.service.list({
      page: q.pageNumber,
      pageSize: q.pageSize,
      branchId: this.branchId ?? undefined,
      status: this.status ?? undefined
    });
  };

  apply() { this.grid.reload(); }

  reset() {
    this.branchId = null;
    this.status = null;
    this.grid.reload();
  }

  // Liste satırında rowVersion yok (OrderListItemDto'da yok) — Approve/Cancel/Delete
  // öncesi güncel rowVersion'ı almak için önce detay çekilir.
  private withRowVersion(id: number, action: (rowVersion: string) => void) {
    this.service.getById(id).subscribe({
      next: dto => action(dto.rowVersion),
      error: () => this.snack.open('Sipariş bilgisi alınamadı.', 'Kapat', { duration: 3000 })
    });
  }

  approve(row: OrderListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Siparişi Onayla',
        message: `"${row.orderNumber}" siparişini onaylamak istediğinize emin misiniz?`,
        danger: false
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.withRowVersion(row.id, rowVersion => {
        this.service.approve(row.id, rowVersion).subscribe({
          next: () => {
            this.snack.open('Sipariş onaylandı.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          },
          error: err => {
            const msg = err?.error?.code === 'concurrency_conflict'
              ? 'Kayıt başka biri tarafından güncellendi. Yeniden deneyin.'
              : (err?.error?.message ?? 'Onaylama hatası.');
            this.snack.open(msg, 'Kapat', { duration: 3000 });
          }
        });
      });
    });
  }

  cancel(row: OrderListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Siparişi İptal Et',
        message: `"${row.orderNumber}" siparişini iptal etmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.withRowVersion(row.id, rowVersion => {
        this.service.cancel(row.id, rowVersion).subscribe({
          next: () => {
            this.snack.open('Sipariş iptal edildi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          },
          error: err => {
            const msg = err?.error?.code === 'concurrency_conflict'
              ? 'Kayıt başka biri tarafından güncellendi. Yeniden deneyin.'
              : 'İptal hatası.';
            this.snack.open(msg, 'Kapat', { duration: 3000 });
          }
        });
      });
    });
  }

  convertToInvoice(row: OrderListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Faturaya Dönüştür',
        message: `"${row.orderNumber}" siparişinden fatura oluşturulacak. Devam edilsin mi?`,
        danger: false
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.createInvoice(row.id).subscribe({
        next: () => {
          this.snack.open('Fatura oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        },
        error: () => this.snack.open('Fatura oluşturma hatası.', 'Kapat', { duration: 3000 })
      });
    });
  }

  confirmDelete(row: OrderListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Siparişi Sil',
        message: `"${row.orderNumber}" siparişini silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.withRowVersion(row.id, rowVersion => {
        this.service.delete(row.id, rowVersion).subscribe({
          next: () => {
            this.snack.open('Sipariş silindi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          },
          error: () => this.snack.open('Silme hatası.', 'Kapat', { duration: 3000 })
        });
      });
    });
  }
}
