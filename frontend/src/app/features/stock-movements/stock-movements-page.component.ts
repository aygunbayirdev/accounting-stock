import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { StockMovementsService } from '../../core/services/stock-movements.service';
import {
  StockMovementListItemDto,
  ListStockMovementsQuery,
  StockMovementType,
  getMovementTypeDisplayName,
  isInboundMovement
} from '../../core/models/stock-movement.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { WarehouseListItemDto } from '../../core/models/warehouse.models';
import { StockMovementFormDialogComponent } from './stock-movement-form-dialog.component';
import { StockTransferDialogComponent } from './stock-transfer-dialog.component';

@Component({
  standalone: true,
  selector: 'app-stock-movements-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
      <button mat-stroked-button (click)="openTransfer()">
        <mat-icon>swap_horiz</mat-icon>
        Depolar Arası Transfer
      </button>
      <button mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Hareket
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="warehouse-field">
        <mat-label>Depo</mat-label>
        <mat-select [(ngModel)]="warehouseId">
          <mat-option [value]="null">Tüm depolar</mat-option>
          @for (w of warehouses; track w.id) {
            <mat-option [value]="w.id">{{ w.code }} - {{ w.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Hareket Tipi</mat-label>
        <mat-select [(ngModel)]="type">
          <mat-option [value]="null">Tümü</mat-option>
          @for (t of movementTypes; track t) {
            <mat-option [value]="t">{{ typeLabel(t) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Başlangıç</mat-label>
        <input matInput type="date" [(ngModel)]="fromDate">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Bitiş</mat-label>
        <input matInput type="date" [(ngModel)]="toDate">
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
      #grid
      title="Stok Hareketleri"
      [columns]="colDefs"
      [sortWhitelist]="sortWhitelist"
      [fetcher]="fetcher">
    </app-list-grid>
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; gap:8px; padding:8px 0; }
    .title { font-weight:600; }
    .spacer { flex:1; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:8px; }
    .warehouse-field { min-width: 260px; }
    ::ng-deep .qty-in { color: #1b8a3a; font-weight: 600; }
    ::ng-deep .qty-out { color: #c62828; font-weight: 600; }
  `]
})
export class StockMovementsPageComponent {
  sortWhitelist = ['date', 'created', 'item'];

  movementTypes = [
    StockMovementType.PurchaseIn,
    StockMovementType.SalesOut,
    StockMovementType.AdjustmentIn,
    StockMovementType.AdjustmentOut,
    StockMovementType.SalesReturn,
    StockMovementType.PurchaseReturn,
    StockMovementType.TransferOut,
    StockMovementType.TransferIn
  ];
  typeLabel = getMovementTypeDisplayName;

  warehouseId: number | null = null;
  type: StockMovementType | null = null;
  fromDate: string | null = null;
  toDate: string | null = null;
  warehouses: WarehouseListItemDto[] = [];

  colDefs: ColDef<StockMovementListItemDto>[] = [
    { field: 'transactionDateUtc', headerName: 'Tarih', colId: 'date', sortable: true, minWidth: 160, valueFormatter: p => p.value ? new Date(p.value).toLocaleString('tr-TR') : '' },
    { field: 'warehouseCode', headerName: 'Depo', sortable: false, minWidth: 110 },
    { field: 'itemCode', headerName: 'Ürün Kodu', sortable: false, minWidth: 130 },
    { field: 'itemName', headerName: 'Ürün Adı', colId: 'item', sortable: true, minWidth: 200 },
    { headerName: 'Tip', colId: 'type', sortable: false, minWidth: 140, valueGetter: p => p.data ? this.typeLabel(p.data.type) : '' },
    {
      headerName: 'Miktar', colId: 'qty', sortable: false, type: 'rightAligned', minWidth: 120,
      valueGetter: p => p.data ? `${isInboundMovement(p.data.type) ? '+' : '-'}${p.data.quantity}` : '',
      cellClass: p => p.data && isInboundMovement(p.data.type) ? 'qty-in' : 'qty-out'
    },
    { field: 'note', headerName: 'Not', sortable: false, minWidth: 200 }
  ];

  @ViewChild('grid') grid!: ListGridComponent<StockMovementListItemDto>;

  constructor(
    private service: StockMovementsService,
    private warehousesService: WarehousesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.warehousesService.list().subscribe(res => (this.warehouses = res.items));
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListStockMovementsQuery = {
      ...q,
      warehouseId: this.warehouseId,
      type: this.type,
      fromUtc: this.fromDate ? new Date(this.fromDate + 'T00:00:00').toISOString() : null,
      toUtc: this.toDate ? new Date(this.toDate + 'T23:59:59').toISOString() : null
    };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() {
    this.warehouseId = null;
    this.type = null;
    this.fromDate = null;
    this.toDate = null;
    this.grid.reload();
  }

  openCreate() {
    const ref = this.dialog.open(StockMovementFormDialogComponent, {
      data: { warehouseId: this.warehouseId }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Stok hareketi kaydedildi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openTransfer() {
    const ref = this.dialog.open(StockTransferDialogComponent);
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.transfer(result).subscribe({
        next: (res) => {
          this.snack.open(res.message || 'Transfer tamamlandı.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }
}
