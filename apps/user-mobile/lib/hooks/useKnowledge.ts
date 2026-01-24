import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  togglePageFavorite,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  setPageCategories,
  getTemplates,
} from "../api/knowledge";
import {
  KnowledgePage,
  KnowledgeCategory,
  KnowledgeTemplate,
  PagesResponse,
  CategoriesResponse,
  PagesQueryParams,
  CreatePageInput,
  UpdatePageInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ToggleFavoriteResponse,
} from "../types/knowledge";

// ============================================================================
// Query Keys
// ============================================================================

export const knowledgeKeys = {
  all: ["knowledge"] as const,

  // Pages
  pages: {
    all: () => [...knowledgeKeys.all, "pages"] as const,
    list: (params?: PagesQueryParams) =>
      [...knowledgeKeys.pages.all(), "list", params] as const,
    detail: (id: string) => [...knowledgeKeys.pages.all(), "detail", id] as const,
  },

  // Categories
  categories: {
    all: () => [...knowledgeKeys.all, "categories"] as const,
    list: () => [...knowledgeKeys.categories.all(), "list"] as const,
  },

  // Templates
  templates: {
    all: () => [...knowledgeKeys.all, "templates"] as const,
    list: () => [...knowledgeKeys.templates.all(), "list"] as const,
  },
};

// ============================================================================
// Pages Hooks
// ============================================================================

export function usePages(params?: PagesQueryParams) {
  return useQuery<PagesResponse>({
    queryKey: knowledgeKeys.pages.list(params),
    queryFn: () => getPages(params),
  });
}

export function usePage(id: string) {
  return useQuery<KnowledgePage>({
    queryKey: knowledgeKeys.pages.detail(id),
    queryFn: () => getPage(id),
    enabled: !!id,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();

  return useMutation<KnowledgePage, Error, CreatePageInput>({
    mutationFn: (input) => createPage(input),
    onSuccess: () => {
      // Invalidate pages list to refetch
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.pages.all() });
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation<
    KnowledgePage,
    Error,
    { id: string; data: UpdatePageInput }
  >({
    mutationFn: ({ id, data }) => updatePage(id, data),
    onSuccess: (updatedPage) => {
      // Update the specific page in cache
      queryClient.setQueryData(
        knowledgeKeys.pages.detail(updatedPage.id),
        updatedPage
      );
      // Invalidate pages list
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.pages.list() });
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; permanent?: boolean }>({
    mutationFn: ({ id, permanent }) => deletePage(id, permanent),
    onSuccess: (_, { id }) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: knowledgeKeys.pages.detail(id) });
      // Invalidate pages list
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.pages.all() });
    },
  });
}

export function useTogglePageFavorite() {
  const queryClient = useQueryClient();

  return useMutation<ToggleFavoriteResponse, Error, string>({
    mutationFn: (id) => togglePageFavorite(id),
    onSuccess: (result, id) => {
      // Update the specific page's isFavorite status in cache
      queryClient.setQueryData<KnowledgePage>(
        knowledgeKeys.pages.detail(id),
        (oldData) => {
          if (oldData) {
            return { ...oldData, isFavorite: result.isFavorite };
          }
          return oldData;
        }
      );
      // Invalidate pages list to update any filtered views
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.pages.list() });
    },
  });
}

// ============================================================================
// Categories Hooks
// ============================================================================

export function useCategories() {
  return useQuery<CategoriesResponse>({
    queryKey: knowledgeKeys.categories.list(),
    queryFn: () => getCategories(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<KnowledgeCategory, Error, CreateCategoryInput>({
    mutationFn: (input) => createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.categories.all(),
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<
    KnowledgeCategory,
    Error,
    { id: string; data: UpdateCategoryInput }
  >({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.categories.all(),
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.categories.all(),
      });
      // Also invalidate pages as category associations may have changed
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.pages.all() });
    },
  });
}

// ============================================================================
// Page Categories Hooks
// ============================================================================

export function useSetPageCategories() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { pageId: string; categoryIds: string[] }>({
    mutationFn: ({ pageId, categoryIds }) =>
      setPageCategories(pageId, categoryIds),
    onSuccess: (_, { pageId }) => {
      // Invalidate the specific page
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.pages.detail(pageId),
      });
      // Invalidate pages list
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.pages.list() });
      // Invalidate categories to update page counts
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.categories.all(),
      });
    },
  });
}

// ============================================================================
// Templates Hooks
// ============================================================================

export function useTemplates() {
  return useQuery<KnowledgeTemplate[]>({
    queryKey: knowledgeKeys.templates.list(),
    queryFn: () => getTemplates(),
  });
}
