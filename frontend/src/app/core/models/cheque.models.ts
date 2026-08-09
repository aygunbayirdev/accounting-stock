/**
 * Cheque Models (Çek/Senet)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Cheques.Queries.Dto.ChequeDetailDto
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ChequeType {
  Cheque = 1,           // Çek
  PromissoryNote = 2    // Senet
}

export type ChequeTypeStr = 'Cheque' | 'PromissoryNote';

export enum ChequeDirection {
  Inbound = 1,          // Müşteriden alınan (Giriş)
  Outbound = 2          // Tedarikçiye verilen / Kendi evrakımız (Çıkış)
}

export type ChequeDirectionStr = 'Inbound' | 'Outbound';

export enum ChequeStatus {
  Pending = 1,          // Portföyde / Bekliyor
  Paid = 2,             // Tahsil edildi / Ödendi
  Endorsed = 3,         // Ciro edildi (Sadece Inbound için)
  Bounced = 4,          // Karşılıksız / Protestolu
  Cancelled = 5         // İptal / İade
}

export type ChequeStatusStr = 'Pending' | 'Paid' | 'Endorsed' | 'Bounced' | 'Cancelled';

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Cheque Detail DTO (Read)
 * Backend: ChequeDetailDto
 */
export interface ChequeDetailDto {
  id: number;
  branchId: number;
  chequeNumber: string;
  type: string;                     // "Cheque" | "PromissoryNote"
  amount: string;                   // F2 - Money string
  dueDateUtc: string;               // ISO-8601 UTC (Vade tarihi)
  drawerName?: string | null;       // Keşideci / Borçlu adı
  bankName?: string | null;         // Banka adı (sadece çek için)
  status: string;                   // ChequeStatus enum as string
  createdAtUtc: string;             // ISO-8601 UTC
}

/**
 * Cheque List Item DTO (Same as detail for now)
 */
export type ChequeListItemDto = ChequeDetailDto;

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Cheques Query Parameters
 * Backend: ListChequesQuery
 */
export interface ListChequesQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "dueDateUtc:asc", "amount:desc"
  branchId?: number | null;
  type?: ChequeType | null;
  direction?: ChequeDirection | null;
  status?: ChequeStatus | null;
  dueDateFromUtc?: string | null;   // ISO-8601 UTC
  dueDateToUtc?: string | null;     // ISO-8601 UTC
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Cheque Body
 * Backend: CreateChequeCommand
 */
export interface CreateChequeBody {
  branchId: number;
  chequeNumber: string;
  type: ChequeType;
  direction: ChequeDirection;
  amount: string;                   // Money string (dot separator!)
  dueDateUtc: string;               // ISO-8601 UTC
  drawerName?: string | null;
  bankName?: string | null;
  contactId?: number | null;        // İlişkili cari
}

/**
 * Update Cheque Body
 * Backend: UpdateChequeCommand
 */
export interface UpdateChequeBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  branchId: number;
  chequeNumber: string;
  type: ChequeType;
  direction: ChequeDirection;
  amount: string;                   // Money string (dot separator!)
  dueDateUtc: string;               // ISO-8601 UTC
  drawerName?: string | null;
  bankName?: string | null;
  status: ChequeStatus;
}

/**
 * Endorse Cheque Body
 * Backend: EndorseChequeCommand
 */
export interface EndorseChequeBody {
  chequeId: number;
  endorseeContactId: number;        // Ciro edilen kişi/firma
  endorsementDateUtc: string;       // ISO-8601 UTC
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Get cheque type display name (Turkish)
 */
export function getChequeTypeDisplayName(type: string): string {
  return type === 'PromissoryNote' ? 'Senet' : 'Çek';
}

/**
 * Get cheque direction display name (Turkish)
 */
export function getChequeDirectionDisplayName(direction: string): string {
  return direction === 'Inbound' ? 'Gelen' : 'Giden';
}

/**
 * Get cheque status display name (Turkish)
 */
export function getChequeStatusDisplayName(status: string): string {
  const names: Record<string, string> = {
    'Pending': 'Beklemede',
    'Paid': 'Ödendi',
    'Endorsed': 'Ciro Edildi',
    'Bounced': 'Karşılıksız',
    'Cancelled': 'İptal'
  };
  return names[status] || 'Bilinmeyen';
}

/**
 * Get cheque status color
 */
export function getChequeStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Pending': '#FF9800',     // Orange
    'Paid': '#4CAF50',        // Green
    'Endorsed': '#2196F3',    // Blue
    'Bounced': '#F44336',     // Red
    'Cancelled': '#9E9E9E'    // Gray
  };
  return colors[status] || '#9E9E9E';
}
