import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { WarehousesService } from '../../core/services/warehouses.service';
import { WarehouseListItemDto, ListWarehousesQuery } from '../../core/models/warehouse.models';
import { BranchesService } from '../../core/services/branches.service';
import { BranchListItemDto } from '../../core/models/branch.models';
import { WarehouseFormDialogComponent, WarehouseFormDialogData } from './warehouse-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-warehouses-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDialogModule, ListGridComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="branch-field">
        <mat-label>Şube</mat-label>
        <mat-select [(ngModel)]="branchId">
          <mat-option [value]="null">Tüm şubeler</mat-option>
          @for (b of branches; track b.id) {
            <mat-option [value]="b.id">{{ b.code }} - {{ b.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Depo
      </button>
    </div>

    <app-list-grid
      #grid
      title="Depolar"
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
    .filters { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:8px; }
    .branch-field { min-width: 260px; }
  `]
})
export class WarehousesPageComponent {
  sortWhitelist = ['code', 'name', 'isdefault'];
  branchId: number | null = null;
  branches: BranchListItemDto[] = [];

  colDefs: ColDef<WarehouseListItemDto>[] = [
    { field: 'id', headerName: 'ID', sortable: false, maxWidth: 80, pinned: 'left' },
    { field: 'code', headerName: 'Kod', sortable: true, minWidth: 120 },
    { field: 'name', headerName: 'Ad', sortable: true, minWidth: 200 },
    { field: 'branchId', headerName: 'Şube ID', sortable: false, maxWidth: 100 },
    { field: 'isDefault', headerName: 'Varsayılan', sortable: true, maxWidth: 130, valueFormatter: p => p.value ? 'Evet' : 'Hayır' },
    { field: 'createdAtUtc', headerName: 'Oluşturma', sortable: false, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('tr-TR') : '' },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<WarehouseListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<WarehouseListItemDto>;

  constructor(
    private service: WarehousesService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.branchesService.list().subscribe(res => (this.branches = res));
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListWarehousesQuery = { ...q, branchId: this.branchId };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() { this.branchId = null; this.grid.reload(); }

  openCreate() {
    const ref = this.dialog.open<WarehouseFormDialogComponent, WarehouseFormDialogData>(WarehouseFormDialogComponent, {
      data: { warehouse: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Depo oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: WarehouseListItemDto) {
    this.service.getById(row.id).subscribe(full => {
      const ref = this.dialog.open<WarehouseFormDialogComponent, WarehouseFormDialogData>(WarehouseFormDialogComponent, {
        data: { warehouse: full }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(full.id, {
          id: full.id,
          rowVersion: full.rowVersion,
          branchId: result.branchId!,
          code: result.code!,
          name: result.name!,
          isDefault: result.isDefault!
        }).subscribe({
          next: () => {
            this.snack.open('Depo güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  confirmDelete(row: WarehouseListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Depoyu Sil',
        message: `"${row.name}" deposunu silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      // Liste satırı rowVersion taşımıyor (backend WarehouseListItemDto'da yok) — getById ile al.
      this.service.getById(row.id).subscribe(full => {
        this.service.delete(row.id, full.rowVersion).subscribe({
          next: () => {
            this.snack.open('Depo silindi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }
}
