import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { Category } from "../types/finance";

const WORKSPACE_ID_KEY = "currentWorkspaceId";

// ============================================================================
// Helper Functions
// ============================================================================

async function getWorkspaceId(): Promise<string> {
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);
  if (!workspaceId) {
    throw new Error("No workspace selected");
  }
  return workspaceId;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Categories CRUD
// ============================================================================

export async function getCategories(): Promise<CategoriesResponse> {
  console.log("[Categories API] getCategories via Supabase");
  try {
    const userId = await getCurrentUserId();

    // Get both system categories and user's custom categories
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .or(`is_system.eq.true,user_id.eq.${userId}`)
      .order("name", { ascending: true });

    if (error) throw error;

    console.log("[Categories API] getCategories response:", (categories || []).length, "categories");
    return { categories: categories || [] };
  } catch (error) {
    console.error("[Categories API] getCategories ERROR:", error);
    throw error;
  }
}

export async function getCategory(id: string): Promise<Category> {
  console.log("[Categories API] getCategory via Supabase", id);
  try {
    const { data: category, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Categories API] getCategory response:", category.name);
    return category;
  } catch (error) {
    console.error("[Categories API] getCategory ERROR:", error);
    throw error;
  }
}

/**
 * Create a new custom category
 */
export async function createCategory(
  data: CreateCategoryInput
): Promise<Category> {
  console.log("[Categories API] createCategory via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: data.name,
        type: data.type,
        icon: data.icon || null,
        color: data.color || null,
        parent_id: data.parent_id || null,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[Categories API] createCategory response:", category);
    return category;
  } catch (error) {
    console.error("[Categories API] createCategory ERROR:", error);
    throw error;
  }
}

/**
 * Update an existing category
 * Note: System categories cannot be updated
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryInput
): Promise<Category> {
  console.log("[Categories API] updateCategory via Supabase", id, data);
  try {
    // First check if it's a system category
    const { data: existingCategory, error: checkError } = await supabase
      .from("categories")
      .select("is_system")
      .eq("id", id)
      .single();

    if (checkError) throw checkError;

    if (existingCategory?.is_system) {
      throw new Error("System categories cannot be updated");
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;

    const { data: category, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[Categories API] updateCategory response:", category);
    return category;
  } catch (error) {
    console.error("[Categories API] updateCategory ERROR:", error);
    throw error;
  }
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
  console.log("[Categories API] deleteCategory via Supabase", id, options);
  try {
    // First check if it's a system category
    const { data: existingCategory, error: checkError } = await supabase
      .from("categories")
      .select("is_system")
      .eq("id", id)
      .single();

    if (checkError) throw checkError;

    if (existingCategory?.is_system) {
      throw new Error("System categories cannot be deleted");
    }

    // If reassignTo is specified, update transactions first
    if (options?.reassignTo) {
      const { error: reassignError } = await supabase
        .from("transactions")
        .update({ category_id: options.reassignTo })
        .eq("category_id", id);

      if (reassignError) {
        console.error("[Categories API] Failed to reassign transactions:", reassignError);
      }
    } else {
      // Clear category from transactions
      const { error: clearError } = await supabase
        .from("transactions")
        .update({ category_id: null })
        .eq("category_id", id);

      if (clearError) {
        console.error("[Categories API] Failed to clear transactions:", clearError);
      }
    }

    // Delete the category
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Categories API] deleteCategory success");
    return { success: true };
  } catch (error) {
    console.error("[Categories API] deleteCategory ERROR:", error);
    throw error;
  }
}
