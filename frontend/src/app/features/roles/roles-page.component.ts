import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map } from 'rxjs';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { RolesService } from '../../core/services/roles.service';
import { RoleListItemDto } from '../../core/models/role.models';
import { RoleFormDialogComponent, RoleFormDialogData } from './role-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-roles-page',
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Roller</span>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Rol
      </button>
    </div>

    <app-list-grid
      #grid
      title="Roller"
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
export class RolesPageComponent {
  sortWhitelist: string[] = [];

  colDefs: ColDef<RoleListItemDto>[] = [
    { field: 'name', headerName: 'Rol Adı', sortable: false, minWidth: 200 },
    { field: 'description', headerName: 'Açıklama', sortable: false, minWidth: 260, valueGetter: p => p.data?.description ?? '—' },
    { field: 'permissionCount', headerName: 'İzin Sayısı', sortable: false, type: 'rightAligned', maxWidth: 140 },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<RoleListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<RoleListItemDto>;

  constructor(
    private service: RolesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  fetcher = () => this.service.list().pipe(
    map(items => ({ items, total: items.length }))
  );

  openCreate() {
    const ref = this.dialog.open<RoleFormDialogComponent, RoleFormDialogData>(RoleFormDialogComponent, {
      data: { role: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Rol oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: RoleListItemDto) {
    this.service.getById(row.id).subscribe(full => {
      const ref = this.dialog.open<RoleFormDialogComponent, RoleFormDialogData>(RoleFormDialogComponent, {
        data: { role: full }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(full.id, { id: full.id, ...result }).subscribe({
          next: () => {
            this.snack.open('Rol güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  confirmDelete(row: RoleListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Rolü Sil',
        message: `"${row.name}" rolünü silmek istediğinize emin misiniz? Bu role atanmış kullanıcı varsa silme işlemi reddedilecektir.`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.delete(row.id).subscribe({
        next: () => {
          this.snack.open('Rol silindi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }
}
