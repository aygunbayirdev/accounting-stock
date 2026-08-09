import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef } from 'ag-grid-community';
import { FormsModule } from '@angular/forms';

import { ListGridComponent } from '../../shared/list-grid/list-grid.component';
import { FixedAssetsService } from '../../core/services/fixed-assets.service';
import {
  FixedAssetListItemDto,
  ListFixedAssetsQuery
} from '../../core/models/fixed-asset.models';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-fixed-assets-page',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    ListGridComponent
  ],
  template: `
    <div class="toolbar">
      <span class="title">Filtreler</span>
      <span class="spacer"></span>
    </div>

    <!-- Basit Filtre Alanları -->
    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Ara (Kod / Ad)</mat-label>
        <input
          matInput
          [(ngModel)]="filters.search"
          placeholder="">
      </mat-form-field>

      <button mat-stroked-button (click)="apply()">Uygula</button>
      <button mat-button (click)="reset()">Sıfırla</button>
    </div>

    <app-list-grid
      #grid
      title="Demirbaşlar"
      [columns]="colDefs"
      [sortWhitelist]="sortWhitelist"
      [fetcher]="fetcher">
    </app-list-grid>
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0; }
    .title { font-weight:600; }
    .spacer { flex:1; }
    .filters {
      display:flex;
      flex-wrap:wrap;
      gap:12px;
      align-items:center;
    }
  `]
})
export class FixedAssetsPageComponent {
  // Şimdilik BE tarafında dinamik sort parametresi yok → server-side sort kullanmıyoruz.
  // Bu nedenle whitelist'i boş bıraktım ve colDef'lerde sortable:false kullandım.
  sortWhitelist: string[] = [];

  colDefs: ColDef<FixedAssetListItemDto>[] = [
    { field: 'code', headerName: 'Kod', sortable: false, minWidth: 120 },
    { field: 'name', headerName: 'Ad', sortable: false, minWidth: 180 },
    {
      field: 'purchaseDateUtc',
      headerName: 'Alış Tarihi',
      sortable: false,
      minWidth: 140,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : ''
    },
    {
      field: 'purchasePrice',
      headerName: 'Alış Tutarı',
      sortable: false,
      type: 'rightAligned',
      minWidth: 140
    },
    {
      field: 'usefulLifeYears',
      headerName: 'Faydalı Ömür (Yıl)',
      sortable: false,
      type: 'rightAligned',
      minWidth: 160
    },
    {
      field: 'depreciationRatePercent',
      headerName: 'Amortisman Oranı (%)',
      sortable: false,
      type: 'rightAligned',
      minWidth: 180
    }
  ];

  // Basit filtre state
  filters: {
    search: string | null;
    includeDeleted: boolean;
  } = {
    search: null,
    includeDeleted: false
  };

  @ViewChild('grid')
  grid!: ListGridComponent<FixedAssetListItemDto>;

  constructor(private service: FixedAssetsService) {}

  // ListGrid’e verilecek fetcher — grid page bilgisiyle birlikte filtreleri geçiriyoruz
  fetcher = (q: { pageNumber?: number; pageSize?: number; sort?: string }) => {
  const request: ListFixedAssetsQuery = {
    pageNumber: q.pageNumber,
    pageSize: q.pageSize,
    search: (this.filters.search ?? '').trim() || null,
    includeDeleted: this.filters.includeDeleted
  };

  return this.service.list(request);
};


  apply() {
    this.grid.reload();
  }

  reset() {
    this.filters = {
      search: null,
      includeDeleted: false
    };
    this.grid.reload();
  }
}
