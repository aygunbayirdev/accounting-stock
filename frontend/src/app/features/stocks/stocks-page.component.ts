import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { StocksService } from '../../core/services/stocks.service';
import { StockListItemDto, ListStocksQuery } from '../../core/models/stock.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { WarehouseListItemDto } from '../../core/models/warehouse.models';

@Component({
  standalone: true,
  selector: 'app-stocks-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, ListGridComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
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
        <mat-label>Ara (Ürün Kodu/Ad)</mat-label>
        <input matInput [(ngModel)]="search">
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
      #grid
      title="Stok Durumu"
      [columns]="colDefs"
      [sortWhitelist]="sortWhitelist"
      [fetcher]="fetcher">
    </app-list-grid>
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:8px; }
    .warehouse-field { min-width: 260px; }
  `]
})
export class StocksPageComponent {
  sortWhitelist = ['itemCode', 'itemName', 'qty'];

  warehouseId: number | null = null;
  search: string | null = null;
  warehouses: WarehouseListItemDto[] = [];

  colDefs: ColDef<StockListItemDto>[] = [
    { field: 'warehouseCode', headerName: 'Depo', sortable: false, minWidth: 120 },
    { field: 'itemCode', headerName: 'Ürün Kodu', sortable: true, minWidth: 140 },
    { field: 'itemName', headerName: 'Ürün Adı', sortable: true, minWidth: 220 },
    { field: 'unit', headerName: 'Birim', sortable: false, maxWidth: 100 },
    { field: 'quantity', headerName: 'Miktar', colId: 'qty', sortable: true, type: 'rightAligned', minWidth: 130 }
  ];

  @ViewChild('grid') grid!: ListGridComponent<StockListItemDto>;

  constructor(
    private service: StocksService,
    private warehousesService: WarehousesService
  ) {
    this.warehousesService.list().subscribe(res => (this.warehouses = res.items));
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListStocksQuery = {
      ...q,
      warehouseId: this.warehouseId,
      search: (this.search ?? '').trim() || null
    };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() { this.warehouseId = null; this.search = null; this.grid.reload(); }
}
