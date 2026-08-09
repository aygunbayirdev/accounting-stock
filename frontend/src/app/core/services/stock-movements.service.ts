/**
 * Stock Movements Service
 * Backend: StockMovementsController + StockTransfersController
 * @see Accounting.Api.Controllers.StockMovementsController
 * @see Accounting.Api.Controllers.StockTransfersController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StockMovementDto,
  ListStockMovementsQuery,
  CreateStockMovementBody,
  TransferStockBody
} from '../models/stock-movement.models';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class StockMovementsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/stock-movements`;
  private transferUrl = `${environment.apiBaseUrl}/stock-transfers`;

  /**
   * POST /api/stock-movements
   */
  create(body: CreateStockMovementBody): Observable<StockMovementDto> {
    return this.http.post<StockMovementDto>(this.baseUrl, body);
  }

  /**
   * GET /api/stock-movements/{id}
   */
  getById(id: number): Observable<StockMovementDto> {
    return this.http.get<StockMovementDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/stock-movements
   */
  list(query: ListStockMovementsQuery = {}): Observable<PagedResult<StockMovementDto>> {
    let params = new HttpParams();
    if (query.branchId != null) params = params.set('branchId', query.branchId.toString());
    if (query.warehouseId != null) params = params.set('warehouseId', query.warehouseId.toString());
    if (query.itemId != null) params = params.set('itemId', query.itemId.toString());
    if (query.type != null) params = params.set('type', query.type.toString());
    if (query.dateFromUtc) params = params.set('dateFromUtc', query.dateFromUtc);
    if (query.dateToUtc) params = params.set('dateToUtc', query.dateToUtc);
    if (query.pageNumber) params = params.set('page', query.pageNumber.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<PagedResult<StockMovementDto>>(this.baseUrl, { params });
  }

  /**
   * POST /api/stock-transfers
   * Transfer stock between warehouses
   */
  transfer(body: TransferStockBody): Observable<void> {
    return this.http.post<void>(this.transferUrl, body);
  }
}
