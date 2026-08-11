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
import Decimal from 'decimal.js';

import { OrderLineActionsCell } from './order-line-actions.cell';
import { normalizeMoneyInput, formatMoneyString } from '../../core/utils/money.utils';
import { EntityPickerComponent, LookupConfig, PickerOption } from '../../shared/entity-picker/entity-picker.component';
import {
  CONTACT_LOOKUP_COLUMNS, CONTACT_LOOKUP_SORT_WHITELIST, contactToOption,
  ITEM_LOOKUP_COLUMNS, ITEM_LOOKUP_SORT_WHITELIST, itemToOption
} from '../../shared/entity-picker/lookup-configs';
import { ContactsService } from '../../core/services/contacts.service';
import { ContactListItemDto } from '../../core/models/contact.models';
import { ItemsService } from '../../core/services/items.service';
import { ItemListItemDto } from '../../core/models/item.models';
import { OrderType } from '../../core/models/order.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type OrderMode = 'insert' | 'update' | 'view';

export interface EditLine {
  id?: number;
  itemId: number | null;
  itemName?: string | null;
  description: string;
  quantity: string | null;
  unitPrice: string | null;
  vatRate: number | null;
}

export interface OrderFormValue {
  id?: number;
  rowVersionBase64?: string;
  branchId?: number | null;
  contactId: number | null;
  contactName?: string | null;
  dateUtc: string;
  type: OrderType | number;
  currency: string;
  description?: string | null;
  lines: EditLine[];
}

/* ---- Tipli ana form (sadece header) ---- */
type OrderFormGroup = FormGroup<{
  rowVersionBase64: FormControl<string>;
  contactId: FormControl<number | null>;
  dateUtc: FormControl<string>;
  type: FormControl<number>;
  currency: FormControl<string>;
  description: FormControl<string | null>;
  // Satırları formda değil grid’de tutuyoruz; save’de map’liyoruz
}>;

type LineRow = {
  id: number;            // 0 = yeni
  _cid?: string;         // client-temp id (rowId için)
  itemId: number | null;
  itemName?: string | null;
  description: string | null;
  quantity: string | null;
  unitPrice: string | null;
  vatRate: number | null;
};

