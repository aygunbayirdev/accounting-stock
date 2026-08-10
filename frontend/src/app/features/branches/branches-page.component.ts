import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map } from 'rxjs/operators';
import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { BranchesService } from '../../core/services/branches.service';
import { BranchListItemDto } from '../../core/models/branch.models';
import { BranchFormDialogComponent, BranchFormDialogData } from './branch-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-branches-page',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent],
  template: `
    <div class="toolbar">
      <span class="title">Şubeler</span>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Şube
      </button>
    </div>

    <app-list-grid
      #grid
      title="Şubeler"
      [columns]="colDefs"
      [sortWhitelist]="[]"
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
export class BranchesPageComponent {
  colDefs: ColDef<BranchListItemDto>[] = [
    { field: 'id', headerName: 'ID', maxWidth: 80, pinned: 'left' },
    { field: 'code', headerName: 'Kod', minWidth: 140 },
    { field: 'name', headerName: 'Ad', minWidth: 240 },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<BranchListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<BranchListItemDto>;

  constructor(
    private service: BranchesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  fetcher = () => this.service.list().pipe(map(items => ({ items, total: items.length })));

  openCreate() {
    const ref = this.dialog.open<BranchFormDialogComponent, BranchFormDialogData>(BranchFormDialogComponent, {
      data: { branch: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Şube oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: BranchListItemDto) {
    // Liste satırı rowVersion taşımıyor (backend BranchListItemDto'da yok) — güncel veriyi getById ile al.
    this.service.getById(row.id).subscribe(branch => {
      const ref = this.dialog.open<BranchFormDialogComponent, BranchFormDialogData>(BranchFormDialogComponent, {
        data: { branch }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(branch.id, {
          id: branch.id,
          rowVersionBase64: branch.rowVersion,
          code: result.code!,
          name: result.name!
        }).subscribe({
          next: () => {
            this.snack.open('Şube güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  confirmDelete(row: BranchListItemDto) {
    this.service.getById(row.id).subscribe(branch => {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Şubeyi Sil',
          message: `"${branch.name}" şubesini silmek istediğinize emin misiniz?`,
          danger: true
        }
      });
      ref.afterClosed().subscribe(ok => {
        if (!ok) return;
        this.service.delete(branch.id, branch.rowVersion).subscribe({
          next: () => {
            this.snack.open('Şube silindi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }
}
