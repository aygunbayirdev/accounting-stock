import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ListGridComponent, ListQuery, PagedResult } from '../list-grid/list-grid.component';

export interface LookupQuery extends ListQuery { search?: string; }

export interface LookupDialogData<T> {
  title: string;
  columns: ColDef<T>[];
  fetcher: (q: LookupQuery) => Observable<PagedResult<T>>;
  sortWhitelist?: string[];
  searchPlaceholder?: string;
  pageSize?: number;
}

/**
 * Genel amaçlı, sayfalama + sunucu taraflı arama destekli seçim dialog'u.
 * Binlerce kayıt olabilecek listelerde (stok kartı, cari, kasa/banka vb.)
 * EntityPickerComponent'in top-N autocomplete'ine ek bir "listeye gözat" yolu sağlar.
 */
@Component({
  standalone: true,
  selector: 'app-lookup-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatIconModule, MatButtonModule, ListGridComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="lookup-content">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Ara</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input
          matInput
          [formControl]="searchControl"
          [placeholder]="data.searchPlaceholder ?? 'Kod veya ad ile ara...'"
          autocomplete="off">
      </mat-form-field>

      <app-list-grid
        #grid
        title=""
        [columns]="data.columns"
        [sortWhitelist]="data.sortWhitelist ?? []"
        [fetcher]="gridFetcher"
        [pageSizeInit]="data.pageSize ?? 10"
        (rowDoubleClicked)="select($event)">
      </app-list-grid>

      <div class="hint">Bir satıra çift tıklayarak seçin.</div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button (click)="dialogRef.close()">Vazgeç</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .lookup-content { width: 100%; display:flex; flex-direction:column; gap:4px; }
    .search-field { width:100%; }
    .hint { font-size:0.8em; color: var(--mat-sys-on-surface-variant, #666); padding: 2px 4px 0; }
  `]
})
export class LookupDialogComponent<T> implements OnInit {
  dialogRef = inject(MatDialogRef<LookupDialogComponent<T>>);
  data = inject<LookupDialogData<T>>(MAT_DIALOG_DATA);

  @ViewChild('grid') grid!: ListGridComponent<T>;

  searchControl = new FormControl('');
  private searchTerm = '';

  gridFetcher = (q: ListQuery) => this.data.fetcher({ ...q, search: this.searchTerm || undefined });

  ngOnInit() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(v => {
        this.searchTerm = (v ?? '').trim();
        this.grid.pageNumber.set(1);
        this.grid.reload();
      });

    // MatDialog'un açılış animasyonu tam bitmeden ag-grid mount olabiliyor; bu durumda
    // ag-grid'in dahili sütun-genişlik modeli, animasyonun nihai (daha geniş) konteyner
    // boyutuyla senkron kalmıyor — sonuç: sütunlar toplamda görünür alandan geniş
    // hesaplanıyor ve satırların tıklanabilir alanı gerçek görsel konumuyla eşleşmiyor.
    // Animasyon bittiğinde (afterOpened) ag-grid'e gerçek konteyner boyutuna göre
    // yeniden ölçmesini söylüyoruz.
    this.dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => this.grid?.sizeColumnsToFit(), 0);
    });
  }

  select(row: T) {
    this.dialogRef.close(row);
  }
}
