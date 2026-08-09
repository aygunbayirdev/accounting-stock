/**
 * Role Models (Roller)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Roles.Queries.Dto.RoleDto
 */

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Role List Item DTO (Read)
 * Backend: RoleListItemDto
 */
export interface RoleListItemDto {
  id: number;
  name: string;
  description?: string | null;
  permissionCount: number;
}

/**
 * Role Detail DTO (Read)
 * Backend: RoleDetailDto
 */
export interface RoleDetailDto {
  id: number;
  name: string;
  description?: string | null;
  permissions: string[];            // Permission names (örn: "Invoice.Create")
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Roles Query Parameters
 * Backend: ListRolesQuery
 */
export interface ListRolesQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "name:asc"
  search?: string | null;           // Name search
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Role Body
 * Backend: CreateRoleCommand
 */
export interface CreateRoleBody {
  name: string;
  description?: string | null;
  permissions: string[];            // Permission names to assign
}

/**
 * Update Role Body
 * Backend: UpdateRoleCommand
 */
export interface UpdateRoleBody {
  id: number;
  name: string;
  description?: string | null;
  permissions: string[];            // Permission names to assign
}
