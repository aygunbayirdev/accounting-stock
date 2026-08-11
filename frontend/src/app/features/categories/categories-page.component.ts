import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { CategoriesService } from '../../core/services/categories.service';
import { CategoryListItemDto, ListCategoriesQuery } from '../../core/models/category.models';
import { CategoryFormDialogComponent, CategoryFormDialogData } from './category-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-categories-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent, HasPermissionDirective
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
      <button *appHasPermission="'Category.Create'" mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Kategori
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Ara (Ad)</mat-label>
        <input matInput [(ngModel)]="search">
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
      #grid
      title="Kategoriler"
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
  `]
})
export class CategoriesPageComponent {
  sortWhitelist: string[] = []; // Backend sort desteklemiyor
  search: string | null = null;

  colDefs: ColDef<CategoryListItemDto>[] = [
    { field: 'name', headerName: 'Ad', sortable: false, minWidth: 200 },
    { field: 'description', headerName: 'Açıklama', sortable: false, minWidth: 260 },
    {
      headerName: 'Renk', colId: 'color', sortable: false, maxWidth: 100,
      cellRenderer: (p: any) => p.data?.color
        ? `<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${p.data.color};border:1px solid rgba(0,0,0,.2);vertical-align:middle;"></span>`
        : ''
    },
    { field: 'createdAtUtc', headerName: 'Oluşturma', sortable: false, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('tr-TR') : '' },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<CategoryListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row),
    updatePermission: 'Category.Update',
    deletePermission: 'Category.Delete'
  };

  @ViewChild('grid') grid!: ListGridComponent<CategoryListItemDto>;

  constructor(
    private service: CategoriesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) { }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListCategoriesQuery = {
      page: q.pageNumber,
      pageSize: q.pageSize,
      search: (this.search ?? '').trim() || null
    };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() { this.search = null; this.grid.reload(); }

  openCreate() {
    const ref = this.dialog.open<CategoryFormDialogComponent, CategoryFormDialogData>(CategoryFormDialogComponent, {
      data: { category: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Kategori oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: CategoryListItemDto) {
    const ref = this.dialog.open<CategoryFormDialogComponent, CategoryFormDialogData>(CategoryFormDialogComponent, {
      data: { category: row }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.update(row.id, {
        id: row.id,
        rowVersion: row.rowVersion,
        ...result
      }).subscribe({
        next: () => {
          this.snack.open('Kategori güncellendi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  confirmDelete(row: CategoryListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Kategoriyi Sil',
        message: `"${row.name}" kategorisini silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.delete(row.id, row.rowVersion).subscribe({
        next: () => {
          this.snack.open('Kategori silindi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }
}
