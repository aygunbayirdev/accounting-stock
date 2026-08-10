import { Component, Input, Output, EventEmitter, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl, FormGroup } from '@angular/forms';

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
import { AG_THEME } from '../../core/ag-grid/ag-theme';

import { LineActionsCell } from './line-actions.cell';
// money.utils.ts, decimal.js'i backend'in MidpointRounding.AwayFromZero'suna eşdeğer
// (precision 28, ROUND_HALF_UP) şekilde global olarak yapılandırıyor — modül import
// edildiğinde bu ayar zaten uygulanıyor, burada tekrar Decimal.set() çağırmaya gerek yok.
import { calculateInvoiceLine } from '../../core/utils/money.utils';
import { EntityPickerComponent, PickerOption } from '../../shared/entity-picker/entity-picker.component';
import { ContactsService } from '../../core/services/contacts.service';
import { ItemsService } from '../../core/services/items.service';
import { DocumentType, DocumentTypeNames } from '../../core/models/invoice.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type InvoiceMode = 'insert' | 'update' | 'view';
export type InvoiceTypeStr = 'Sales' | 'Purchase' | 'SalesReturn' | 'PurchaseReturn';

export interface EditLine {
  id?: number;
  itemId: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  qty: string | null;
  unitPrice: string | null;
  vatRate: number | null;
  discountRate?: string | null;
  withholdingRate?: number | null;
  net?: string | null; vat?: string | null; grandTotal?: string | null;
}

export interface InvoiceFormValue {
  id?: number;
  rowVersionBase64?: string;
  branchId?: number | null;
  branchCode?: string | null;         // salt görüntüleme — backend BranchId'yi çağıranın kendi şubesinden alır
  branchName?: string | null;
  contactId: number | null;
  contactCode?: string | null;        // entity-picker'ın edit/view modunda başlangıç etiketi için
  contactName?: string | null;
  dateUtc: string;
  currency: string;
  type: InvoiceTypeStr | number;
  documentType?: number | null;
  waybillNumber?: string | null;
  waybillDateUtc?: string | null;
  paymentDueDateUtc?: string | null;
  lines: EditLine[];
}

/* ---- Tipli ana form (sadece header) ---- */
type InvoiceFormGroup = FormGroup<{
  rowVersionBase64: FormControl<string>;
  contactId: FormControl<number | null>;
  dateUtc: FormControl<string>;
  currency: FormControl<string>;
  type: FormControl<InvoiceTypeStr>;
  documentType: FormControl<number | null>;
  waybillNumber: FormControl<string | null>;
  waybillDateUtc: FormControl<string | null>;
  paymentDueDateUtc: FormControl<string | null>;
  // Satırları formda değil grid’de tutuyoruz; save’de map’liyoruz
}>;

