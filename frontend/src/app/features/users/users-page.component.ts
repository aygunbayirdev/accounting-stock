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
import { UserActionsCell, UserActionsContext } from './user-actions.cell';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { BranchesService } from '../../core/services/branches.service';
import { UserListItemDto, ListUsersQuery, getUserFullName, getUserStatusDisplayName } from '../../core/models/user.models';
import { RoleListItemDto } from '../../core/models/role.models';
import { BranchListItemDto } from '../../core/models/branch.models';
import { UserFormDialogComponent, UserFormDialogData } from './user-form-dialog.component';
import { ChangePasswordDialogComponent, ChangePasswordDialogData } from './change-password-dialog.component';

@Component({
  standalone: true,
  selector: 'app-users-page',
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule, ListGridComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        Yeni Kullanıcı
      </button>
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
      <mat-form-field appearance="outline" class="role-field">
        <mat-label>Rol</mat-label>
        <mat-select [(ngModel)]="roleId">
          <mat-option [value]="null">Tüm roller</mat-option>
          @for (r of roles; track r.id) {
            <mat-option [value]="r.id">{{ r.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Durum</mat-label>
        <mat-select [(ngModel)]="isActive">
          <mat-option [value]="null">Tümü</mat-option>
          <mat-option [value]="true">Aktif</mat-option>
          <mat-option [value]="false">Pasif</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Ara (Ad/E-posta)</mat-label>
        <input matInput [(ngModel)]="search">
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
      #grid
      title="Kullanıcılar"
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
    .branch-field, .role-field { min-width: 220px; }
  `]
})
export class UsersPageComponent {
  sortWhitelist: string[] = [];

  branchId: number | null = null;
  roleId: number | null = null;
  isActive: boolean | null = null;
  search: string | null = null;
  branches: BranchListItemDto[] = [];
  roles: RoleListItemDto[] = [];

  colDefs: ColDef<UserListItemDto>[] = [
    { headerName: 'Ad Soyad', colId: 'fullName', sortable: false, minWidth: 200, valueGetter: p => p.data ? getUserFullName(p.data) : '' },
    { field: 'email', headerName: 'E-posta', sortable: false, minWidth: 220 },
    { field: 'branchName', headerName: 'Şube', sortable: false, minWidth: 160, valueGetter: p => p.data?.branchName ?? '—' },
    { headerName: 'Durum', colId: 'status', sortable: false, minWidth: 100, valueGetter: p => p.data ? getUserStatusDisplayName(p.data.isActive) : '' },
    {
      headerName: '', colId: 'actions', width: 130, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: UserActionsCell
    }
  ];

  gridContext: UserActionsContext<UserListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row),
    onChangePassword: (row) => this.openChangePassword(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<UserListItemDto>;

  constructor(
    private service: UsersService,
    private rolesService: RolesService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.branchesService.list().subscribe(res => (this.branches = res));
    this.rolesService.list().subscribe(res => (this.roles = res));
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListUsersQuery = {
      page: q.pageNumber,
      pageSize: q.pageSize,
      branchId: this.branchId,
      roleId: this.roleId,
      isActive: this.isActive,
      search: (this.search ?? '').trim() || null
    };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() {
    this.branchId = null;
    this.roleId = null;
    this.isActive = null;
    this.search = null;
    this.grid.reload();
  }

  openCreate() {
    const ref = this.dialog.open<UserFormDialogComponent, UserFormDialogData>(UserFormDialogComponent, {
      data: { user: null, branches: this.branches, roles: this.roles }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Kullanıcı oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: UserListItemDto) {
    this.service.getById(row.id).subscribe(full => {
      const ref = this.dialog.open<UserFormDialogComponent, UserFormDialogData>(UserFormDialogComponent, {
        data: { user: full, branches: this.branches, roles: this.roles }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(full.id, { id: full.id, ...result }).subscribe({
          next: () => {
            this.snack.open('Kullanıcı güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  openChangePassword(row: UserListItemDto) {
    const ref = this.dialog.open<ChangePasswordDialogComponent, ChangePasswordDialogData>(ChangePasswordDialogComponent, {
      data: { userFullName: getUserFullName(row) }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.changePassword(row.id, result).subscribe({
        next: () => {
          this.snack.open('Şifre değiştirildi.', 'Kapat', { duration: 2000 });
        }
      });
    });
  }

  confirmDelete(row: UserListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Kullanıcıyı Sil',
        message: `"${getUserFullName(row)}" kullanıcısını silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.delete(row.id).subscribe({
        next: () => {
          this.snack.open('Kullanıcı silindi.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }
}
