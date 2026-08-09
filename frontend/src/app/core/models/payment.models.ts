/**
 * Payment Models (Tahsilat/Tediye)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Payments.Queries.Dto.PaymentDtos
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentDirection {
  In = 1,       // Tahsilat (Gelen)
  Out = 2       // Ödeme (Giden)
}

export type PaymentDirectionStr = 'In' | 'Out';

export enum PaymentDirectionFilter {
  Any = 0,
  In = 1,
  Out = 2
}

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Payment List Item DTO (Read)
 * Backend: PaymentListItemDto
 */
export interface PaymentListItemDto {
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  contactId?: number | null;
  contactCode?: string | null;
  contactName?: string | null;
  linkedInvoiceId?: number | null;
  dateUtc: string;                  // ISO-8601 UTC
  direction: string;                // "In" | "Out"
  amount: string;                   // F2 - Money string
  currency: string;
  createdAtUtc: string;             // ISO-8601 UTC
}

/**
 * Payment Detail DTO (Read)
 * Backend: PaymentDetailDto
 */
export interface PaymentDetailDto {
  id: number;
  accountId: number;
  contactId?: number | null;
  linkedInvoiceId?: number | null;
  dateUtc: string;                  // ISO-8601 UTC
  direction: string;                // "In" | "Out"
  amount: string;                   // F2 - Money string
  currency: string;
  rowVersion: string;               // Base64
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;     // ISO-8601 UTC
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Payments Query Parameters
 * Backend: ListPaymentsQuery
 */
export interface ListPaymentsQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "dateUtc:desc", "amount:asc"
  direction?: PaymentDirectionFilter;
  accountId?: number | null;
  contactId?: number | null;
  dateFromUtc?: string | null;      // ISO-8601 UTC
  dateToUtc?: string | null;        // ISO-8601 UTC
  currency?: string | null;
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Payment Body
 * Backend: CreatePaymentCommand
 */
export interface CreatePaymentBody {
  accountId: number;
  contactId?: number | null;
  linkedInvoiceId?: number | null;
  dateUtc: string;                  // ISO-8601 UTC
  direction: PaymentDirection | PaymentDirectionStr;
  amount: string;                   // Money string (dot separator!)
  currency: string;
  description?: string | null;
}

/**
 * Update Payment Body
 * Backend: UpdatePaymentCommand
 */
export interface UpdatePaymentBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  accountId: number;
  contactId?: number | null;
  linkedInvoiceId?: number | null;
  dateUtc: string;                  // ISO-8601 UTC
  direction: PaymentDirection | PaymentDirectionStr;
  amount: string;                   // Money string (dot separator!)
  currency: string;
  description?: string | null;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Payment direction to string conversion
 */
export function paymentDirectionToString(direction: number): PaymentDirectionStr {
  return direction === PaymentDirection.Out ? 'Out' : 'In';
}

/**
 * Payment direction to number conversion
 */
export function paymentDirectionToNumber(direction: PaymentDirectionStr): PaymentDirection {
  return direction === 'Out' ? PaymentDirection.Out : PaymentDirection.In;
}

/**
 * Get payment direction display name (Turkish)
 */
export function getPaymentDirectionDisplayName(direction: string | number): string {
  const dirStr = typeof direction === 'number' ? paymentDirectionToString(direction) : direction;
  return dirStr === 'In' ? 'Tahsilat' : 'Ödeme';
}

/**
 * Get payment direction color
 */
export function getPaymentDirectionColor(direction: string | number): string {
  const dirStr = typeof direction === 'number' ? paymentDirectionToString(direction) : direction;
  return dirStr === 'In' ? '#4CAF50' : '#F44336'; // Green / Red
}
