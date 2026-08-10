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

// ========== Contact Statement (Cari Ekstre) ==========

export interface ContactStatementLineDto {
  dateUtc: string;
  type: string; // "DEVİR" | "Satış Faturası" | "Alış Faturası" | "Tahsilat" | "Ödeme" | ...
  documentNo: string;
  description: string;
  debt: string;    // Borç
  credit: string;  // Alacak
  balance: string; // Running balance
}

export interface ContactStatementDto {
  contactId: number;
  contactName: string;
  items: ContactStatementLineDto[];
}
