/**
 * Warehouse Models (Depolar)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Warehouses.Dto.WarehouseDtos
 */

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Warehouse DTO (Read)
 * Backend: WarehouseDto
 */
export interface WarehouseDto {
  id: number;
  branchId: number;
  code: string;
  name: string;
  isDefault: boolean;               // Varsayılan depo mu?
  rowVersion: string;               // Base64
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;     // ISO-8601 UTC
}

/**
 * Warehouse List Item DTO (Same as detail for now)
 */
export type WarehouseListItemDto = WarehouseDto;

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Warehouses Query Parameters
 * Backend: ListWarehousesQuery
 */
export interface ListWarehousesQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "name:asc", "code:desc"
  branchId?: number | null;
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Warehouse Body
 * Backend: CreateWarehouseCommand
 */
export interface CreateWarehouseBody {
  branchId: number;
  code: string;
  name: string;
  isDefault: boolean;
}

/**
 * Update Warehouse Body
 * Backend: UpdateWarehouseCommand
 */
export interface UpdateWarehouseBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  branchId: number;
  code: string;
  name: string;
  isDefault: boolean;
}
