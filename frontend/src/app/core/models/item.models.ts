/**
 * Item Models (Ürün/Hizmet Kartları)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Items.Queries.Dto.ItemDtos
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ItemType {
  Inventory = 1,    // Stoklu ürün (fiziksel)
  Service = 2       // Hizmet (stok takibi yok)
}

export type ItemTypeStr = 'Inventory' | 'Service';

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Item List Item DTO (Read)
 * Backend: ItemListItemDto
 */
export interface ItemListItemDto {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  code: string;
  name: string;
  unit: string;                     // "Adet", "Kg", "Litre"
  vatRate: number;                  // KDV oranı (0-100)
  purchasePrice?: string | null;    // F2 - Money string (Alış fiyatı)
  salesPrice?: string | null;       // F2 - Money string (Satış fiyatı)
  createdAtUtc: string;             // ISO-8601 UTC
}

/**
 * Item Detail DTO (Read)
 * Backend: ItemDetailDto
 */
export interface ItemDetailDto {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  code: string;
  name: string;
  unit: string;
  vatRate: number;
  purchasePrice?: string | null;    // F2 - Money string
  salesPrice?: string | null;       // F2 - Money string
  rowVersion: string;               // Base64
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;     // ISO-8601 UTC
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Items Query Parameters
 * Backend: ListItemsQuery
 */
export interface ListItemsQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "name:asc", "code:desc", "price:asc"
  search?: string | null;           // Name or code search
  categoryId?: number | null;
  unit?: string | null;
  vatRate?: number | null;
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Item Body
 * Backend: CreateItemCommand
 */
export interface CreateItemBody {
  branchId: number;
  categoryId?: number | null;
  code: string;
  name: string;
  type: ItemType | ItemTypeStr;
  unit: string;
  vatRate: number;
  purchasePrice?: string | null;    // Money string (dot separator!)
  salesPrice?: string | null;       // Money string (dot separator!)
}

/**
 * Update Item Body
 * Backend: UpdateItemCommand
 */
export interface UpdateItemBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  branchId: number;
  categoryId?: number | null;
  code: string;
  name: string;
  type: ItemType | ItemTypeStr;
  unit: string;
  vatRate: number;
  purchasePrice?: string | null;    // Money string (dot separator!)
  salesPrice?: string | null;       // Money string (dot separator!)
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Item type to string conversion
 */
export function itemTypeToString(type: number): ItemTypeStr {
  return type === ItemType.Service ? 'Service' : 'Inventory';
}

/**
 * Item type to number conversion
 */
export function itemTypeToNumber(type: ItemTypeStr): ItemType {
  return type === 'Service' ? ItemType.Service : ItemType.Inventory;
}
