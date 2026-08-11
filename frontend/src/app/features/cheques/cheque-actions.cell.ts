import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ChequeDetailDto } from '../../core/models/cheque.models';
import { PermissionService } from '../../core/services/permission.service';

export interface ChequeActionsContext<T = any> {
  onCash?: (row: T) => void;
  onEndorse?: (row: T) => void;
  onBounce?: (row: T) => void;
  onCancel?: (row: T) => void;
  onDelete?: (row: T) => void;
}

@Component({
  standalone: true,
  selector: 'app-cheque-actions-cell',
  imports: [CommonModule, MatIconModule],
  template: `
    <button class="icon-btn" type="button" *ngIf="showCash" (click)="cash()" [title]="isInbound ? 'Tahsil Et' : 'Öde'">
      <mat-icon>payments</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="showEndorse" (click)="endorse()" title="Ciro Et">
      <mat-icon>sync_alt</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="showBounce" (click)="bounce()" title="Karşılıksız İşaretle">
      <mat-icon>report_problem</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="showCancel" (click)="cancel()" title="İptal Et">
      <mat-icon>cancel</mat-icon>
    </button>
    <button class="icon-btn" type="button" *ngIf="showDelete" (click)="remove()" title="Sil">
      <mat-icon>delete</mat-icon>
    </button>
  `,
  styles: [`
    :host { display:flex; align-items:center; gap:2px; }
    .icon-btn {
      width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center;
      border:none; background:transparent; cursor:pointer; border-radius:6px; color: inherit;
    }
    .icon-btn:hover { background: rgba(0,0,0,0.06); }
    .icon-btn mat-icon { font-size:20px; line-height:20px; }
  `]
})
export class ChequeActionsCell implements ICellRendererAngularComp {
  private permissionService = inject(PermissionService);
  private params!: ICellRendererParams<ChequeDetailDto>;

  isInbound = false;
  showCash = false;
  showEndorse = false;
  showBounce = false;
  showCancel = false;
  showDelete = false;

  agInit(p: ICellRendererParams<ChequeDetailDto>) {
    this.params = p;
    const status = p.data?.status;
    const direction = p.data?.direction;
    this.isInbound = direction === 'Inbound';

    const isPending = status === 'Pending';
    const isBounced = status === 'Bounced';
    const canUpdateStatus = this.permissionService.has('Cheque.UpdateStatus');
    const canDelete = this.permissionService.has('Cheque.Delete');

    this.showCash = (isPending || isBounced) && canUpdateStatus;
    this.showEndorse = isPending && this.isInbound && canUpdateStatus;
    this.showBounce = isPending && canUpdateStatus;
    this.showCancel = isPending && canUpdateStatus;
    this.showDelete = status !== 'Paid' && status !== 'Bounced' && canDelete;
  }

  refresh(): boolean { return false; }

  cash() {
    const ctx = this.params.context as ChequeActionsContext | undefined;
    ctx?.onCash?.(this.params.data);
  }

  endorse() {
    const ctx = this.params.context as ChequeActionsContext | undefined;
    ctx?.onEndorse?.(this.params.data);
  }

  bounce() {
    const ctx = this.params.context as ChequeActionsContext | undefined;
    ctx?.onBounce?.(this.params.data);
  }

  cancel() {
    const ctx = this.params.context as ChequeActionsContext | undefined;
    ctx?.onCancel?.(this.params.data);
  }

  remove() {
    const ctx = this.params.context as ChequeActionsContext | undefined;
    ctx?.onDelete?.(this.params.data);
  }
}
