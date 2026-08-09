import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl, FormGroup } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef, GetRowIdParams, ValueParserParams, CellClickedEvent
} from 'ag-grid-community';

import Decimal from 'decimal.js';

import { LineActionsCell } from './line-actions.cell';

export type InvoiceMode = 'insert' | 'update' | 'view';
export type InvoiceTypeStr = 'Sales' | 'Purchase' | 'SalesReturn' | 'PurchaseReturn';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP }); // BE'de MidpointRounding.AwayFromZero eşdeğeri

export interface EditLine {
  id?: number;
  itemId: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  qty: string | null;
  unitPrice: string | null;
  vatRate: number | null;
  net?: string | null; vat?: string | null; gross?: string | null;
}

export interface InvoiceFormValue {
  id?: number;
  rowVersionBase64?: string;
  branchId?: number | null;                          // NEW
  contactId: number | null;
  dateUtc: string;
  currency: string;
  type: InvoiceTypeStr | number;
  lines: EditLine[];
}

/* ---- Tipli ana form (sadece header) ---- */
type InvoiceFormGroup = FormGroup<{
  rowVersionBase64: FormControl<string>;
  branchId: FormControl<number | null>;             // NEW
  contactId: FormControl<number | null>;
  dateUtc: FormControl<string>;
  currency: FormControl<string>;
  type: FormControl<InvoiceTypeStr>;
  // Satırları formda değil grid’de tutuyoruz; save’de map’liyoruz
}>;

