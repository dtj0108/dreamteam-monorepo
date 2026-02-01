import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { Budget, BudgetAlert, BudgetPeriod, Transaction } from "../types/finance";

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

// Get period date range based on budget start date and period type
function getPeriodDates(startDate: string, period: BudgetPeriod): { start: string; end: string } {
  const start = new Date(startDate);
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  switch (period) {
    case "weekly":
      // Find current week based on start date
      const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      periodStart = new Date(start);
      periodStart.setDate(start.getDate() + weeksSinceStart * 7);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      break;

    case "biweekly":
      const daysSinceStartBi = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const biweeksSinceStart = Math.floor(daysSinceStartBi / 14);
      periodStart = new Date(start);
      periodStart.setDate(start.getDate() + biweeksSinceStart * 14);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 13);
      break;

    case "monthly":
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;

    case "yearly":
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
      break;

    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return {
    start: periodStart.toISOString().split("T")[0],
    end: periodEnd.toISOString().split("T")[0],
  };
}

// ============================================================================
// Types
// ============================================================================

export interface BudgetFilters {
  period?: BudgetPeriod;
}

export interface BudgetsResponse {
  budgets: Budget[];
  totals: {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    overBudgetCount: number;
  };
}

export interface BudgetDetailResponse extends Budget {
  transactions: Transaction[];
  periodStart: string;
  periodEnd: string;
}

export interface CreateBudgetInput {
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  rollover?: boolean;
}

export interface UpdateBudgetInput {
  category_id?: string;
  amount?: number;
  period?: BudgetPeriod;
  start_date?: string;
  rollover?: boolean;
  is_active?: boolean;
}

// ============================================================================
// Budgets CRUD
// ============================================================================

