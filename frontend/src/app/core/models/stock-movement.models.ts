/**
 * Stock Movement Models (Stok Hareketleri)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.StockMovements.Queries.Dto.StockMovementDtos
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum StockMovementType {
  PurchaseIn = 1,       // Alış / Giriş
  SalesOut = 2,         // Satış / Çıkış
  AdjustmentIn = 3,     // Sayım fazlası
  AdjustmentOut = 4,    // Sayım eksiği
  SalesReturn = 5,      // Satış iadesi (Giriş)
  PurchaseReturn = 6,   // Alış iadesi (Çıkış)
  TransferOut = 7,      // Transfer çıkışı
  TransferIn = 8        // Transfer girişi
}

export type StockMovementTypeStr = 
  | 'PurchaseIn' 
  | 'SalesOut' 
  | 'AdjustmentIn' 
  | 'AdjustmentOut'
  | 'SalesReturn'
  | 'PurchaseReturn'
  | 'TransferOut'
  | 'TransferIn';

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Stock Movement DTO (Read)
 * Backend: StockMovementDto
 */
export interface StockMovementDto {
  id: number;
  branchId: number;
  warehouseId: number;
  warehouseCode: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  unit: string;
  type: StockMovementType;
  quantity: string;                 // F3 - Money string
  transactionDateUtc: string;       // ISO-8601 UTC
  note?: string | null;
  rowVersion: string;               // Base64
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;     // ISO-8601 UTC
}

/**
 * Stock Movement List Item (Same as detail)
 */
export type StockMovementListItemDto = StockMovementDto;

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Stock Movements Query Parameters
 * Backend: ListStockMovementsQuery
 */
export interface ListStockMovementsQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "transactionDateUtc:desc"
  branchId?: number | null;
  warehouseId?: number | null;
  itemId?: number | null;
  type?: StockMovementType | null;
  dateFromUtc?: string | null;      // ISO-8601 UTC
  dateToUtc?: string | null;        // ISO-8601 UTC
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Stock Movement Body
 * Backend: CreateStockMovementCommand
 */
export interface CreateStockMovementBody {
  branchId: number;
  warehouseId: number;
  itemId: number;
  type: StockMovementType;
  quantity: string;                 // Money string (dot separator!)
  transactionDateUtc: string;       // ISO-8601 UTC
  note?: string | null;
}

/**
 * Transfer Stock Body
 * Backend: TransferStockCommand
 */
export interface TransferStockBody {
  fromWarehouseId: number;
  toWarehouseId: number;
  itemId: number;
  quantity: string;                 // Money string (dot separator!)
  transactionDateUtc: string;       // ISO-8601 UTC
  note?: string | null;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Check if movement type is inbound (increases stock)
 */
export function isInboundMovement(type: StockMovementType): boolean {
  return [
    StockMovementType.PurchaseIn,
    StockMovementType.AdjustmentIn,
    StockMovementType.SalesReturn,
    StockMovementType.TransferIn
  ].includes(type);
}

/**
 * Check if movement type is outbound (decreases stock)
 */
export function isOutboundMovement(type: StockMovementType): boolean {
  return [
    StockMovementType.SalesOut,
    StockMovementType.AdjustmentOut,
    StockMovementType.PurchaseReturn,
    StockMovementType.TransferOut
  ].includes(type);
}

/**
 * Get movement type display name (Turkish)
 */
export function getMovementTypeDisplayName(type: StockMovementType): string {
  const names: Record<StockMovementType, string> = {
    [StockMovementType.PurchaseIn]: 'Alış / Giriş',
    [StockMovementType.SalesOut]: 'Satış / Çıkış',
    [StockMovementType.AdjustmentIn]: 'Sayım Fazlası',
    [StockMovementType.AdjustmentOut]: 'Sayım Eksiği',
    [StockMovementType.SalesReturn]: 'Satış İadesi',
    [StockMovementType.PurchaseReturn]: 'Alış İadesi',
    [StockMovementType.TransferOut]: 'Transfer Çıkışı',
    [StockMovementType.TransferIn]: 'Transfer Girişi'
  };
  return names[type] || 'Bilinmeyen';
}
