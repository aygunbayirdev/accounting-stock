import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { AG_THEME } from '../../core/ag-grid/ag-theme';
import {
  ColDef, GridApi, GridOptions, GridReadyEvent,
  ColumnState, RowDoubleClickedEvent
} from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';

export interface PagedResult<T> { items: T[]; total: number; }
export interface ListQuery { pageNumber?: number; pageSize?: number; sort?: string; }

@Component({
  standalone: true,
  selector: 'app-list-grid',
  imports: [CommonModule, AgGridAngular, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="toolbar">
        <span class="title">{{ title }}</span>
        <span class="spacer"></span>
        <button mat-stroked-button (click)="reload()">Yenile</button>
      </div>

      @if (error()) {
        <div class="list-error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button mat-button (click)="reload()">Tekrar Dene</button>
        </div>
      } @else {
        @if (loading()) {
          <div class="list-loading">
            <mat-spinner diameter="32"></mat-spinner>
          </div>
        }
        <div class="grid-host" [class.hidden]="loading()">
          <ag-grid-angular
            [theme]="AG_THEME"
            [rowData]="rows()"
            [columnDefs]="columns"
            [gridOptions]="gridOptions"
            [context]="context"
            (gridReady)="onGridReady($event)"
            (sortChanged)="onSortChanged()"
            (rowDoubleClicked)="onRowDoubleClicked($event)"
          ></ag-grid-angular>
        </div>

        <div class="pager">
          <button mat-button (click)="prevPage()" [disabled]="pageNumber()===1">Önceki</button>
          <span>Sayfa {{pageNumber()}}</span>
          <button mat-button (click)="nextPage()" [disabled]="!hasMore()">Sonraki</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; gap:12px; }
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; }
    .spacer { flex:1; }
    .pager { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
    .grid-host.hidden { display:none; }
    .list-loading { display:flex; justify-content:center; padding: 48px 0; }
    .list-error {
      display:flex; align-items:center; gap:10px;
      padding: 16px; border-radius: 8px;
      background: rgba(198,40,40,0.08); color: #c62828;
    }
    .list-error span { flex:1; }
  `]
})
export class ListGridComponent<T> implements OnInit {
  AG_THEME = AG_THEME;

  /** Başlık */
  @Input() title = 'Liste';
  /** Kolonlar (whitelist dışındakilere sortable: false ver) */
  @Input({ required: true }) columns!: ColDef<T>[];
  /** Backend sıralama whitelist’i (örn: ['dateUtc','totalNet']) */
  @Input() sortWhitelist: string[] = [];
  /**
   * Sunucudan veri getiren fonksiyon.
   * Örn: (q) => invoicesService.list(q)  // Observable<PagedResult<T>>
   */
  @Input({ required: true }) fetcher!: (q: ListQuery) => Observable<PagedResult<T>>;
  /** Sayfa boyutu opsiyonel */
  @Input() pageSizeInit = 25;
  /** ag-grid cell renderer'ların (örn. entity-actions.cell) erişebileceği context (params.context) */
  @Input() context: any = null;
  /** Bir satıra çift tıklandığında satır verisiyle tetiklenir (örn. lookup dialog seçimi) */
  @Output() rowDoubleClicked = new EventEmitter<T>();

  pageNumber = signal(1);
  pageSize = signal(this.pageSizeInit);
  sortModel = signal<{ colId: string; sort: 'asc'|'desc' }[] | null>(null);

  rows = signal<T[]>([]);
  total = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);
  hasMore = computed(() => this.pageNumber() * this.pageSize() < this.total());

  private api!: GridApi<T>;

  gridOptions: GridOptions<T> = {
    defaultColDef: { resizable: true, filter: false, minWidth: 120 },
    animateRows: true,
    // İlk render'da cellRenderer oluşturma requestAnimationFrame'e ertelenir; sekme arka planda/
    // görünür olmayan bir sekmede ise (örn. headless/otomasyon ortamları) rAF hiç tetiklenmeyebilir
    // ve framework cellRenderer'lar (entity-actions.cell, invoice-actions.cell, line-actions.cell)
    // sonsuza kadar boş kalır. Senkron oluşturmaya zorluyoruz — bu ölçekteki listeler için maliyeti yok.
    suppressAnimationFrame: true,
    overlayNoRowsTemplate: '<span style="padding: 8px 12px; color: rgba(0,0,0,0.6);">Kayıt bulunamadı.</span>',
    columnTypes: {
      rightAligned: { cellClass: 'ag-right-aligned-cell' }
    }
  };

  ngOnInit(): void {
    // pageSize signal'i field initializer'da (constructor sırasında, Angular @Input
    // pageSizeInit'i henüz set etmeden) this.pageSizeInit'in default değeriyle kuruluyor;
    // burada ngOnInit'te (input'lar set edildikten sonra) gerçek değerle senkronluyoruz.
    this.pageSize.set(this.pageSizeInit);
    this.load();
  }

  onGridReady(e: GridReadyEvent<T>) { this.api = e.api; }

  onRowDoubleClicked(e: RowDoubleClickedEvent<T>) {
    if (e.data) this.rowDoubleClicked.emit(e.data);
  }

  onSortChanged() {
    const state = (this.api.getColumnState() ?? []) as ColumnState[];
    const wl = new Set(this.sortWhitelist);
    const model = state
      .filter(s => s.sort && s.colId && wl.has(s.colId))
      .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      .map(s => ({ colId: s.colId!, sort: s.sort! as 'asc'|'desc' }));

    this.sortModel.set(model.length ? model : null);
    this.pageNumber.set(1);
    this.load();
  }

  public reload() { this.load(); }
  nextPage() { if (this.hasMore()) { this.pageNumber.update(p => p + 1); this.load(); } }
  prevPage() { if (this.pageNumber() > 1) { this.pageNumber.update(p => p - 1); this.load(); } }

  private load() {
    const sort = this.sortModel();
    const sortParam = sort?.map(s => `${s.colId}:${s.sort}`).join(',') ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.fetcher({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      sort: sortParam || undefined
    }).subscribe({
      next: res => {
        this.rows.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.error.set('Kayıtlar yüklenirken bir hata oluştu.');
      }
    });
  }
}
