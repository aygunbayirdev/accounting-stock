/**
 * Category Models (Kategoriler)
 * 
 * Backend DTO'larıyla senkronize.
 * @see Accounting.Application.Categories.Queries.CategoryDto
 */

// ============================================================================
// DTOs - READ (GET/LIST)
// ============================================================================

/**
 * Category DTO (Read)
 * Backend: CategoryDto
 */
export interface CategoryDto {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;            // Hex color code (örn: "#FF5733")
  rowVersion: string;               // Base64
  createdAtUtc: string;             // ISO-8601 UTC
  updatedAtUtc?: string | null;     // ISO-8601 UTC
}

/**
 * Category List Item (Same as detail)
 */
export type CategoryListItemDto = CategoryDto;

// ============================================================================
// QUERY PARAMS
// ============================================================================

/**
 * List Categories Query Parameters
 * Backend: ListCategoriesQuery
 */
export interface ListCategoriesQuery {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;                    // "name:asc"
  search?: string | null;           // Name search
}

// ============================================================================
// COMMAND BODIES - WRITE (CREATE/UPDATE)
// ============================================================================

/**
 * Create Category Body
 * Backend: CreateCategoryCommand
 */
export interface CreateCategoryBody {
  name: string;
  description?: string | null;
  color?: string | null;
}

/**
 * Update Category Body
 * Backend: UpdateCategoryCommand
 */
export interface UpdateCategoryBody {
  id: number;
  rowVersionBase64: string;         // Required for optimistic concurrency
  name: string;
  description?: string | null;
  color?: string | null;
}