type LineRow = {
  id: number;            // 0 = yeni
  _cid?: string;         // client-temp id (rowId için)
  itemId: number | null;
  qty: string | null;        // ⬅️ number yerine string
  unitPrice: string | null;  // ⬅️ number yerine string
  vatRate: number | null;
  net?: string | null;
  vat?: string | null;
  gross?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-invoice-form',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    AgGridAngular
  ],
  template: `
  <form class="page" [formGroup]="form" (ngSubmit)="onSave()">
    <!-- ÜST TOOLBAR -->
    <div class="toolbar">
      <h2 class="title">
        {{ mode === 'insert' ? 'Yeni Fatura' :
           mode === 'update' ? 'Fatura Düzenle' : 'Fatura' }}
      </h2>
      <span class="spacer"></span>
      <button *ngIf="!readonly()" mat-flat-button color="primary" type="submit">
        <mat-icon>save</mat-icon>
        Kaydet
      </button>
    </div>

    <!-- HEADER -->
    <div class="form-grid">
      <!-- NEW: BranchId textbox -->
      <mat-form-field appearance="outline">                                   <!-- NEW -->
        <mat-label>Şube (ID)</mat-label>                                      <!-- NEW -->
        <input                                                                
          matInput                                                            
          type="number"                                                       
          formControlName="branchId"                                          
          [readonly]="readonly()">                                            <!-- NEW -->
      </mat-form-field>                                                       <!-- NEW -->

      <mat-form-field appearance="outline">
        <mat-label>Cari (ID)</mat-label>
        <input matInput type="number" formControlName="contactId" [readonly]="readonly()">
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Tarih (UTC)</mat-label>
        <input matInput type="datetime-local" formControlName="dateUtc" [readonly]="readonly()">
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Para Birimi</mat-label>
        <mat-select formControlName="currency" [disabled]="readonly()">
          <mat-option value="TRY">TRY</mat-option>
          <mat-option value="USD">USD</mat-option>
          <mat-option value="EUR">EUR</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Tür</mat-label>
        <mat-select formControlName="type" [disabled]="readonly()">
          <mat-option value="Sales">Sales</mat-option>
          <mat-option value="Purchase">Purchase</mat-option>
          <mat-option value="SalesReturn">SalesReturn</mat-option>
          <mat-option value="PurchaseReturn">PurchaseReturn</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <mat-divider></mat-divider>

    <!-- SATIRLAR (AG GRID) -->
    <div class="lines-head">
      <h3>Satırlar ({{ rowData.length }})</h3>
      <span class="spacer"></span>
      <button *ngIf="!readonly()" type="button" mat-stroked-button (click)="addLine()">
        <mat-icon>add</mat-icon> Satır Ekle
      </button>
    </div>

    <div class="ag-theme-quartz lines-grid" style="height: 360px; width: 100%;">
      <ag-grid-angular
        [rowData]="rowData"
        [columnDefs]="colDefs"
        [defaultColDef]="defaultColDef"
        [getRowId]="getRowId"
        [rowHeight]="40"
        [headerHeight]="42"
        (cellClicked)="onCellClicked($event)">
      </ag-grid-angular>
    </div>

    <!-- ALT KAYDET -->
    <div class="foot" *ngIf="!readonly()">
      <span class="spacer"></span>
      <button mat-flat-button color="primary" type="submit">
        <mat-icon>save</mat-icon> Kaydet
      </button>
    </div>
  </form>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; gap:16px; padding-bottom:16px; }
    .toolbar, .lines-head, .foot { display:flex; align-items:center; gap:12px; }
    .title { margin:0; font-weight:600; }
    .spacer { flex:1; }
    .form-grid {
      display:grid; gap:12px;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
    }
    .lines-grid { margin-top:8px; }
    @media (max-width: 900px) {
      .form-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class InvoiceFormComponent {
  @Input() mode: InvoiceMode = 'insert';

  @Input() set value(v: InvoiceFormValue | null) {
    if (!v) return;
    // header
    this.form.patchValue({
      rowVersionBase64: v.rowVersionBase64 ?? '',
      branchId: v.branchId ?? null,                          // NEW
      contactId: v.contactId ?? null,
      // ⬇️ datetime-local uyumlu yerel string
      dateUtc: this.toLocalInputValue(v.dateUtc),
      currency: v.currency ?? 'TRY',
      // ⬇️ sayı/string → enum adı
      type: this.normalizeType(v.type)
    }, { emitEvent: false });

    // lines → grid rows
    this._cidSeq = 1;
    this.rowData = (v.lines ?? []).map(l => ({
      id: l.id ?? 0,
      _cid: l.id ? undefined : `c${this._cidSeq++}`,
      itemId: l.itemId ?? null,
      qty: l.qty ?? null,
      unitPrice: l.unitPrice ?? null,
      vatRate: l.vatRate ?? null,
      net: l.net ?? null,
      vat: l.vat ?? null,
      gross: l.gross ?? null
    }));
  }

  @Output() saveInsert = new EventEmitter<Omit<InvoiceFormValue, 'rowVersionBase64' | 'id'>>();
  @Output() saveUpdate = new EventEmitter<InvoiceFormValue>();

  private fb = inject(FormBuilder);
  form: InvoiceFormGroup = this.fb.group({
    rowVersionBase64: this.fb.nonNullable.control<string>(''),
    branchId: this.fb.control<number | null>(null, { validators: [Validators.required] }),  // NEW
    contactId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    dateUtc: this.fb.nonNullable.control<string>(new Date().toISOString(), { validators: [Validators.required] }),
    currency: this.fb.nonNullable.control<string>('TRY', { validators: [Validators.required] }),
    type: this.fb.nonNullable.control<InvoiceTypeStr>('Sales', { validators: [Validators.required] })
  });

  readonly = computed(() => this.mode === 'view');

  // --- Grid state ---
  rowData: LineRow[] = [];
  private _cidSeq = 1;

  stringNumberParser = (p: ValueParserParams) => {
    if (p.newValue === null || p.newValue === undefined) return null;
    const s = String(p.newValue).replace(',', '.').trim();
    return s === '' ? null : s;   // ⬅️ hep string döndürüyoruz
  };



  getRowId = (p: GetRowIdParams<LineRow>) => String(p.data?.id && p.data.id > 0 ? p.data.id : p.data?._cid);

  deleteLine = (row: LineRow) => {
    const { id, _cid } = row;
    this.rowData = this.rowData.filter(r => (r.id && r.id > 0) ? r.id !== id : r._cid !== _cid);
  };

  colDefs: ColDef<LineRow>[] = [
    { field: 'itemId', headerName: 'Ürün (ID)', editable: p => !this.readonly(), minWidth: 120 },
    { field: 'qty', headerName: 'Miktar', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 110, type: 'rightAligned' },
    { field: 'unitPrice', headerName: 'Birim Fiyat', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 130, type: 'rightAligned' },
    { field: 'vatRate', headerName: 'KDV (%)', editable: p => !this.readonly(), minWidth: 110, type: 'rightAligned' },

    {
      headerName: 'Net',
      editable: false,
      minWidth: 120,
      type: 'rightAligned',
      valueGetter: (p) => this.readonly() ? (p.data?.net ?? '') : this.preview(p.data).net
    },
    {
      headerName: 'KDV Tutarı',
      editable: false,
      minWidth: 120,
      type: 'rightAligned',
      valueGetter: (p) => this.readonly() ? (p.data?.vat ?? '') : this.preview(p.data).vat
    },
    {
      headerName: 'Brüt',
      editable: false,
      minWidth: 130,
      type: 'rightAligned',
      valueGetter: (p) => this.readonly() ? (p.data?.gross ?? '') : this.preview(p.data).gross
    },
    {
      headerName: '',
      colId: 'actions',
      width: 64,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: LineActionsCell,
      cellRendererParams: {
        onDelete: this.deleteLine.bind(this) // Material buton tıklanınca bu fonksiyon çalışır
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: false
  };

  onCellClicked(e: CellClickedEvent<LineRow>) {
    const target = e.event?.target as HTMLElement | null;

    // del butonu ise: submit + bubbling engelle
    if (e.colDef.colId === 'actions' && target && target.closest('.del-btn')) {
      e.event?.preventDefault();
      e.event?.stopPropagation();

      if (this.readonly()) return;

      const { id, _cid } = e.data!;
      this.rowData = this.rowData.filter(r => (r.id && r.id > 0) ? r.id !== id : r._cid !== _cid);
    }
  }

  addLine() {
    if (this.readonly()) return;
    this.rowData = [
      { id: 0, _cid: `c${this._cidSeq++}`, itemId: null, qty: '1', unitPrice: '0', vatRate: 20, net: null, vat: null, gross: null },
      ...this.rowData
    ];
  }

  onSave() {
    if (this.readonly()) return;
    const h = this.form.getRawValue();

    const normalize = (v: string | null | undefined): string => {
      const s = (v ?? '0').toString().replace(',', '.').trim();
      return s === '' ? '0' : s;
    };

    const bodyLines = this.rowData.map(l => ({
      id: l.id ?? 0,
      itemId: l.itemId!,
      qty: l.qty ?? '0',
      unitPrice: l.unitPrice ?? '0',
      vatRate: Number(l.vatRate ?? 0)
    }));

    if (this.mode === 'insert') {
      const createLines = this.rowData.map(l => ({
        id: 0,
        itemId: Number(l.itemId ?? 0),      // ItemId: int (BE dto da int)
        qty: normalize(l.qty),              // ⬅️ string, BE decimal.TryParse
        unitPrice: normalize(l.unitPrice),  // ⬅️ string, BE decimal.TryParse
        vatRate: Number(l.vatRate ?? 0)
      }));

      this.saveInsert.emit({
        branchId: h.branchId!,
        contactId: h.contactId!,
        dateUtc: this.localToUtcIso(h.dateUtc),
        currency: h.currency,
        type: h.type,
        lines: createLines as any
      } as any);
    } else {
      this.saveUpdate.emit({
        id: (this as any).id, // container (EditPage) set ediyor
        rowVersionBase64: h.rowVersionBase64,
        branchId: h.branchId!,                              // NEW
        contactId: h.contactId!,
        dateUtc: this.localToUtcIso(h.dateUtc),
        currency: h.currency,
        type: h.type,
        lines: bodyLines
      });
    }
  }

  toLocalInputValue(isoUtc?: string): string {
    // BE'den "2025-11-02T16:00:00Z" gelirse -> "2025-11-02T19:00"
    const d = isoUtc ? new Date(isoUtc) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  localToUtcIso(localStr: string): string {
    // "YYYY-MM-DDTHH:mm" (tz'siz yerel) -> UTC ISO "....Z"
    return new Date(localStr).toISOString();
  }

  normalizeType(val: unknown): InvoiceTypeStr {
    if (typeof val === 'number') {
      switch (val) {
        case 1: return 'Sales';
        case 2: return 'Purchase';
        case 3: return 'SalesReturn';
        case 4: return 'PurchaseReturn';
        default: return 'Sales';
      }
    }
    if (typeof val === 'string') {
      // "1"/"2" string gelirse:
      const n = Number(val);
      if (Number.isFinite(n)) return this.normalizeType(n);
      // "Sales" vb. gelirse:
      if (['Sales', 'Purchase', 'SalesReturn', 'PurchaseReturn'].includes(val)) return val as InvoiceTypeStr;
    }
    return 'Sales';
  }

  private preview(row?: { qty?: number | string | null; unitPrice?: number | string | null; vatRate?: number | string | null }) {
    // "1,23" gibi girişler için noktalı normalize
    const norm = (v: unknown) => {
      if (v === null || v === undefined) return "0";
      return String(v).replace(",", ".").trim() || "0";
    };

    const qty = new Decimal(norm(row?.qty));
    const unitPrice = new Decimal(norm(row?.unitPrice));
    const rate = new Decimal(norm(row?.vatRate));

    // NET = Birim Fiyat × Adet
    const net = unitPrice.times(qty);

    // KDV = NET = (rate / 100)
    const vat = net.times(rate).div(100);

    // BRÜT = NET + KDV
    const gross = net.plus(vat);

    return {
      net: net.toFixed(2),
      vat: vat.toFixed(2),
      gross: gross.toFixed(2),
    };
  }
}
