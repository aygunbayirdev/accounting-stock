/**
 * Cash Bank Accounts Service
 * Backend: CashBankAccountsController
 * @see Accounting.Api.Controllers.CashBankAccountsController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CashBankAccountListItemDto,
  CashBankAccountDetailDto,
  ListCashBankAccountsQuery,
  CreateCashBankAccountBody,
  UpdateCashBankAccountBody
} from '../models/cash-bank-account.models';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class CashBankAccountsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/cash-bank-accounts`;

  /**
   * POST /api/cash-bank-accounts
   */
  create(body: CreateCashBankAccountBody): Observable<CashBankAccountDetailDto> {
    return this.http.post<CashBankAccountDetailDto>(this.baseUrl, body);
  }

  /**
   * GET /api/cash-bank-accounts/{id}
   */
  getById(id: number): Observable<CashBankAccountDetailDto> {
    return this.http.get<CashBankAccountDetailDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/cash-bank-accounts
   */
  list(query: ListCashBankAccountsQuery = {}): Observable<PagedResult<CashBankAccountListItemDto>> {
    let params = new HttpParams();
    if (query.type != null) params = params.set('type', query.type.toString());
    if (query.branchId != null) params = params.set('branchId', query.branchId.toString());
    if (query.pageNumber) params = params.set('page', query.pageNumber.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<PagedResult<CashBankAccountListItemDto>>(this.baseUrl, { params });
  }

  /**
   * PUT /api/cash-bank-accounts/{id}
   */
  update(id: number, body: UpdateCashBankAccountBody): Observable<CashBankAccountDetailDto> {
    return this.http.put<CashBankAccountDetailDto>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * DELETE /api/cash-bank-accounts/{id}
   */
  delete(id: number, rowVersionBase64: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      body: { id, rowVersionBase64 }
    });
  }
}
