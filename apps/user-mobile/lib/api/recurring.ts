import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { post } from "../api";
import { RecurringRule, RecurringFrequency } from "../types/finance";

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

export interface RecurringRulesResponse {
  rules: RecurringRule[];
  totals: {
    activeCount: number;
    pausedCount: number;
    upcomingThisWeek: number;
  };
}

export interface UpcomingRecurringResponse {
  rules: RecurringRule[];
}

export interface RecurringRuleFilters {
  includeInactive?: boolean;
}

export interface CreateRecurringRuleInput {
  account_id: string;
  category_id?: string;
  amount: number;
  description: string;
  frequency: RecurringFrequency;
  next_date: string;
  end_date?: string;
}

export interface UpdateRecurringRuleInput {
  account_id?: string;
  category_id?: string;
  amount?: number;
  description?: string;
  frequency?: RecurringFrequency;
  next_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// ============================================================================
// Recurring Rules CRUD
// ============================================================================

export async function getRecurringRules(
  filters: RecurringRuleFilters = {}
): Promise<RecurringRulesResponse> {
  console.log("[Recurring API] getRecurringRules via Supabase", filters);
  try {
    const userId = await getCurrentUserId();
    const workspaceId = await getWorkspaceId();

    let query = supabase
      .from("recurring_rules")
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, icon, color)
      `)
      .eq("user_id", userId)
      .order("next_date", { ascending: true });

    if (!filters.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: rules, error } = await query;

    if (error) throw error;

    // Filter by workspace (through accounts)
    const { data: workspaceAccounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", workspaceId);

    const accountIds = new Set((workspaceAccounts || []).map(a => a.id));

    const filteredRules = (rules || []).filter((rule: any) =>
      accountIds.has(rule.account_id)
    ) as RecurringRule[];

    // Calculate totals
    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    let activeCount = 0;
    let pausedCount = 0;
    let upcomingThisWeek = 0;

    filteredRules.forEach((rule) => {
      if (rule.is_active) {
        activeCount++;
        if (rule.next_date) {
          const nextDate = new Date(rule.next_date);
          if (nextDate >= now && nextDate <= oneWeekLater) {
            upcomingThisWeek++;
          }
        }
      } else {
        pausedCount++;
      }
    });

    console.log("[Recurring API] getRecurringRules response:", filteredRules.length, "rules");
    return {
      rules: filteredRules,
      totals: {
        activeCount,
        pausedCount,
        upcomingThisWeek,
      },
    };
  } catch (error) {
    console.error("[Recurring API] getRecurringRules ERROR:", error);
    throw error;
  }
}

export async function getRecurringRule(id: string): Promise<RecurringRule> {
  console.log("[Recurring API] getRecurringRule via Supabase", id);
  try {
    const { data: rule, error } = await supabase
      .from("recurring_rules")
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, icon, color)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Recurring API] getRecurringRule response:", rule.description);
    return rule as RecurringRule;
  } catch (error) {
    console.error("[Recurring API] getRecurringRule ERROR:", error);
    throw error;
  }
}

export async function getUpcomingRecurring(
  days: number = 7
): Promise<UpcomingRecurringResponse> {
  console.log("[Recurring API] getUpcomingRecurring via Supabase", days);
  try {
    const userId = await getCurrentUserId();
    const workspaceId = await getWorkspaceId();

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    // Get workspace accounts first
    const { data: workspaceAccounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", workspaceId);

    const accountIds = (workspaceAccounts || []).map(a => a.id);

    if (accountIds.length === 0) {
      return { rules: [] };
    }

    const { data: rules, error } = await supabase
      .from("recurring_rules")
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, icon, color)
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("account_id", accountIds)
      .gte("next_date", now.toISOString().split("T")[0])
      .lte("next_date", futureDate.toISOString().split("T")[0])
      .order("next_date", { ascending: true });

    if (error) throw error;

    console.log("[Recurring API] getUpcomingRecurring response:", (rules || []).length, "rules");
    return { rules: (rules || []) as RecurringRule[] };
  } catch (error) {
    console.error("[Recurring API] getUpcomingRecurring ERROR:", error);
    throw error;
  }
}

export async function createRecurringRule(
  data: CreateRecurringRuleInput
): Promise<RecurringRule> {
  console.log("[Recurring API] createRecurringRule via Supabase", data);
  try {
    const userId = await getCurrentUserId();
    const workspaceId = await getWorkspaceId();

    const { data: rule, error } = await supabase
      .from("recurring_rules")
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        account_id: data.account_id,
        category_id: data.category_id || null,
        amount: data.amount,
        description: data.description,
        frequency: data.frequency,
        next_date: data.next_date,
        end_date: data.end_date || null,
        is_active: true,
      })
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, icon, color)
      `)
      .single();

    if (error) throw error;

    console.log("[Recurring API] createRecurringRule response:", rule);
    return rule as RecurringRule;
  } catch (error) {
    console.error("[Recurring API] createRecurringRule ERROR:", error);
    throw error;
  }
}

export async function updateRecurringRule(
  id: string,
  data: UpdateRecurringRuleInput
): Promise<RecurringRule> {
  console.log("[Recurring API] updateRecurringRule via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.account_id !== undefined) updateData.account_id = data.account_id;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.next_date !== undefined) updateData.next_date = data.next_date;
    if (data.end_date !== undefined) updateData.end_date = data.end_date;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: rule, error } = await supabase
      .from("recurring_rules")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type, icon, color)
      `)
      .single();

    if (error) throw error;

    console.log("[Recurring API] updateRecurringRule response:", rule);
    return rule as RecurringRule;
  } catch (error) {
    console.error("[Recurring API] updateRecurringRule ERROR:", error);
    throw error;
  }
}

export async function deleteRecurringRule(id: string): Promise<void> {
  console.log("[Recurring API] deleteRecurringRule via Supabase", id);
  try {
    const { error } = await supabase
      .from("recurring_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Recurring API] deleteRecurringRule success");
  } catch (error) {
    console.error("[Recurring API] deleteRecurringRule ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Execute Rule (Keep as HTTP - creates transaction on server)
// ============================================================================

export async function executeRecurringRule(id: string): Promise<{ transaction_id: string }> {
  return post<{ transaction_id: string }>(`/api/recurring/${id}/execute`);
}
