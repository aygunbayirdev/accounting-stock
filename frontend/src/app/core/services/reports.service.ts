/**
 * Reports Service
 * Backend: ReportsController
 * @see Accounting.Api.Controllers.ReportsController
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardStatsDto } from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/reports`;

  /**
   * GET /api/reports/dashboard
   */
  getDashboard(branchId: number): Observable<DashboardStatsDto> {
    return this.http.get<DashboardStatsDto>(`${this.baseUrl}/dashboard`, {
      params: { branchId }
    });
  }
}