type LineRow = {
  id: number;            // 0 = yeni
  _cid?: string;         // client-temp id (rowId için)
  itemId: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  qty: string | null;        // ⬅️ number yerine string
  unitPrice: string | null;  // ⬅️ number yerine string
  vatRate: number | null;
  discountRate: string | null;
  withholdingRate: number | null;
  net?: string | null;
  vat?: string | null;
  grandTotal?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-invoice-form',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    AgGridAngular, EntityPickerComponent
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

    <div class="branch-info" *ngIf="branchCode">Şube: {{ branchCode }} - {{ branchName }}</div>
    <div class="branch-info hint" *ngIf="mode === 'insert'">Şube: kaydettiğinizde oturum açan kullanıcının şubesine atanır.</div>

    <!-- HEADER -->
    <div class="form-grid">
      <app-entity-picker
        label="Cari"
        [fetcher]="contactFetcher"
        [value]="form.value.contactId ?? null"
        [initialLabel]="contactLabel"
        [width]="'100%'"
        (valueChange)="onContactSelected($event)">
      </app-entity-picker>

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
          <mat-option value="Sales">Satış</mat-option>
          <mat-option value="Purchase">Alış</mat-option>
          <mat-option value="SalesReturn">Satış İade</mat-option>
          <mat-option value="PurchaseReturn">Alış İade</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Belge Türü</mat-label>
        <mat-select formControlName="documentType" [disabled]="readonly()">
          <mat-option [value]="null">—</mat-option>
          <mat-option [value]="DocumentType.Invoice">{{ DocumentTypeNames[DocumentType.Invoice] }}</mat-option>
          <mat-option [value]="DocumentType.RetailReceipt">{{ DocumentTypeNames[DocumentType.RetailReceipt] }}</mat-option>
          <mat-option [value]="DocumentType.ExpenseNote">{{ DocumentTypeNames[DocumentType.ExpenseNote] }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>İrsaliye No</mat-label>
        <input matInput formControlName="waybillNumber" [readonly]="readonly()">
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>İrsaliye Tarihi</mat-label>
        <input matInput type="date" formControlName="waybillDateUtc" [readonly]="readonly()">
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Vade Tarihi</mat-label>
        <input matInput type="date" formControlName="paymentDueDateUtc" [readonly]="readonly()">
      </mat-form-field>
    </div>

    <mat-divider></mat-divider>

    <!-- SATIRLAR (AG GRID) -->
    <div class="lines-head">
      <h3>Satırlar ({{ rowData.length }})</h3>
      <span class="spacer"></span>
      <app-entity-picker
        *ngIf="!readonly()"
        label="Ürün Ekle"
        placeholder="Ürün ara ve seç..."
        [fetcher]="itemFetcher"
        [width]="'320px'"
        (valueChange)="onItemPicked($event)">
      </app-entity-picker>
      <button *ngIf="!readonly()" type="button" mat-stroked-button (click)="addLine()">
        <mat-icon>add</mat-icon> Boş Satır
      </button>
    </div>

    <div class="lines-error" *ngIf="formError()">{{ formError() }}</div>

    <div class="lines-grid" style="height: 360px; width: 100%;">
      <ag-grid-angular
        [theme]="AG_THEME"
        [rowData]="rowData"
        [columnDefs]="colDefs"
        [defaultColDef]="defaultColDef"
        [getRowId]="getRowId"
        [gridOptions]="lineGridOptions"
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
    .branch-info { font-size:0.9em; color: var(--mat-sys-on-surface-variant, #666); }
    .branch-info.hint { font-style: italic; }
    .lines-error { color: var(--mat-sys-error, #b3261e); font-size: 0.9em; }
    @media (max-width: 900px) {
      .form-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class InvoiceFormComponent {
  AG_THEME = AG_THEME;
  DocumentType = DocumentType;
  DocumentTypeNames = DocumentTypeNames;
  // bkz. shared/list-grid/list-grid.component.ts'deki aynı isimli alanın yorumu:
  // rAF'a ertelenen ilk-render cellRenderer oluşturmasını senkrona zorluyoruz (line-actions.cell).
  lineGridOptions = { suppressAnimationFrame: true };

  private contactsService = inject(ContactsService);
  private itemsService = inject(ItemsService);

  @Input() mode: InvoiceMode = 'insert';

  private _id?: number;
  branchCode: string | null = null;
  branchName: string | null = null;
  contactLabel: string | null = null;

  @Input() set value(v: InvoiceFormValue | null) {
    if (!v) return;
    this._id = v.id;
    this.branchCode = v.branchCode ?? null;
    this.branchName = v.branchName ?? null;
    this.contactLabel = v.contactCode && v.contactName ? `${v.contactCode} - ${v.contactName}` : (v.contactName ?? null);
    // header
    this.form.patchValue({
      rowVersionBase64: v.rowVersionBase64 ?? '',
      contactId: v.contactId ?? null,
      // ⬇️ datetime-local uyumlu yerel string
      dateUtc: this.toLocalInputValue(v.dateUtc),
      currency: v.currency ?? 'TRY',
      // ⬇️ sayı/string → enum adı
      type: this.normalizeType(v.type),
      documentType: v.documentType ?? null,
      waybillNumber: v.waybillNumber ?? null,
      waybillDateUtc: this.toDateInputValue(v.waybillDateUtc),
      paymentDueDateUtc: this.toDateInputValue(v.paymentDueDateUtc)
    }, { emitEvent: false });

    // lines → grid rows
    this._cidSeq = 1;
    this.rowData = (v.lines ?? []).map(l => ({
      id: l.id ?? 0,
      _cid: l.id ? undefined : `c${this._cidSeq++}`,
      itemId: l.itemId ?? null,
      itemCode: l.itemCode ?? null,
      itemName: l.itemName ?? null,
      unit: l.unit ?? null,
      qty: l.qty ?? null,
      unitPrice: l.unitPrice ?? null,
      vatRate: l.vatRate ?? null,
      discountRate: l.discountRate ?? null,
      withholdingRate: l.withholdingRate ?? null,
      net: l.net ?? null,
      vat: l.vat ?? null,
      grandTotal: l.grandTotal ?? null
    }));
  }

  @Output() saveInsert = new EventEmitter<Omit<InvoiceFormValue, 'rowVersionBase64' | 'id'>>();
  @Output() saveUpdate = new EventEmitter<InvoiceFormValue>();

  private fb = inject(FormBuilder);
  form: InvoiceFormGroup = this.fb.group({
    rowVersionBase64: this.fb.nonNullable.control<string>(''),
    contactId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    dateUtc: this.fb.nonNullable.control<string>(new Date().toISOString(), { validators: [Validators.required] }),
    currency: this.fb.nonNullable.control<string>('TRY', { validators: [Validators.required] }),
    type: this.fb.nonNullable.control<InvoiceTypeStr>('Sales', { validators: [Validators.required] }),
    documentType: this.fb.control<number | null>(null),
    waybillNumber: this.fb.control<string | null>(null),
    waybillDateUtc: this.fb.control<string | null>(null),
    paymentDueDateUtc: this.fb.control<string | null>(null)
  });

  readonly = computed(() => this.mode === 'view');
  formError = signal<string | null>(null);

  // --- Grid state ---
  rowData: LineRow[] = [];
  private _cidSeq = 1;

  contactFetcher = (search: string): Observable<PickerOption[]> =>
    this.contactsService.list({ search: search || null, pageSize: 20 }).pipe(
      map(res => res.items.map(c => ({ id: c.id, label: c.code, sublabel: c.name })))
    );

  itemFetcher = (search: string): Observable<PickerOption[]> =>
    this.itemsService.list({ search: search || undefined, pageSize: 20 }).pipe(
      map(res => res.items.map(i => ({ id: i.id, label: i.code, sublabel: i.name })))
    );

  onContactSelected(id: number | null) {
    this.form.patchValue({ contactId: id });
  }

  onItemPicked(itemId: number | null) {
    if (!itemId || this.readonly()) return;
    this.itemsService.getById(itemId).subscribe(item => {
      this.rowData = [
        {
          id: 0, _cid: `c${this._cidSeq++}`,
          itemId: item.id, itemCode: item.code, itemName: item.name, unit: item.unit,
          qty: '1', unitPrice: item.salesPrice ?? '0', vatRate: item.vatRate,
          discountRate: null, withholdingRate: null,
          net: null, vat: null, grandTotal: null
        },
        ...this.rowData
      ];
    });
  }

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
    { field: 'itemId', headerName: 'Ürün (ID)', editable: p => !this.readonly(), minWidth: 100, maxWidth: 110 },
    { field: 'itemCode', headerName: 'Kod', editable: false, minWidth: 90, maxWidth: 110 },
    { field: 'itemName', headerName: 'Ürün Adı', editable: false, minWidth: 160 },
    { field: 'qty', headerName: 'Miktar', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 100, type: 'rightAligned' },
    { field: 'unitPrice', headerName: 'Birim Fiyat', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 120, type: 'rightAligned' },
    { field: 'vatRate', headerName: 'KDV (%)', editable: p => !this.readonly(), minWidth: 100, type: 'rightAligned' },
    { field: 'discountRate', headerName: 'İskonto (%)', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 110, type: 'rightAligned' },
    { field: 'withholdingRate', headerName: 'Tevkifat (%)', editable: p => !this.readonly(), minWidth: 110, type: 'rightAligned' },
    {
      headerName: 'Net',
      editable: false,
      minWidth: 110,
      type: 'rightAligned',
      valueGetter: (p) => this.readonly() ? (p.data?.net ?? '') : this.preview(p.data).net
    },
    {
      headerName: 'KDV',
      editable: false,
      minWidth: 100,
      type: 'rightAligned',
      valueGetter: (p) => this.readonly() ? (p.data?.vat ?? '') : this.preview(p.data).vat
    },
    {
      headerName: 'Genel Toplam',
      editable: false,
      minWidth: 130,
      type: 'rightAligned',
      valueGetter: (p) => this.readonly() ? (p.data?.grandTotal ?? '') : this.preview(p.data).grandTotal
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
      { id: 0, _cid: `c${this._cidSeq++}`, itemId: null, qty: '1', unitPrice: '0', vatRate: 20, discountRate: null, withholdingRate: null, net: null, vat: null, grandTotal: null },
      ...this.rowData
    ];
  }

  private validateLines(): string | null {
    if (this.rowData.length === 0) return 'En az bir satır eklemelisiniz.';
    for (const l of this.rowData) {
      if (!l.itemId || l.itemId <= 0) return 'Her satırda geçerli bir ürün seçilmelidir.';
      if (!l.qty || Number(l.qty.toString().replace(',', '.')) <= 0) return 'Miktar 0’dan büyük olmalıdır.';
      if (l.unitPrice == null || Number(l.unitPrice.toString().replace(',', '.')) < 0) return 'Birim fiyat negatif olamaz.';
      const vat = Number(l.vatRate ?? 0);
      if (vat < 0 || vat > 100) return 'KDV oranı 0-100 arasında olmalıdır.';
      const disc = l.discountRate != null ? Number(l.discountRate.toString().replace(',', '.')) : 0;
      if (disc < 0 || disc > 100) return 'İskonto oranı 0-100 arasında olmalıdır.';
      const wh = Number(l.withholdingRate ?? 0);
      if (wh < 0 || wh > 100) return 'Tevkifat oranı 0-100 arasında olmalıdır.';
    }
    return null;
  }

  onSave() {
    if (this.readonly()) return;
    const err = this.validateLines();
    this.formError.set(err);
    if (err) return;

    const h = this.form.getRawValue();

    const normalize = (v: string | null | undefined): string => {
      const s = (v ?? '0').toString().replace(',', '.').trim();
      return s === '' ? '0' : s;
    };

    const waybillDateUtc = this.dateInputToUtcIso(h.waybillDateUtc);
    const paymentDueDateUtc = this.dateInputToUtcIso(h.paymentDueDateUtc);

    const bodyLines = this.rowData.map(l => ({
      id: l.id ?? 0,
      itemId: l.itemId!,
      qty: l.qty ?? '0',
      unitPrice: l.unitPrice ?? '0',
      vatRate: Number(l.vatRate ?? 0),
      discountRate: l.discountRate != null ? normalize(l.discountRate) : null,
      withholdingRate: l.withholdingRate ?? null
    }));

    if (this.mode === 'insert') {
      const createLines = this.rowData.map(l => ({
        id: 0,
        itemId: Number(l.itemId ?? 0),      // ItemId: int (BE dto da int)
        qty: normalize(l.qty),              // ⬅️ string, BE decimal.TryParse
        unitPrice: normalize(l.unitPrice),  // ⬅️ string, BE decimal.TryParse
        vatRate: Number(l.vatRate ?? 0),
        discountRate: l.discountRate != null ? normalize(l.discountRate) : null,
        withholdingRate: l.withholdingRate ?? null
      }));

      this.saveInsert.emit({
        contactId: h.contactId!,
        dateUtc: this.localToUtcIso(h.dateUtc),
        currency: h.currency,
        type: this.typeToNumber(h.type),
        documentType: h.documentType,
        waybillNumber: h.waybillNumber || null,
        waybillDateUtc,
        paymentDueDateUtc,
        lines: createLines as any
      } as any);
    } else {
      this.saveUpdate.emit({
        id: this._id!,
        rowVersionBase64: h.rowVersionBase64,
        contactId: h.contactId!,
        dateUtc: this.localToUtcIso(h.dateUtc),
        currency: h.currency,
        type: this.typeToNumber(h.type),
        documentType: h.documentType,
        waybillNumber: h.waybillNumber || null,
        waybillDateUtc,
        paymentDueDateUtc,
        lines: bodyLines
      } as any);
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

  toDateInputValue(isoUtc?: string | null): string | null {
    if (!isoUtc) return null;
    // <input type="date"> "YYYY-MM-DD" bekliyor
    return isoUtc.slice(0, 10);
  }

  dateInputToUtcIso(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    return new Date(`${dateStr}T00:00:00Z`).toISOString();
  }

  // Backend'e InvoiceType her zaman sayı olarak gitmeli (System.Text.Json enum'ları
  // varsayılan olarak sayı bekler, JsonStringEnumConverter kayıtlı değil) — normalizeType'ın
  // tam tersi. Bunsuz form 'Sales' gibi bir string gönderiyordu ve backend bunu
  // InvoiceType'a çeviremediği için hem oluşturma hem güncelleme her zaman 400 dönüyordu.
  private typeToNumber(val: InvoiceTypeStr | number): number {
    if (typeof val === 'number') return val;
    switch (val) {
      case 'Sales': return 1;
      case 'Purchase': return 2;
      case 'SalesReturn': return 3;
      case 'PurchaseReturn': return 4;
      default: return 1;
    }
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

  private preview(row?: { qty?: string | null; unitPrice?: string | null; vatRate?: number | null; discountRate?: string | null; withholdingRate?: number | null }) {
    const { net, vat, grandTotal } = calculateInvoiceLine({
      qty: row?.qty ?? 0,
      unitPrice: row?.unitPrice ?? 0,
      vatRate: Number(row?.vatRate ?? 0),
      discountRate: row?.discountRate ?? null,
      withholdingRate: row?.withholdingRate ?? null
    });

    return { net, vat, grandTotal };
  }
}
