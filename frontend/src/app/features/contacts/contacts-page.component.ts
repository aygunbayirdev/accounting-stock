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
import { EntityActionsCell, EntityActionsContext } from '../../shared/list-grid/entity-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { PermissionService } from '../../core/services/permission.service';
import { ContactsService } from '../../core/services/contacts.service';
import { ContactListItemDto, ListContactsQuery, getContactType } from '../../core/models/contact.models';
import { BranchesService } from '../../core/services/branches.service';
import { BranchListItemDto } from '../../core/models/branch.models';
import { ContactFormDialogComponent, ContactFormDialogData } from './contact-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-contacts-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent, HasPermissionDirective
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Ara (kod, ad, e-posta)</mat-label>
        <input matInput [(ngModel)]="filters.search" />
      </mat-form-field>
      <mat-form-field *appHasPermission="'Branch.Read'" appearance="outline" class="branch-field">
        <mat-label>Şube</mat-label>
        <mat-select [(ngModel)]="filters.branchId">
          <mat-option [value]="null">Tüm şubeler</mat-option>
          @for (b of branches; track b.id) {
            <mat-option [value]="b.id">{{ b.code }} - {{ b.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Tür</mat-label>
        <mat-select [(ngModel)]="typeFilter">
          <mat-option [value]="null">Tümü</mat-option>
          <mat-option value="isCustomer">Müşteri</mat-option>
          <mat-option value="isVendor">Tedarikçi</mat-option>
          <mat-option value="isEmployee">Personel</mat-option>
          <mat-option value="isRetail">Perakende</mat-option>
        </mat-select>
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
      <span class="spacer"></span>
      <button *appHasPermission="'Contact.Create'" mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Cari
      </button>
    </div>

    <app-list-grid
      #grid
      title="Cariler"
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
    .branch-field { min-width: 220px; }
  `]
})
export class ContactsPageComponent {
  sortWhitelist = ['code', 'name'];
  branches: BranchListItemDto[] = [];

  filters: { search: string | null; branchId: number | null } = { search: null, branchId: null };
  typeFilter: 'isCustomer' | 'isVendor' | 'isEmployee' | 'isRetail' | null = null;

  colDefs: ColDef<ContactListItemDto>[] = [
    { field: 'id', headerName: 'ID', sortable: false, maxWidth: 80, pinned: 'left' },
    { field: 'code', headerName: 'Kod', sortable: true, minWidth: 130 },
    { field: 'name', headerName: 'Ad / Unvan', sortable: true, minWidth: 220 },
    { field: 'branchId', headerName: 'Şube ID', sortable: false, maxWidth: 100 },
    { headerName: 'Tür', sortable: false, minWidth: 180, valueGetter: p => p.data ? getContactType(p.data) : '' },
    { field: 'email', headerName: 'E-posta', sortable: false, minWidth: 180 },
    { field: 'createdAtUtc', headerName: 'Oluşturma', sortable: false, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('tr-TR') : '' },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<ContactListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row),
    updatePermission: 'Contact.Update',
    deletePermission: 'Contact.Delete'
  };

  @ViewChild('grid') grid!: ListGridComponent<ContactListItemDto>;

  constructor(
    private service: ContactsService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private permissionService: PermissionService
  ) {
    if (this.permissionService.has('Branch.Read')) {
      this.branchesService.list().subscribe(res => (this.branches = res));
    }
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListContactsQuery = {
      ...q,
      search: (this.filters.search ?? '').trim() || null,
      branchId: this.filters.branchId,
      isCustomer: this.typeFilter === 'isCustomer' ? true : null,
      isVendor: this.typeFilter === 'isVendor' ? true : null,
      isEmployee: this.typeFilter === 'isEmployee' ? true : null,
      isRetail: this.typeFilter === 'isRetail' ? true : null
    };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() {
    this.filters = { search: null, branchId: null };
    this.typeFilter = null;
    this.grid.reload();
  }

  openCreate() {
    const ref = this.dialog.open<ContactFormDialogComponent, ContactFormDialogData>(ContactFormDialogComponent, {
      data: { contact: null, defaultBranchId: this.filters.branchId }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Cari oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: ContactListItemDto) {
    this.service.getById(row.id).subscribe(full => {
      const ref = this.dialog.open<ContactFormDialogComponent, ContactFormDialogData>(ContactFormDialogComponent, {
        data: { contact: full, defaultBranchId: full.branchId }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(full.id, {
          id: full.id,
          rowVersion: full.rowVersion,
          ...result
        }).subscribe({
          next: () => {
            this.snack.open('Cari güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  confirmDelete(row: ContactListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cariyi Sil',
        message: `"${row.name}" carisini silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.getById(row.id).subscribe(full => {
        this.service.delete(row.id, full.rowVersion).subscribe({
          next: () => {
            this.snack.open('Cari silindi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }
}
