import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { AG_THEME } from '../../core/ag-grid/ag-theme';
import {
  ColDef, GridApi, GridOptions, GridReadyEvent,
  ColumnState
} from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';

export interface PagedResult<T> { items: T[]; total: number; }
export interface ListQuery { pageNumber?: number; pageSize?: number; sort?: string; }

@Component({
  standalone: true,
  selector: 'app-list-grid',
  imports: [CommonModule, AgGridAngular, MatButtonModule],
  template: `
    <div class="page">
      <div class="toolbar">
        <span class="title">{{ title }}</span>
        <span class="spacer"></span>
        <button mat-stroked-button (click)="reload()">Yenile</button>
      </div>

      <div class="grid-host">
        <ag-grid-angular
          [theme]="AG_THEME"
          [rowData]="rows()"
          [columnDefs]="columns"
          [gridOptions]="gridOptions"
          (gridReady)="onGridReady($event)"
          (sortChanged)="onSortChanged()"
        ></ag-grid-angular>
      </div>

      <div class="pager">
        <button mat-button (click)="prevPage()" [disabled]="pageNumber()===1">Önceki</button>
        <span>Sayfa {{pageNumber()}}</span>
        <button mat-button (click)="nextPage()" [disabled]="!hasMore()">Sonraki</button>
      </div>
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; gap:12px; }
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; }
    .spacer { flex:1; }
    .pager { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
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

  pageNumber = signal(1);
  pageSize = signal(this.pageSizeInit);
  sortModel = signal<{ colId: string; sort: 'asc'|'desc' }[] | null>(null);

  rows = signal<T[]>([]);
  total = signal(0);
  hasMore = computed(() => this.pageNumber() * this.pageSize() < this.total());

  private api!: GridApi<T>;

  gridOptions: GridOptions<T> = {
    defaultColDef: { resizable: true, filter: false, minWidth: 120 },
    animateRows: true,
    columnTypes: {
      rightAligned: { cellClass: 'ag-right-aligned-cell' }
    }
  };

  ngOnInit(): void { this.load(); }

  onGridReady(e: GridReadyEvent<T>) { this.api = e.api; }

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
    this.fetcher({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      sort: sortParam || undefined
    }).subscribe(res => {
      this.rows.set(res.items ?? []);
      this.total.set(res.total ?? 0);
    });
  }
}
