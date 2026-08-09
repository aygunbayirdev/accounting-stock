/**
 * Roles Service
 * Backend: RolesController
 * @see Accounting.Api.Controllers.RolesController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RoleListItemDto,
  RoleDetailDto,
  ListRolesQuery,
  CreateRoleBody,
  UpdateRoleBody
} from '../models/role.models';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/roles`;

  /**
   * POST /api/roles
   */
  create(body: CreateRoleBody): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.baseUrl, body);
  }

  /**
   * GET /api/roles/{id}
   */
  getById(id: number): Observable<RoleDetailDto> {
    return this.http.get<RoleDetailDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/roles
   */
  list(query: ListRolesQuery = {}): Observable<PagedResult<RoleListItemDto>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.pageNumber) params = params.set('pageNumber', query.pageNumber.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<PagedResult<RoleListItemDto>>(this.baseUrl, { params });
  }

  /**
   * PUT /api/roles/{id}
   */
  update(id: number, body: UpdateRoleBody): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * DELETE /api/roles/{id}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
