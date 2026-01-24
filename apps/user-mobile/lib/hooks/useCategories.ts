import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CategoriesResponse,
  CreateCategoryInput,
  DeleteCategoryOptions,
  UpdateCategoryInput,
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../api/categories";
import { Category } from "../types/finance";

export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
  detail: (id: string) => [...categoryKeys.all, "detail", id] as const,
};

export function useCategories() {
  return useQuery<CategoriesResponse>({
    queryKey: categoryKeys.list(),
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10, // Categories don't change often, cache for 10 min
  });
}

export function useCategoriesByType(type: "income" | "expense") {
  const { data, ...rest } = useCategories();

  return {
    ...rest,
    data: data?.categories.filter((c) => c.type === type) ?? [],
  };
}

/**
 * Create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CreateCategoryInput>({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Update an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<
    Category,
    Error,
    { id: string; data: UpdateCategoryInput }
  >({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { id: string; options?: DeleteCategoryOptions }
  >({
    mutationFn: ({ id, options }) => deleteCategory(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Also invalidate transactions since they may have been reassigned
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
