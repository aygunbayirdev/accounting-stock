import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { ItemsService } from '../../core/services/items.service';
import { ItemListItemDto, ListItemsQuery } from '../../core/models/item.models';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
    standalone: true,
    selector: 'app-items-page',
    imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, ListGridComponent],
    template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
    </div>

    <!-- Basit Filtre Alanları -->
    <div class="filters">
        <mat-form-field appearance="outline">
            <mat-label>Ara (Ad)</mat-label>
            <input matInput [(ngModel)]="filters.search" placeholder="">
        </mat-form-field>
        <mat-form-field appearance="outline">
            <mat-label>Birim</mat-label>
            <mat-select [(ngModel)]="filters.unit">
            <mat-option [value]="null">—</mat-option>
            <mat-option value="adet">adet</mat-option>
            <mat-option value="kg">kg</mat-option>
            <mat-option value="lt">lt</mat-option>
            </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 120px;">
            <mat-label>KDV (%)</mat-label>
            <input matInput type="number" min="0" max="100" [(ngModel)]="filters.vatRate" placeholder="">
       </mat-form-field>
        <button mat-stroked-button (click)="apply()">Uygula</button>
        <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
        #grid
      title="Stok Kartları"
      [columns]="colDefs"
      [sortWhitelist]="sortWhitelist"
      [fetcher]="fetcher">
    </app-list-grid>
  `,
    styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; }
    .spacer { flex:1; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  `]
})
export class ItemsPageComponent {
    // BE whitelist: code, name, vatrate, price
    sortWhitelist = ['code', 'name', 'vatrate', 'price'];

    colDefs: ColDef<ItemListItemDto>[] = [
        { field: 'code', headerName: 'Kod', sortable: true, minWidth: 120 },
        { field: 'name', headerName: 'Ad', sortable: true, minWidth: 180 },
        { field: 'unit', headerName: 'Birim', sortable: false, maxWidth: 120 },
        { field: 'vatRate', headerName: 'KDV (%)', sortable: true, maxWidth: 120, type: 'rightAligned' },
        { field: 'purchasePrice', headerName: 'Alış Fiyatı', sortable: true, type: 'rightAligned', minWidth: 140 },
        { field: 'salesPrice', headerName: 'Satış Fiyatı', sortable: true, type: 'rightAligned', minWidth: 140 },
        { field: 'createdAtUtc', headerName: 'Oluşturma', sortable: false, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '' }
    ];

    // Basit filtre state
    filters: { search: string | null; unit: string | null; vatRate: number | null } = {
        search: null, unit: null, vatRate: null
    };

    @ViewChild('grid') grid!: ListGridComponent<ItemListItemDto>; // ✅ template ref'i yakala

    constructor(private service: ItemsService) { }

    // ListGrid’e verilecek fetcher — grid page/sort ile beraber filtreleri geçiriyoruz
    fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string; }) => {
        const request: ListItemsQuery = {
            ...q,
            search: (this.filters.search ?? '').trim() || null,
            unit: this.filters.unit,
            vatRate: this.filters.vatRate
        };
        return this.service.list(request);
    };

    apply() {
        this.grid.reload();
    }

    reset() {
        this.filters = { search: null, unit: null, vatRate: null };
        this.grid.reload();
    }
}
