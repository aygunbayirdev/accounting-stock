/**
 * Users Service
 * Backend: UsersController
 * @see Accounting.Api.Controllers.UsersController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UserListItemDto,
  UserDetailDto,
  ListUsersQuery,
  CreateUserBody,
  UpdateUserBody,
  ChangePasswordBody
} from '../models/user.models';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/users`;

  /**
   * POST /api/users
   */
  create(body: CreateUserBody): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.baseUrl, body);
  }

  /**
   * GET /api/users/{id}
   */
  getById(id: number): Observable<UserDetailDto> {
    return this.http.get<UserDetailDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/users
   */
  list(query: ListUsersQuery = {}): Observable<PagedResult<UserListItemDto>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.isActive != null) params = params.set('isActive', query.isActive.toString());
    if (query.branchId != null) params = params.set('branchId', query.branchId.toString());
    if (query.pageNumber) params = params.set('pageNumber', query.pageNumber.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<PagedResult<UserListItemDto>>(this.baseUrl, { params });
  }

  /**
   * PUT /api/users/{id}
   */
  update(id: number, body: UpdateUserBody): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * DELETE /api/users/{id}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * POST /api/users/change-password
   */
  changePassword(body: ChangePasswordBody): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, body);
  }
}
