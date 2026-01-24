import { del, get, post, put } from "../api";
import { Category } from "../types/finance";

export interface CategoriesResponse {
  categories: Category[];
}

export interface CreateCategoryInput {
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  parent_id?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
  parent_id?: string | null;
}

export interface DeleteCategoryOptions {
  reassignTo?: string; // Category ID to reassign transactions to
}

export async function getCategories(): Promise<CategoriesResponse> {
  return get<CategoriesResponse>("/api/categories");
}

export async function getCategory(id: string): Promise<Category> {
  return get<Category>(`/api/categories/${id}`);
}

/**
 * Create a new custom category
 */
export async function createCategory(
  data: CreateCategoryInput
): Promise<Category> {
  return post<Category>("/api/categories", data);
}

/**
 * Update an existing category
 * Note: System categories cannot be updated
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryInput
): Promise<Category> {
  return put<Category>(`/api/categories/${id}`, data);
}

/**
 * Delete a category
 * Note: System categories cannot be deleted
 * Optionally reassign transactions to another category
 */
export async function deleteCategory(
  id: string,
  options?: DeleteCategoryOptions
): Promise<{ success: boolean }> {
  const queryString = options?.reassignTo
    ? `?reassignTo=${options.reassignTo}`
    : "";
  return del<{ success: boolean }>(`/api/categories/${id}${queryString}`);
}
