/**
 * Cheques Service
 * Backend: ChequesController
 * @see Accounting.Api.Controllers.ChequesController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateChequeBody,
  EndorseChequeBody
} from '../models/cheque.models';

@Injectable({ providedIn: 'root' })
export class ChequesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/cheques`;

  /**
   * POST /api/cheques
   */
  create(body: CreateChequeBody): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.baseUrl, body);
  }

  /**
   * PUT /api/cheques/{id}/status
   */
  updateStatus(id: number, status: string, rowVersionBase64: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/status`, { status, rowVersionBase64 });
  }

  /**
   * POST /api/cheques/{id}/endorse
   */
  endorse(id: number, body: EndorseChequeBody): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/endorse`, body);
  }
}