export async function getBudgets(
  filters: BudgetFilters = {}
): Promise<BudgetsResponse> {
  console.log("[Budgets API] getBudgets via Supabase", filters);
  try {
    const userId = await getCurrentUserId();
    const workspaceId = await getWorkspaceId();

    let query = supabase
      .from("budgets")
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .eq("profile_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (filters.period) {
      query = query.eq("period", filters.period);
    }

    const { data: budgets, error } = await query;

    if (error) throw error;

    // Get accounts for spending calculation
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", workspaceId);

    const accountIds = (accounts || []).map(a => a.id);

    // Calculate spending for each budget
    let totalBudgeted = 0;
    let totalSpent = 0;
    let overBudgetCount = 0;

    const budgetsWithSpending = await Promise.all(
      (budgets || []).map(async (budget: any) => {
        const { start, end } = getPeriodDates(budget.start_date, budget.period);

        // Get transactions for this category in current period
        let spent = 0;
        if (accountIds.length > 0 && budget.category_id) {
          const { data: transactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("category_id", budget.category_id)
            .in("account_id", accountIds)
            .gte("date", start)
            .lte("date", end)
            .lt("amount", 0); // Only expenses

          spent = Math.abs(
            (transactions || []).reduce((sum: number, t: any) => sum + t.amount, 0)
          );
        }

        const remaining = budget.amount - spent;
        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        totalBudgeted += budget.amount;
        totalSpent += spent;
        if (spent > budget.amount) overBudgetCount++;

        return {
          ...budget,
          spent,
          remaining,
          percentUsed,
        };
      })
    );

    console.log("[Budgets API] getBudgets response:", budgetsWithSpending.length, "budgets");
    return {
      budgets: budgetsWithSpending as Budget[],
      totals: {
        totalBudgeted,
        totalSpent,
        totalRemaining: totalBudgeted - totalSpent,
        overBudgetCount,
      },
    };
  } catch (error) {
    console.error("[Budgets API] getBudgets ERROR:", error);
    throw error;
  }
}

export async function getBudget(id: string): Promise<BudgetDetailResponse> {
  console.log("[Budgets API] getBudget via Supabase", id);
  try {
    const workspaceId = await getWorkspaceId();

    const { data: budget, error } = await supabase
      .from("budgets")
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    const { start, end } = getPeriodDates(budget.start_date, budget.period);

    // Get accounts
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", workspaceId);

    const accountIds = (accounts || []).map(a => a.id);

    // Get transactions for this category in current period
    let transactions: Transaction[] = [];
    let spent = 0;

    if (accountIds.length > 0 && budget.category_id) {
      const { data: txns } = await supabase
        .from("transactions")
        .select(`
          *,
          category:categories(id, name, type, icon, color),
          account:accounts(id, name, type)
        `)
        .eq("category_id", budget.category_id)
        .in("account_id", accountIds)
        .gte("date", start)
        .lte("date", end)
        .lt("amount", 0)
        .order("date", { ascending: false });

      transactions = (txns || []) as Transaction[];
      spent = Math.abs(transactions.reduce((sum, t) => sum + t.amount, 0));
    }

    const result: BudgetDetailResponse = {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percentUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      transactions,
      periodStart: start,
      periodEnd: end,
    };

    console.log("[Budgets API] getBudget response:", result);
    return result;
  } catch (error) {
    console.error("[Budgets API] getBudget ERROR:", error);
    throw error;
  }
}

export async function createBudget(data: CreateBudgetInput): Promise<Budget> {
  console.log("[Budgets API] createBudget via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    const { data: budget, error } = await supabase
      .from("budgets")
      .insert({
        profile_id: userId,
        category_id: data.category_id,
        amount: data.amount,
        period: data.period,
        start_date: data.start_date,
        rollover: data.rollover ?? false,
        is_active: true,
      })
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .single();

    if (error) throw error;

    console.log("[Budgets API] createBudget response:", budget);
    return budget as Budget;
  } catch (error) {
    console.error("[Budgets API] createBudget ERROR:", error);
    throw error;
  }
}

export async function updateBudget(
  id: string,
  data: UpdateBudgetInput
): Promise<Budget> {
  console.log("[Budgets API] updateBudget via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.period !== undefined) updateData.period = data.period;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.rollover !== undefined) updateData.rollover = data.rollover;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: budget, error } = await supabase
      .from("budgets")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .single();

    if (error) throw error;

    console.log("[Budgets API] updateBudget response:", budget);
    return budget as Budget;
  } catch (error) {
    console.error("[Budgets API] updateBudget ERROR:", error);
    throw error;
  }
}

export async function deleteBudget(id: string): Promise<void> {
  console.log("[Budgets API] deleteBudget via Supabase", id);
  try {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Budgets API] deleteBudget success");
  } catch (error) {
    console.error("[Budgets API] deleteBudget ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Budget Alerts
// ============================================================================

export interface BudgetAlertsResponse {
  alerts: BudgetAlert[];
  totalAlerts: number;
  warningCount: number;
  exceededCount: number;
}

export async function getBudgetAlerts(
  threshold: number = 80
): Promise<BudgetAlertsResponse> {
  console.log("[Budgets API] getBudgetAlerts via Supabase", threshold);
  try {
    // Get all budgets with spending
    const { budgets } = await getBudgets();

    // Filter to only those at or above threshold
    const alerts: BudgetAlert[] = budgets
      .filter((budget) => (budget.percentUsed || 0) >= threshold)
      .map((budget) => {
        const { start, end } = getPeriodDates(budget.start_date, budget.period);
        const percentUsed = budget.percentUsed || 0;

        return {
          id: budget.id,
          category: {
            id: budget.category?.id || "",
            name: budget.category?.name || "Unknown",
            color: budget.category?.color,
            icon: budget.category?.icon,
          },
          amount: budget.amount,
          spent: budget.spent || 0,
          remaining: budget.remaining || 0,
          percentUsed,
          status: percentUsed >= 100 ? "exceeded" : "warning",
          period: budget.period,
          periodStart: start,
          periodEnd: end,
        } as BudgetAlert;
      });

    const warningCount = alerts.filter((a) => a.status === "warning").length;
    const exceededCount = alerts.filter((a) => a.status === "exceeded").length;

    console.log("[Budgets API] getBudgetAlerts response:", alerts.length, "alerts");
    return {
      alerts,
      totalAlerts: alerts.length,
      warningCount,
      exceededCount,
    };
  } catch (error) {
    console.error("[Budgets API] getBudgetAlerts ERROR:", error);
    throw error;
  }
}
