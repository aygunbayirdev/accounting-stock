// invoice-actions.cell.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  standalone: true,
  selector: 'app-invoice-actions-cell',
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <a class="icon-btn" [routerLink]="['/invoices', id]" title="Görüntüle">
      <mat-icon>visibility</mat-icon>
    </a>
    <a class="icon-btn" [routerLink]="['/invoices', id, 'edit']" title="Düzenle">
      <mat-icon>edit</mat-icon>
    </a>
  `,
  styles: [`
    :host { display:flex; align-items:center; gap:6px; }
    .icon-btn { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; text-decoration:none; border-radius:6px; }
    .icon-btn mat-icon { font-size:20px; line-height:20px; }
  `]
})
export class InvoiceActionsCell implements ICellRendererAngularComp {
  id!: number;
  agInit(p: ICellRendererParams) { this.id = Number(p.data?.id ?? 0); }
  refresh(): boolean { return false; }
}
