/**
 * Item Models (Ürün/Hizmet/Gider/Demirbaş Kartları)
 *
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Items.Queries.Dto.ItemDtos
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ItemType {
  Inventory = 1,    // Stoklu ürün (fiziksel)
  Service = 2,       // Hizmet (stok takibi yok)
  Expense = 3,        // Gider
  FixedAsset = 4       // Demirbaş
}

export const ItemTypeNames: Record<ItemType, string> = {
  [ItemType.Inventory]: 'Stoklu Ürün',
  [ItemType.Service]: 'Hizmet',
  [ItemType.Expense]: 'Gider',
  [ItemType.FixedAsset]: 'Demirbaş'
};

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
  type: number;                     // ItemType enum (1-4)
  unit: string;                     // "Adet", "Kg", "Litre"
  vatRate: number;                  // KDV oranı (0-100)
  defaultWithholdingRate: number;   // Varsayılan tevkifat oranı (0-100)
  purchasePrice?: string | null;    // F2 - Money string (Alış fiyatı)
  salesPrice?: string | null;       // F2 - Money string (Satış fiyatı)
  purchaseAccountCode?: string | null;
  salesAccountCode?: string | null;
  usefulLifeYears?: number | null;  // Demirbaş faydalı ömür (yıl)
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;
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
  type: number;
  unit: string;
  vatRate: number;
  defaultWithholdingRate: number;
  purchasePrice?: string | null;
  salesPrice?: string | null;
  purchaseAccountCode?: string | null;
  salesAccountCode?: string | null;
  usefulLifeYears?: number | null;
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
 * Backend: CreateItemCommand — DİKKAT: BranchId yok (Item global/branch-agnostic bir master data).
 */
export interface CreateItemBody {
  categoryId?: number | null;
  code: string;
  name: string;
  type: number;                     // ItemType enum — SAYI olarak gönderilmeli (JsonStringEnumConverter yok)
  unit: string;
  vatRate: number;
  defaultWithholdingRate?: number | null;
  purchasePrice?: string | null;    // Money string (nokta ayraç!)
  salesPrice?: string | null;       // Money string (nokta ayraç!)
  purchaseAccountCode?: string | null;
  salesAccountCode?: string | null;
  usefulLifeYears?: number | null;  // Sadece FixedAsset için anlamlı (1-50)
}

/**
 * Update Item Body
 * Backend: UpdateItemCommand
 */
export interface UpdateItemBody {
  id: number;
  rowVersion: string;                // Required for optimistic concurrency (backend: UpdateItemCommand.RowVersion)
  categoryId?: number | null;
  code: string;
  name: string;
  type: number;
  unit: string;
  vatRate: number;
  defaultWithholdingRate?: number | null;
  purchasePrice?: string | null;
  salesPrice?: string | null;
  purchaseAccountCode?: string | null;
  salesAccountCode?: string | null;
  usefulLifeYears?: number | null;
}
