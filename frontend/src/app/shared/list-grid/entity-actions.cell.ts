import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { PermissionService } from '../../core/services/permission.service';

export interface EntityActionsContext<T = any> {
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** Belirtilirse Düzenle butonu sadece bu izne sahip kullanıcıya gösterilir. */
  updatePermission?: string;
  /** Belirtilirse Sil butonu sadece bu izne sahip kullanıcıya gösterilir. */
  deletePermission?: string;
}

/**
 * Dialog tabanlı (route'suz) liste ekranları için ortak Düzenle/Sil hücre render'ı.
 * Kullanım: `gridOptions.context` üzerinden `{ onEdit, onDelete }` sağlanmalı
 * (bkz. ListGridComponent'in `context` Input'u).
 */
@Component({
  standalone: true,
  selector: 'app-entity-actions-cell',
  imports: [CommonModule, MatIconModule],
  template: `
    @if (canEdit()) {
      <button class="icon-btn" type="button" (click)="edit()" title="Düzenle">
        <mat-icon>edit</mat-icon>
      </button>
    }
    @if (canDelete()) {
      <button class="icon-btn" type="button" (click)="remove()" title="Sil">
        <mat-icon>delete</mat-icon>
      </button>
    }
  `,
  styles: [`
    :host { display:flex; align-items:center; gap:6px; height:100%; }
    .icon-btn {
      width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center;
      border:none; background:transparent; cursor:pointer; border-radius:6px; color: inherit;
    }
    .icon-btn:hover { background: rgba(0,0,0,0.06); }
    .icon-btn mat-icon { font-size:20px; line-height:20px; }
  `]
})
export class EntityActionsCell implements ICellRendererAngularComp {
  private permissionService = inject(PermissionService);
  private params!: ICellRendererParams;

  agInit(p: ICellRendererParams) { this.params = p; }
  refresh(): boolean { return false; }

  canEdit(): boolean {
    const permission = this.context()?.updatePermission;
    return !permission || this.permissionService.has(permission);
  }

  canDelete(): boolean {
    const permission = this.context()?.deletePermission;
    return !permission || this.permissionService.has(permission);
  }

  edit() {
    this.context()?.onEdit?.(this.params.data);
  }

  remove() {
    this.context()?.onDelete?.(this.params.data);
  }

  private context(): EntityActionsContext | undefined {
    return this.params.context as EntityActionsContext | undefined;
  }
}
