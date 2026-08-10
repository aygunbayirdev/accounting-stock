import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { OrderListItemDto, OrderStatus } from '../../core/models/order.models';

export interface OrderActionsContext<T = any> {
  onApprove?: (row: T) => void;
  onCancel?: (row: T) => void;
  onConvertToInvoice?: (row: T) => void;
  onDelete?: (row: T) => void;
}

@Component({
  standalone: true,
  selector: 'app-order-actions-cell',
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <a class="icon-btn" [routerLink]="['/orders', id]" title="Görüntüle">
      <mat-icon>visibility</mat-icon>
    </a>
    <a class="icon-btn" *ngIf="isDraft" [routerLink]="['/orders', id, 'edit']" title="Düzenle">
      <mat-icon>edit</mat-icon>
    </a>
    <button class="icon-btn" type="button" *ngIf="isDraft" (click)="approve()" title="Onayla">
      <mat-icon>check_circle</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="isDraft || isApproved" (click)="cancel()" title="İptal Et">
      <mat-icon>cancel</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="isApproved" (click)="convertToInvoice()" title="Faturaya Dönüştür">
      <mat-icon>receipt_long</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="isDraft || isCancelled" (click)="remove()" title="Sil">
      <mat-icon>delete</mat-icon>
    </button>
  `,
  styles: [`
    :host { display:flex; align-items:center; gap:2px; }
    .icon-btn {
      width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center;
      text-decoration:none; border-radius:6px; border:none; background:transparent; cursor:pointer; color: inherit;
    }
    .icon-btn:hover { background: rgba(0,0,0,0.06); }
    .icon-btn mat-icon { font-size:20px; line-height:20px; }
  `]
})
export class OrderActionsCell implements ICellRendererAngularComp {
  id!: number;
  isDraft = false;
  isApproved = false;
  isCancelled = false;
  private params!: ICellRendererParams<OrderListItemDto>;

  agInit(p: ICellRendererParams<OrderListItemDto>) {
    this.params = p;
    this.id = Number(p.data?.id ?? 0);
    const status = p.data?.status;
    this.isDraft = status === OrderStatus.Draft;
    this.isApproved = status === OrderStatus.Approved;
    this.isCancelled = status === OrderStatus.Cancelled;
  }

  refresh(): boolean { return false; }

  approve() {
    const ctx = this.params.context as OrderActionsContext | undefined;
    ctx?.onApprove?.(this.params.data);
  }

  cancel() {
    const ctx = this.params.context as OrderActionsContext | undefined;
    ctx?.onCancel?.(this.params.data);
  }

  convertToInvoice() {
    const ctx = this.params.context as OrderActionsContext | undefined;
    ctx?.onConvertToInvoice?.(this.params.data);
  }

  remove() {
    const ctx = this.params.context as OrderActionsContext | undefined;
    ctx?.onDelete?.(this.params.data);
  }
}
