import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import {
  KnowledgePage,
  KnowledgeCategory,
  KnowledgeTemplate,
  PagesQueryParams,
  PagesResponse,
  CategoriesResponse,
  CreatePageInput,
  UpdatePageInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ToggleFavoriteResponse,
  DEFAULT_PAGE_CONTENT,
} from "../types/knowledge";

const WORKSPACE_ID_KEY = "currentWorkspaceId";

// Helper to get current workspace ID
async function getWorkspaceId(): Promise<string> {
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);
  if (!workspaceId) {
    throw new Error("No workspace selected");
  }
  return workspaceId;
}

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

// ============================================================================
// Pages
// ============================================================================

export async function getPages(
  params?: PagesQueryParams
): Promise<PagesResponse> {
  console.log("[Knowledge API] getPages", params);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    let query = supabase
      .from("knowledge_pages")
      .select(
        `
        id,
        workspace_id,
        parent_id,
        title,
        icon,
        cover_image,
        content,
        is_template,
        template_id,
        is_archived,
        is_favorited_by,
        position,
        created_by,
        last_edited_by,
        created_at,
        updated_at
      `
      )
      .eq("workspace_id", workspaceId)
      .eq("is_template", false);

    // Apply filters
    if (params?.archived !== undefined) {
      query = query.eq("is_archived", params.archived);
    } else {
      // Default to non-archived
      query = query.eq("is_archived", false);
    }

    if (params?.parent_id) {
      query = query.eq("parent_id", params.parent_id);
    }

    // Order by position and updated_at
    query = query.order("position", { ascending: true });
    query = query.order("updated_at", { ascending: false });

    const { data: pages, error } = await query;

    if (error) throw error;

    // Fetch categories for each page
    const pageIds = (pages || []).map((p: any) => p.id);
    let categoriesMap: Record<string, KnowledgeCategory[]> = {};

    if (pageIds.length > 0) {
      const { data: pageCategories, error: catError } = await supabase
        .from("knowledge_page_categories")
        .select(
          `
          page_id,
          category:knowledge_categories(
            id,
            workspace_id,
            name,
            slug,
            color,
            icon,
            is_system,
            position,
            created_by,
            created_at,
            updated_at
          )
        `
        )
        .in("page_id", pageIds);

      if (catError) {
        console.log("[Knowledge API] Error fetching categories:", catError);
      } else {
        // Group categories by page_id
        (pageCategories || []).forEach((pc: any) => {
          if (pc.category) {
            if (!categoriesMap[pc.page_id]) {
              categoriesMap[pc.page_id] = [];
            }
            categoriesMap[pc.page_id].push(pc.category);
          }
        });
      }
    }

    // Transform pages with categories and isFavorite
    let transformedPages: KnowledgePage[] = (pages || []).map((page: any) => ({
      ...page,
      categories: categoriesMap[page.id] || [],
      isFavorite: (page.is_favorited_by || []).includes(userId),
    }));

    // Filter by category if specified
    if (params?.category_id) {
      transformedPages = transformedPages.filter((page) =>
        page.categories.some((cat) => cat.id === params.category_id)
      );
    }

    // Filter favorites only
    if (params?.favorites_only) {
      transformedPages = transformedPages.filter((page) => page.isFavorite);
    }

    return { pages: transformedPages };
  } catch (error) {
    console.log("[Knowledge API] getPages error:", error);
    throw error;
  }
}