@Component({
  standalone: true,
  selector: 'app-order-form',
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
        {{ mode === 'insert' ? 'Yeni Sipariş' :
           mode === 'update' ? 'Sipariş Düzenle' : 'Sipariş' }}
      </h2>
      <span class="spacer"></span>
      <button *ngIf="!readonly()" mat-flat-button color="primary" type="submit">
        <mat-icon>save</mat-icon>
        Kaydet
      </button>
    </div>

    <div class="branch-info" *ngIf="branchId">Şube ID: {{ branchId }}</div>
    <div class="branch-info hint" *ngIf="mode === 'insert'">Şube: kaydettiğinizde oturum açan kullanıcının şubesine atanır.</div>

    <!-- HEADER -->
    <div class="form-grid">
      <app-entity-picker
        label="Cari"
        [fetcher]="contactFetcher"
        [lookup]="contactLookup"
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
        <mat-label>Tür</mat-label>
        <mat-select formControlName="type" [disabled]="readonly() || mode === 'update'">
          <mat-option [value]="OrderType.Sales">Satış</mat-option>
          <mat-option [value]="OrderType.Purchase">Alış</mat-option>
          <mat-option [value]="OrderType.SalesReturn">Satış İade</mat-option>
          <mat-option [value]="OrderType.PurchaseReturn">Alış İade</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Para Birimi</mat-label>
        <mat-select formControlName="currency" [disabled]="readonly() || mode === 'update'">
          <mat-option value="TRY">TRY</mat-option>
          <mat-option value="USD">USD</mat-option>
          <mat-option value="EUR">EUR</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="desc-field">
        <mat-label>Açıklama</mat-label>
        <input matInput formControlName="description" [readonly]="readonly()">
      </mat-form-field>
    </div>

    <div class="type-hint" *ngIf="mode === 'update'">Tür ve para birimi oluşturma sonrası değiştirilemez.</div>

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
        [lookup]="itemLookup"
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
    .desc-field { grid-column: span 2; }
    .lines-grid { margin-top:8px; }
    .branch-info { font-size:0.9em; color: var(--mat-sys-on-surface-variant, #666); }
    .branch-info.hint { font-style: italic; }
    .type-hint { font-size:0.85em; font-style: italic; color: var(--mat-sys-on-surface-variant, #666); }
    .lines-error { color: var(--mat-sys-error, #b3261e); font-size: 0.9em; }
    @media (max-width: 900px) {
      .form-grid { grid-template-columns: repeat(2, 1fr); }
      .desc-field { grid-column: span 2; }
    }
  `]
})
export class OrderFormComponent {
  AG_THEME = AG_THEME;
  OrderType = OrderType;
  // bkz. shared/list-grid/list-grid.component.ts'deki aynı isimli alanın yorumu:
  // rAF'a ertelenen ilk-render cellRenderer oluşturmasını senkrona zorluyoruz (line-actions.cell).
  lineGridOptions = { suppressAnimationFrame: true };

  private contactsService = inject(ContactsService);
  private itemsService = inject(ItemsService);

  @Input() mode: OrderMode = 'insert';

  private _id?: number;
  branchId: number | null = null;
  contactLabel: string | null = null;

  @Input() set value(v: OrderFormValue | null) {
    if (!v) return;
    this._id = v.id;
    this.branchId = v.branchId ?? null;
    this.contactLabel = v.contactName ?? null;
    // header
    this.form.patchValue({
      rowVersionBase64: v.rowVersionBase64 ?? '',
      contactId: v.contactId ?? null,
      // ⬇️ datetime-local uyumlu yerel string
      dateUtc: this.toLocalInputValue(v.dateUtc),
      type: this.typeToNumber(v.type),
      currency: v.currency ?? 'TRY',
      description: v.description ?? null
    }, { emitEvent: false });

    // lines → grid rows
    this._cidSeq = 1;
    this.rowData = (v.lines ?? []).map(l => ({
      id: l.id ?? 0,
      _cid: l.id ? undefined : `c${this._cidSeq++}`,
      itemId: l.itemId ?? null,
      itemName: l.itemName ?? null,
      description: l.description ?? null,
      quantity: l.quantity ?? null,
      unitPrice: l.unitPrice ?? null,
      vatRate: l.vatRate ?? null
    }));
  }

  @Output() saveInsert = new EventEmitter<any>();
  @Output() saveUpdate = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  form: OrderFormGroup = this.fb.group({
    rowVersionBase64: this.fb.nonNullable.control<string>(''),
    contactId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    dateUtc: this.fb.nonNullable.control<string>(new Date().toISOString(), { validators: [Validators.required] }),
    type: this.fb.nonNullable.control<number>(OrderType.Sales, { validators: [Validators.required] }),
    currency: this.fb.nonNullable.control<string>('TRY', { validators: [Validators.required] }),
    description: this.fb.control<string | null>(null)
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

  contactLookup: LookupConfig<ContactListItemDto> = {
    title: 'Cari Seç',
    columns: CONTACT_LOOKUP_COLUMNS,
    sortWhitelist: CONTACT_LOOKUP_SORT_WHITELIST,
    searchPlaceholder: 'Kod, ad veya e-posta ile ara...',
    fetcher: (q) => this.contactsService.list(q),
    toOption: contactToOption
  };

  itemLookup: LookupConfig<ItemListItemDto> = {
    title: 'Ürün Seç',
    columns: ITEM_LOOKUP_COLUMNS,
    sortWhitelist: ITEM_LOOKUP_SORT_WHITELIST,
    searchPlaceholder: 'Kod veya ad ile ara...',
    fetcher: (q) => this.itemsService.list(q),
    toOption: itemToOption
  };

  onContactSelected(id: number | null) {
    this.form.patchValue({ contactId: id });
  }

  onItemPicked(itemId: number | null) {
    if (!itemId || this.readonly()) return;
    this.itemsService.getById(itemId).subscribe(item => {
      this.rowData = [
        {
          id: 0, _cid: `c${this._cidSeq++}`,
          itemId: item.id, itemName: item.name,
          description: item.name,
          quantity: '1', unitPrice: item.salesPrice ?? '0', vatRate: item.vatRate
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
    { field: 'itemId', headerName: 'Ürün (ID)', editable: p => !this.readonly(), minWidth: 90, maxWidth: 100 },
    { field: 'itemName', headerName: 'Ürün Adı', editable: false, minWidth: 140 },
    { field: 'description', headerName: 'Açıklama', editable: p => !this.readonly(), minWidth: 180 },
    { field: 'quantity', headerName: 'Miktar', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 100, type: 'rightAligned' },
    { field: 'unitPrice', headerName: 'Birim Fiyat', editable: p => !this.readonly(), valueParser: this.stringNumberParser, minWidth: 120, type: 'rightAligned' },
    { field: 'vatRate', headerName: 'KDV (%)', editable: p => !this.readonly(), minWidth: 100, type: 'rightAligned' },
    {
      headerName: 'Net',
      editable: false,
      minWidth: 110,
      type: 'rightAligned',
      valueGetter: (p) => this.preview(p.data).net
    },
    {
      headerName: 'KDV',
      editable: false,
      minWidth: 100,
      type: 'rightAligned',
      valueGetter: (p) => this.preview(p.data).vat
    },
    {
      headerName: 'Genel Toplam',
      editable: false,
      minWidth: 130,
      type: 'rightAligned',
      valueGetter: (p) => this.preview(p.data).gross
    },
    {
      headerName: '',
      colId: 'actions',
      width: 64,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: OrderLineActionsCell,
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
      { id: 0, _cid: `c${this._cidSeq++}`, itemId: null, itemName: null, description: '', quantity: '1', unitPrice: '0', vatRate: 20 },
      ...this.rowData
    ];
  }

  // Backend: VatRate 0, 1, 10 veya 20 dışında bir değer kabul etmiyor (CreateOrderValidator).
  private readonly allowedVatRates = [0, 1, 10, 20];

  private validateLines(): string | null {
    if (this.rowData.length === 0) return 'En az bir sipariş kalemi eklemelisiniz.';
    for (const l of this.rowData) {
      if (!l.description || !l.description.trim()) return 'Her satırda açıklama girilmelidir.';
      if (!l.quantity || Number(l.quantity.toString().replace(',', '.')) <= 0) return 'Miktar 0’dan büyük olmalıdır.';
      if (l.unitPrice == null || Number(l.unitPrice.toString().replace(',', '.')) < 0) return 'Birim fiyat negatif olamaz.';
      const vat = Number(l.vatRate ?? 0);
      if (!this.allowedVatRates.includes(vat)) return 'KDV oranı 0, 1, 10 veya 20 olmalıdır.';
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

    if (this.mode === 'insert') {
      const createLines = this.rowData.map(l => ({
        itemId: l.itemId ?? null,
        description: (l.description ?? '').trim(),
        quantity: normalize(l.quantity),
        unitPrice: normalize(l.unitPrice),
        vatRate: Number(l.vatRate ?? 0)
      }));

      this.saveInsert.emit({
        contactId: h.contactId!,
        dateUtc: this.localToUtcIso(h.dateUtc),
        type: h.type,
        currency: h.currency,
        description: h.description || null,
        lines: createLines
      });
    } else {
      const updateLines = this.rowData.map(l => ({
        id: l.id && l.id > 0 ? l.id : null,
        itemId: l.itemId ?? null,
        description: (l.description ?? '').trim(),
        quantity: normalize(l.quantity),
        unitPrice: normalize(l.unitPrice),
        vatRate: Number(l.vatRate ?? 0)
      }));

      this.saveUpdate.emit({
        id: this._id!,
        rowVersion: h.rowVersionBase64,
        contactId: h.contactId!,
        dateUtc: this.localToUtcIso(h.dateUtc),
        description: h.description || null,
        lines: updateLines
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

  // Backend'e InvoiceType (Order.Type için yeniden kullanılıyor) her zaman sayı olarak
  // gitmeli (System.Text.Json enum'ları varsayılan olarak sayı bekler, JsonStringEnumConverter
  // kayıtlı değil).
  private typeToNumber(val: OrderType | number): number {
    return typeof val === 'number' ? val : Number(val);
  }

  // Order satırının Net/KDV/Genel Toplam önizlemesi — backend CreateOrderHandler ile
  // aynı formül: lineNet = Quantity × UnitPrice, vatAmount = lineNet × VatRate / 100.
  // Invoice'ın aksine Order'da iskonto/tevkifat yok, bu yüzden calculateInvoiceLine()
  // burada kullanılmıyor.
  private preview(row?: { quantity?: string | null; unitPrice?: string | null; vatRate?: number | null }) {
    const qty = new Decimal(normalizeMoneyInput(row?.quantity ?? 0));
    const unitPrice = new Decimal(normalizeMoneyInput(row?.unitPrice ?? 0));
    const vatRate = new Decimal(row?.vatRate ?? 0);

    const net = qty.times(unitPrice);
    const vat = net.times(vatRate).div(100);
    const gross = net.plus(vat);

    return {
      net: formatMoneyString(net, 2),
      vat: formatMoneyString(vat, 2),
      gross: formatMoneyString(gross, 2)
    };
  }
}
