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
import { CashBankAccountsService } from '../../core/services/cash-bank-accounts.service';
import {
  CashBankAccountListItemDto,
  ListCashBankAccountsQuery,
  CashBankAccountType,
  getAccountTypeDisplayName
} from '../../core/models/cash-bank-account.models';
import { BranchesService } from '../../core/services/branches.service';
import { BranchListItemDto } from '../../core/models/branch.models';
import { CashBankAccountFormDialogComponent, CashBankAccountFormDialogData } from './cash-bank-account-form-dialog.component';

@Component({
  standalone: true,
  selector: 'app-cash-bank-accounts-page',
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
        Yeni Hesap
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
      <mat-form-field appearance="outline">
        <mat-label>Tür</mat-label>
        <mat-select [(ngModel)]="type">
          <mat-option [value]="null">Tümü</mat-option>
          <mat-option [value]="CashBankAccountType.Cash">Kasa</mat-option>
          <mat-option [value]="CashBankAccountType.Bank">Banka</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Ara (Kod/Ad)</mat-label>
        <input matInput [(ngModel)]="search">
      </mat-form-field>
      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
      #grid
      title="Kasa/Banka Hesapları"
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
export class CashBankAccountsPageComponent {
  sortWhitelist = ['name', 'type'];
  CashBankAccountType = CashBankAccountType;

  branchId: number | null = null;
  type: CashBankAccountType | null = null;
  search: string | null = null;
  branches: BranchListItemDto[] = [];

  colDefs: ColDef<CashBankAccountListItemDto>[] = [
    { field: 'code', headerName: 'Kod', sortable: false, minWidth: 130 },
    { field: 'name', headerName: 'Ad', sortable: true, minWidth: 200 },
    { headerName: 'Tür', sortable: true, colId: 'type', minWidth: 100, valueGetter: p => p.data ? getAccountTypeDisplayName(p.data.type) : '' },
    { field: 'iban', headerName: 'IBAN', sortable: false, minWidth: 200 },
    { field: 'currency', headerName: 'PB', sortable: false, maxWidth: 90 },
    { field: 'balance', headerName: 'Bakiye', sortable: false, type: 'rightAligned', minWidth: 130 },
    {
      headerName: '', colId: 'actions', width: 100, pinned: 'right',
      sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: EntityActionsCell
    }
  ];

  gridContext: EntityActionsContext<CashBankAccountListItemDto> = {
    onEdit: (row) => this.openEdit(row),
    onDelete: (row) => this.confirmDelete(row)
  };

  @ViewChild('grid') grid!: ListGridComponent<CashBankAccountListItemDto>;

  constructor(
    private service: CashBankAccountsService,
    private branchesService: BranchesService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.branchesService.list().subscribe(res => (this.branches = res));
  }

  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
    const query: ListCashBankAccountsQuery = {
      ...q,
      branchId: this.branchId,
      type: this.type,
      search: (this.search ?? '').trim() || null
    };
    return this.service.list(query);
  };

  apply() { this.grid.reload(); }
  reset() { this.branchId = null; this.type = null; this.search = null; this.grid.reload(); }

  openCreate() {
    const ref = this.dialog.open<CashBankAccountFormDialogComponent, CashBankAccountFormDialogData>(CashBankAccountFormDialogComponent, {
      data: { account: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => {
          this.snack.open('Hesap oluşturuldu.', 'Kapat', { duration: 2000 });
          this.grid.reload();
        }
      });
    });
  }

  openEdit(row: CashBankAccountListItemDto) {
    this.service.getById(row.id).subscribe(full => {
      const ref = this.dialog.open<CashBankAccountFormDialogComponent, CashBankAccountFormDialogData>(CashBankAccountFormDialogComponent, {
        data: { account: full }
      });
      ref.afterClosed().subscribe(result => {
        if (!result) return;
        this.service.update(full.id, {
          id: full.id,
          rowVersion: full.rowVersion,
          ...result
        }).subscribe({
          next: () => {
            this.snack.open('Hesap güncellendi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }

  confirmDelete(row: CashBankAccountListItemDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Hesabı Sil',
        message: `"${row.name}" (${row.code}) hesabını silmek istediğinize emin misiniz?`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.getById(row.id).subscribe(full => {
        this.service.delete(row.id, full.rowVersion).subscribe({
          next: () => {
            this.snack.open('Hesap silindi.', 'Kapat', { duration: 2000 });
            this.grid.reload();
          }
        });
      });
    });
  }
}