export async function getPage(id: string): Promise<KnowledgePage> {
  console.log("[Knowledge API] getPage", id);
  try {
    const userId = await getCurrentUserId();

    const { data: page, error } = await supabase
      .from("knowledge_pages")
      .select(
        `
        id,
        workspace_id,
        parent_id,
        title,
        icon,
        cover_image,
        content,
        is_template,
        template_id,
        is_archived,
        is_favorited_by,
        position,
        created_by,
        last_edited_by,
        created_at,
        updated_at
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    // Fetch categories for this page
    const { data: pageCategories, error: catError } = await supabase
      .from("knowledge_page_categories")
      .select(
        `
        category:knowledge_categories(
          id,
          workspace_id,
          name,
          slug,
          color,
          icon,
          is_system,
          position,
          created_by,
          created_at,
          updated_at
        )
      `
      )
      .eq("page_id", id);

    const categories =
      (pageCategories || [])
        .map((pc: any) => pc.category)
        .filter(Boolean) || [];

    return {
      ...page,
      categories,
      isFavorite: (page.is_favorited_by || []).includes(userId),
    };
  } catch (error) {
    console.log("[Knowledge API] getPage error:", error);
    throw error;
  }
}

export async function createPage(
  input: CreatePageInput
): Promise<KnowledgePage> {
  console.log("[Knowledge API] createPage", input);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    // Get template content if template_id is provided
    let content = input.content || DEFAULT_PAGE_CONTENT;
    let icon = input.icon || null;
    let title = input.title;

    if (input.template_id) {
      const { data: template, error: templateError } = await supabase
        .from("knowledge_templates")
        .select("content, icon, name")
        .eq("id", input.template_id)
        .single();

      if (!templateError && template) {
        content = template.content || content;
        icon = template.icon || icon;
        // Optionally use template name if no title provided
        if (!input.title && template.name) {
          title = template.name;
        }

        // Increment template usage count
        await supabase
          .from("knowledge_templates")
          .update({ usage_count: supabase.rpc("increment", { x: 1 }) })
          .eq("id", input.template_id);
      }
    }

    // Get max position for ordering
    const { data: maxPosData } = await supabase
      .from("knowledge_pages")
      .select("position")
      .eq("workspace_id", workspaceId)
      .eq("parent_id", input.parent_id || null)
      .order("position", { ascending: false })
      .limit(1);

    const maxPosition = maxPosData?.[0]?.position ?? -1;

    const { data: page, error } = await supabase
      .from("knowledge_pages")
      .insert({
        workspace_id: workspaceId,
        parent_id: input.parent_id || null,
        title,
        icon,
        content,
        is_template: false,
        template_id: input.template_id || null,
        is_archived: false,
        is_favorited_by: [],
        position: maxPosition + 1,
        created_by: userId,
        last_edited_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...page,
      categories: [],
      isFavorite: false,
    };
  } catch (error) {
    console.log("[Knowledge API] createPage error:", error);
    throw error;
  }
}

export async function updatePage(
  id: string,
  input: UpdatePageInput
): Promise<KnowledgePage> {
  console.log("[Knowledge API] updatePage", id, input);
  try {
    const userId = await getCurrentUserId();

    const updateData: any = {
      last_edited_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.cover_image !== undefined)
      updateData.cover_image = input.cover_image;
    if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;
    if (input.position !== undefined) updateData.position = input.position;
    if (input.is_archived !== undefined)
      updateData.is_archived = input.is_archived;

    const { data: page, error } = await supabase
      .from("knowledge_pages")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Fetch categories
    const { data: pageCategories } = await supabase
      .from("knowledge_page_categories")
      .select(
        `
        category:knowledge_categories(*)
      `
      )
      .eq("page_id", id);

    const categories =
      (pageCategories || [])
        .map((pc: any) => pc.category)
        .filter(Boolean) || [];

    return {
      ...page,
      categories,
      isFavorite: (page.is_favorited_by || []).includes(userId),
    };
  } catch (error) {
    console.log("[Knowledge API] updatePage error:", error);
    throw error;
  }
}

export async function deletePage(
  id: string,
  permanent: boolean = false
): Promise<void> {
  console.log("[Knowledge API] deletePage", id, { permanent });
  try {
    if (permanent) {
      // Hard delete - also deletes child pages via cascade
      const { error } = await supabase
        .from("knowledge_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } else {
      // Soft delete (archive)
      const { error } = await supabase
        .from("knowledge_pages")
        .update({ is_archived: true })
        .eq("id", id);

      if (error) throw error;
    }
  } catch (error) {
    console.log("[Knowledge API] deletePage error:", error);
    throw error;
  }
}

export async function togglePageFavorite(
  id: string
): Promise<ToggleFavoriteResponse> {
  console.log("[Knowledge API] togglePageFavorite", id);
  try {
    const userId = await getCurrentUserId();

    // Get current favorited_by array
    const { data: page, error: fetchError } = await supabase
      .from("knowledge_pages")
      .select("is_favorited_by")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const currentFavorites: string[] = page.is_favorited_by || [];
    const isFavorited = currentFavorites.includes(userId);

    let newFavorites: string[];
    if (isFavorited) {
      // Remove from favorites
      newFavorites = currentFavorites.filter((uid) => uid !== userId);
    } else {
      // Add to favorites
      newFavorites = [...currentFavorites, userId];
    }

    const { error: updateError } = await supabase
      .from("knowledge_pages")
      .update({ is_favorited_by: newFavorites })
      .eq("id", id);

    if (updateError) throw updateError;

    return { isFavorite: !isFavorited };
  } catch (error) {
    console.log("[Knowledge API] togglePageFavorite error:", error);
    throw error;
  }
}

// ============================================================================
// Categories
// ============================================================================

export async function getCategories(): Promise<CategoriesResponse> {
  console.log("[Knowledge API] getCategories");
  try {
    const workspaceId = await getWorkspaceId();

    const { data: categories, error } = await supabase
      .from("knowledge_categories")
      .select(
        `
        id,
        workspace_id,
        name,
        slug,
        color,
        icon,
        is_system,
        position,
        created_by,
        created_at,
        updated_at
      `
      )
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });

    if (error) throw error;

    // Get page counts for each category
    const categoryIds = (categories || []).map((c: any) => c.id);
    let pageCounts: Record<string, number> = {};

    if (categoryIds.length > 0) {
      const { data: counts, error: countError } = await supabase
        .from("knowledge_page_categories")
        .select("category_id")
        .in("category_id", categoryIds);

      if (!countError && counts) {
        counts.forEach((item: any) => {
          pageCounts[item.category_id] =
            (pageCounts[item.category_id] || 0) + 1;
        });
      }
    }

    const categoriesWithCounts: KnowledgeCategory[] = (categories || []).map(
      (cat: any) => ({
        ...cat,
        page_count: pageCounts[cat.id] || 0,
      })
    );

    return { categories: categoriesWithCounts };
  } catch (error) {
    console.log("[Knowledge API] getCategories error:", error);
    throw error;
  }
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<KnowledgeCategory> {
  console.log("[Knowledge API] createCategory", input);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    // Generate slug from name
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Get max position
    const { data: maxPosData } = await supabase
      .from("knowledge_categories")
      .select("position")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: false })
      .limit(1);

    const maxPosition = maxPosData?.[0]?.position ?? -1;

    const { data: category, error } = await supabase
      .from("knowledge_categories")
      .insert({
        workspace_id: workspaceId,
        name: input.name,
        slug,
        color: input.color || null,
        icon: input.icon || null,
        is_system: false,
        position: maxPosition + 1,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...category,
      page_count: 0,
    };
  } catch (error) {
    console.log("[Knowledge API] createCategory error:", error);
    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<KnowledgeCategory> {
  console.log("[Knowledge API] updateCategory", id, input);
  try {
    const updateData: any = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
      // Regenerate slug if name changes
      updateData.slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.position !== undefined) updateData.position = input.position;

    const { data: category, error } = await supabase
      .from("knowledge_categories")
      .update(updateData)
      .eq("id", id)
      .eq("is_system", false) // Cannot update system categories
      .select()
      .single();

    if (error) throw error;

    return category;
  } catch (error) {
    console.log("[Knowledge API] updateCategory error:", error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  console.log("[Knowledge API] deleteCategory", id);
  try {
    // Cannot delete system categories - the RLS will handle this,
    // but we add a check here too
    const { data: category } = await supabase
      .from("knowledge_categories")
      .select("is_system")
      .eq("id", id)
      .single();

    if (category?.is_system) {
      throw new Error("Cannot delete system categories");
    }

    const { error } = await supabase
      .from("knowledge_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.log("[Knowledge API] deleteCategory error:", error);
    throw error;
  }
}

// ============================================================================
// Page Categories (Junction)
// ============================================================================

export async function setPageCategories(
  pageId: string,
  categoryIds: string[]
): Promise<void> {
  console.log("[Knowledge API] setPageCategories", pageId, categoryIds);
  try {
    // Delete existing associations
    const { error: deleteError } = await supabase
      .from("knowledge_page_categories")
      .delete()
      .eq("page_id", pageId);

    if (deleteError) throw deleteError;

    // Insert new associations
    if (categoryIds.length > 0) {
      const inserts = categoryIds.map((categoryId) => ({
        page_id: pageId,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabase
        .from("knowledge_page_categories")
        .insert(inserts);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.log("[Knowledge API] setPageCategories error:", error);
    throw error;
  }
}

// ============================================================================
// Templates
// ============================================================================

export async function getTemplates(): Promise<KnowledgeTemplate[]> {
  console.log("[Knowledge API] getTemplates");
  try {
    const workspaceId = await getWorkspaceId();

    // Get both system templates (workspace_id is null) and workspace templates
    const { data: templates, error } = await supabase
      .from("knowledge_templates")
      .select("*")
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .order("is_system", { ascending: false })
      .order("usage_count", { ascending: false });

    if (error) throw error;

    return templates || [];
  } catch (error) {
    console.log("[Knowledge API] getTemplates error:", error);
    throw error;
  }
}
