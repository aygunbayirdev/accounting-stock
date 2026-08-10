/**
 * Reports Models
 * Backend: Accounting.Api.Controllers.ReportsController
 * Backend: Accounting.Application.Reports.Queries.Dtos.DashboardDtos
 */

// ========== Dashboard ==========

export interface CashStatusDto {
  id: number;
  name: string;
  type: string; // "Kasa" | "Banka"
  balance: string; // Money as string (2 decimals)
  currency: string;
}

export interface DashboardStatsDto {
  dailySalesTotal: string;
  dailyCollectionsTotal: string;
  totalReceivables: string;
  totalPayables: string;
  cashStatus: CashStatusDto[];
}
