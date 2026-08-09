/**
 * Fixed Asset Models (Demirbaşlar)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.FixedAssets.Queries.Dto.FixedAssetDtos
 */

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Fixed Asset List Item DTO (Read)
 * Backend: FixedAssetListItemDto
 */
export interface FixedAssetListItemDto {
  id: number;
  code: string;
  name: string;
  purchaseDateUtc: string;          // ISO-8601 UTC
  purchasePrice: string;            // F2 - Money string
  usefulLifeYears: number;
  depreciationRatePercent: string;  // F2 - Money string (percentage)
}

/**
 * Fixed Asset Detail DTO (Read)
 * Backend: FixedAssetDetailDto
 */
export interface FixedAssetDetailDto {
  id: number;
  code: string;
  name: string;
  purchaseDateUtc: string;          // ISO-8601 UTC
  purchasePrice: string;            // F2 - Money string
  usefulLifeYears: number;
  depreciationRatePercent: string;  // F2 - Money string
  isDeleted: boolean;
  rowVersionBase64: string;         // Base64
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;     // ISO-8601 UTC
  deletedAtUtc?: string | null;     // ISO-8601 UTC
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Fixed Assets Query Parameters
 * Backend: ListFixedAssetsQuery
 */
export interface ListFixedAssetsQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "name:asc", "purchasePrice:desc"
  search?: string | null;           // Name or code search
  includeDeleted?: boolean;
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Fixed Asset Body
 * Backend: CreateFixedAssetCommand
 */
export interface CreateFixedAssetBody {
  code: string;
  name: string;
  purchaseDateUtc: string;          // ISO-8601 UTC
  purchasePrice: string;            // Money string (dot separator!)
  usefulLifeYears: number;
  depreciationRatePercent: string;  // Money string (dot separator!)
}

/**
 * Update Fixed Asset Body
 * Backend: UpdateFixedAssetCommand
 */
export interface UpdateFixedAssetBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  code: string;
  name: string;
  purchaseDateUtc: string;          // ISO-8601 UTC
  purchasePrice: string;            // Money string (dot separator!)
  usefulLifeYears: number;
  depreciationRatePercent: string;  // Money string (dot separator!)
}
