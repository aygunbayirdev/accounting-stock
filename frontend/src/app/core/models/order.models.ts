/**
 * Order Models (Siparişler/Teklifler)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Orders.Dto.OrderDto
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum OrderStatus {
  Draft = 1,        // Taslak / Teklif aşaması
  Approved = 2,     // Onaylandı / Sipariş kesinleşti
  Invoiced = 3,     // Faturalandı / Tamamlandı
  Cancelled = 9     // İptal edildi
}

export type OrderStatusStr = 'Draft' | 'Approved' | 'Invoiced' | 'Cancelled';

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Order Line DTO (Read)
 * Backend: OrderLineDto
 */
export interface OrderLineDto {
  id: number;
  itemId?: number | null;
  itemName?: string | null;
  description: string;
  quantity: string;                 // F3 - Money string
  unitPrice: string;                // F4 - Money string
  vatRate: number;
  total: string;                    // F2 - Money string
}

/**
 * Order DTO (Read)
 * Backend: OrderDto
 */
export interface OrderDto {
  id: number;
  branchId: number;
  orderNumber: string;
  contactId: number;
  contactName: string;
  dateUtc: string;                  // ISO-8601 UTC
  status: OrderStatus;
  totalNet: string;                 // F2 - Money string
  totalVat: string;                 // F2 - Money string
  totalGross: string;               // F2 - Money string
  currency: string;
  description?: string | null;
  lines: OrderLineDto[];
  createdAtUtc: string;             // ISO-8601 UTC
  rowVersion: string;               // Base64
}

/**
 * Order List Item DTO
 */
export interface OrderListItemDto {
  id: number;
  branchId: number;
  orderNumber: string;
  contactId: number;
  contactName: string;
  dateUtc: string;                  // ISO-8601 UTC
  status: OrderStatus;
  totalGross: string;               // F2 - Money string
  currency: string;
  createdAtUtc: string;             // ISO-8601 UTC
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Orders Query Parameters
 * Backend: ListOrdersQuery
 */
export interface ListOrdersQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "dateUtc:desc", "totalGross:asc"
  branchId?: number | null;
  contactId?: number | null;
  status?: OrderStatus | null;
  dateFromUtc?: string | null;      // ISO-8601 UTC
  dateToUtc?: string | null;        // ISO-8601 UTC
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Order Line Body
 */
export interface CreateOrderLineBody {
  id: 0;                            // Always 0 for new
  itemId?: number | null;
  description: string;
  quantity: string;                 // Money string (dot separator!)
  unitPrice: string;                // Money string (dot separator!)
  vatRate: number;
}

/**
 * Update Order Line Body
 */
export interface UpdateOrderLineBody {
  id: number;                       // Existing line ID or 0 for new
  itemId?: number | null;
  description: string;
  quantity: string;                 // Money string (dot separator!)
  unitPrice: string;                // Money string (dot separator!)
  vatRate: number;
}

/**
 * Create Order Body
 * Backend: CreateOrderCommand
 */
export interface CreateOrderBody {
  branchId: number;
  orderNumber: string;
  contactId: number;
  dateUtc: string;                  // ISO-8601 UTC
  status: OrderStatus;
  currency: string;
  description?: string | null;
  lines: CreateOrderLineBody[];
}

/**
 * Update Order Body
 * Backend: UpdateOrderCommand
 */
export interface UpdateOrderBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  branchId: number;
  orderNumber: string;
  contactId: number;
  dateUtc: string;                  // ISO-8601 UTC
  status: OrderStatus;
  currency: string;
  description?: string | null;
  lines: UpdateOrderLineBody[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Get order status display name (Turkish)
 */
export function getOrderStatusDisplayName(status: OrderStatus): string {
  const names: Record<OrderStatus, string> = {
    [OrderStatus.Draft]: 'Taslak',
    [OrderStatus.Approved]: 'Onaylandı',
    [OrderStatus.Invoiced]: 'Faturalandı',
    [OrderStatus.Cancelled]: 'İptal'
  };
  return names[status] || 'Bilinmeyen';
}

/**
 * Get order status color
 */
export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    [OrderStatus.Draft]: '#9E9E9E',       // Gray
    [OrderStatus.Approved]: '#2196F3',    // Blue
    [OrderStatus.Invoiced]: '#4CAF50',    // Green
    [OrderStatus.Cancelled]: '#F44336'    // Red
  };
  return colors[status] || '#9E9E9E';
}
