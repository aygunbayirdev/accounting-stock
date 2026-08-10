import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface UserActionsContext<T = any> {
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onChangePassword?: (row: T) => void;
}

@Component({
  standalone: true,
  selector: 'app-user-actions-cell',
  imports: [CommonModule, MatIconModule],
  template: `
    <button class="icon-btn" type="button" (click)="edit()" title="Düzenle">
      <mat-icon>edit</mat-icon>
    </button>
    <button class="icon-btn" type="button" (click)="changePassword()" title="Şifre Değiştir">
      <mat-icon>key</mat-icon>
    </button>
    <button class="icon-btn" type="button" (click)="remove()" title="Sil">
      <mat-icon>delete</mat-icon>
    </button>
  `,
  styles: [`
    :host { display:flex; align-items:center; gap:4px; height:100%; }
    .icon-btn {
      width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center;
      border:none; background:transparent; cursor:pointer; border-radius:6px; color: inherit;
    }
    .icon-btn:hover { background: rgba(0,0,0,0.06); }
    .icon-btn mat-icon { font-size:20px; line-height:20px; }
  `]
})
export class UserActionsCell implements ICellRendererAngularComp {
  private params!: ICellRendererParams;

  agInit(p: ICellRendererParams) { this.params = p; }
  refresh(): boolean { return false; }

  edit() {
    const ctx = this.params.context as UserActionsContext | undefined;
    ctx?.onEdit?.(this.params.data);
  }

  changePassword() {
    const ctx = this.params.context as UserActionsContext | undefined;
    ctx?.onChangePassword?.(this.params.data);
  }

  remove() {
    const ctx = this.params.context as UserActionsContext | undefined;
    ctx?.onDelete?.(this.params.data);
  }
}
