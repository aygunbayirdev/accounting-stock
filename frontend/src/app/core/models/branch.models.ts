/**
 * Branch Models (Şubeler)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Branches.Queries.Dto.BranchDtos
 */

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Branch DTO (Read)
 * Backend: BranchDto
 */
export interface BranchDto {
  id: number;
  code: string;
  name: string;
  rowVersionBase64: string;         // Base64
}

/**
 * Branch List Item (Same as detail)
 */
export type BranchListItemDto = BranchDto;

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Branches Query Parameters
 * Backend: ListBranchesQuery
 */
export interface ListBranchesQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "name:asc", "code:desc"
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Branch Body
 * Backend: CreateBranchCommand
 */
export interface CreateBranchBody {
  code: string;
  name: string;
}

/**
 * Update Branch Body
 * Backend: UpdateBranchCommand
 */
export interface UpdateBranchBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  code: string;
  name: string;
}
