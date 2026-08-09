/**
 * Fixed Assets Service
 * Backend: FixedAssetsController
 * @see Accounting.Api.Controllers.FixedAssetsController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FixedAssetListItemDto,
  FixedAssetDetailDto,
  ListFixedAssetsQuery,
  CreateFixedAssetBody,
  UpdateFixedAssetBody
} from '../models/fixed-asset.models';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class FixedAssetsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/fixed-assets`;

  /**
   * POST /api/fixed-assets
   */
  create(body: CreateFixedAssetBody): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.baseUrl, body);
  }

  /**
   * GET /api/fixed-assets/{id}
   */
  getById(id: number): Observable<FixedAssetDetailDto> {
    return this.http.get<FixedAssetDetailDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/fixed-assets
   */
  list(query: ListFixedAssetsQuery = {}): Observable<PagedResult<FixedAssetListItemDto>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.includeDeleted) params = params.set('includeDeleted', query.includeDeleted.toString());
    if (query.pageNumber) params = params.set('pageNumber', query.pageNumber.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<PagedResult<FixedAssetListItemDto>>(this.baseUrl, { params });
  }

  /**
   * PUT /api/fixed-assets/{id}
   */
  update(id: number, body: UpdateFixedAssetBody): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * DELETE /api/fixed-assets/{id}
   */
  delete(id: number, rowVersionBase64: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      body: { id, rowVersionBase64 }
    });
  }
}
