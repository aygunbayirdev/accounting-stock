import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { ItemsService } from '../../core/services/items.service';
import { ItemListItemDto, ListItemsQuery, ItemType, ItemTypeNames } from '../../core/models/item.models';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ItemFormDialogComponent, ItemFormDialogData } from './item-form-dialog.component';

@Component({
    standalone: true,
    selector: 'app-items-page',
    imports: [
        CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent, HasPermissionDirective
    ],
    template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
      <button *appHasPermission="'Item.Create'" mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Kart
      </button>
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
      [fetcher]="fetcher"
      [context]="gridContext">
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
        { headerName: 'Tür', sortable: false, minWidth: 110, valueGetter: p => p.data ? (ItemTypeNames[p.data.type as ItemType] ?? p.data.type) : '' },
        { field: 'unit', headerName: 'Birim', sortable: false, maxWidth: 120 },
        { field: 'vatRate', headerName: 'KDV (%)', sortable: true, maxWidth: 120, type: 'rightAligned' },
        { field: 'purchasePrice', headerName: 'Alış Fiyatı', sortable: true, type: 'rightAligned', minWidth: 140 },
        { field: 'salesPrice', headerName: 'Satış Fiyatı', sortable: true, type: 'rightAligned', minWidth: 140 },
        { field: 'createdAtUtc', headerName: 'Oluşturma', sortable: false, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '' },
        {
            headerName: '', colId: 'actions', width: 100, pinned: 'right',
            sortable: false, filter: false, suppressHeaderMenuButton: true,
            cellRenderer: EntityActionsCell
        }
    ];

    gridContext: EntityActionsContext<ItemListItemDto> = {
        onEdit: (row) => this.openEdit(row),
        onDelete: (row) => this.confirmDelete(row),
        updatePermission: 'Item.Update',
        deletePermission: 'Item.Delete'
    };

    // Basit filtre state
    filters: { search: string | null; unit: string | null; vatRate: number | null } = {
        search: null, unit: null, vatRate: null
    };

    @ViewChild('grid') grid!: ListGridComponent<ItemListItemDto>; // ✅ template ref'i yakala

    constructor(
        private service: ItemsService,
        private dialog: MatDialog,
        private snack: MatSnackBar
    ) { }

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

    openCreate() {
        const ref = this.dialog.open<ItemFormDialogComponent, ItemFormDialogData>(ItemFormDialogComponent, {
            data: { item: null }
        });
        ref.afterClosed().subscribe(result => {
            if (!result) return;
            this.service.create(result).subscribe({
                next: () => {
                    this.snack.open('Kart oluşturuldu.', 'Kapat', { duration: 2000 });
                    this.grid.reload();
                }
            });
        });
    }

    openEdit(row: ItemListItemDto) {
        this.service.getById(row.id).subscribe(full => {
            const ref = this.dialog.open<ItemFormDialogComponent, ItemFormDialogData>(ItemFormDialogComponent, {
                data: { item: full }
            });
            ref.afterClosed().subscribe(result => {
                if (!result) return;
                this.service.update(full.id, {
                    id: full.id,
                    rowVersion: full.rowVersion,
                    ...result
                }).subscribe({
                    next: () => {
                        this.snack.open('Kart güncellendi.', 'Kapat', { duration: 2000 });
                        this.grid.reload();
                    }
                });
            });
        });
    }

    confirmDelete(row: ItemListItemDto) {
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Kartı Sil',
                message: `"${row.name}" kartını silmek istediğinize emin misiniz?`,
                danger: true
            }
        });
        ref.afterClosed().subscribe(ok => {
            if (!ok) return;
            this.service.getById(row.id).subscribe(full => {
                this.service.delete(row.id, full.rowVersion).subscribe({
                    next: () => {
                        this.snack.open('Kart silindi.', 'Kapat', { duration: 2000 });
                        this.grid.reload();
                    }
                });
            });
        });
    }
}
