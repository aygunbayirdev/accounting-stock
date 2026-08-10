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
  rowVersion: string;               // Base64 (backend: BranchDetailDto.RowVersion)
}

/**
 * Branch List Item DTO (Read)
 * Backend: BranchListItemDto — NOT the same as BranchDto, has no RowVersion.
 * Fetch full BranchDto via getById() before edit/delete.
 */
export interface BranchListItemDto {
  id: number;
  code: string;
  name: string;
}

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
