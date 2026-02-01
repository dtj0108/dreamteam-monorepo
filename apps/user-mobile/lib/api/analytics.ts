import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import {
  AnalyticsOverview,
  BudgetVsActualReport,
  CalendarMonthData,
  CalendarDay,
  CalendarEvent,
  CashFlowGroupBy,
  CashFlowReport,
  CashFlowPeriod,
  DateRange,
  ExpenseAnalysis,
  IncomeAnalysis,
  ProfitLossReport,
  CategoryBreakdown,
  MonthlyTrendItem,
  TrendDataPoint,
} from "../types/finance";

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

async function getWorkspaceAccountIds(): Promise<string[]> {
  const workspaceId = await getWorkspaceId();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("workspace_id", workspaceId);
  return (accounts || []).map(a => a.id);
}

function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1).toISOString().split("T")[0];
  const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
  return { start, end };
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ============================================================================
// Analytics Overview
// ============================================================================

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  console.log("[Analytics API] getAnalyticsOverview via Supabase");
  try {
    const accountIds = await getWorkspaceAccountIds();

    if (accountIds.length === 0) {
      return {
        currentMonth: { income: 0, expenses: 0, profit: 0 },
        lastMonth: { income: 0, expenses: 0, profit: 0 },
        changes: { income: 0, expenses: 0, profit: 0 },
        totalBalance: 0,
        trend: [],
      };
    }

    const now = new Date();
    const currentMonth = getMonthRange(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = getMonthRange(lastMonthDate);

    // Get current month transactions
    const { data: currentTxns } = await supabase
      .from("transactions")
      .select("amount")
      .in("account_id", accountIds)
      .gte("date", currentMonth.start)
      .lte("date", currentMonth.end);

    // Get last month transactions
    const { data: lastTxns } = await supabase
      .from("transactions")
      .select("amount")
      .in("account_id", accountIds)
      .gte("date", lastMonth.start)
      .lte("date", lastMonth.end);

    // Calculate current month totals
    let currentIncome = 0, currentExpenses = 0;
    (currentTxns || []).forEach((t: any) => {
      if (t.amount > 0) currentIncome += t.amount;
      else currentExpenses += Math.abs(t.amount);
    });

    // Calculate last month totals
    let lastIncome = 0, lastExpenses = 0;
    (lastTxns || []).forEach((t: any) => {
      if (t.amount > 0) lastIncome += t.amount;
      else lastExpenses += Math.abs(t.amount);
    });

    // Get total balance from accounts
    const { data: accounts } = await supabase
      .from("accounts")
      .select("balance, type")
      .in("id", accountIds)
      .eq("is_active", true);

    let totalBalance = 0;
    (accounts || []).forEach((a: any) => {
      if (a.type === "credit_card" || a.type === "loan") {
        totalBalance -= Math.abs(a.balance || 0);
      } else {
        totalBalance += a.balance || 0;
      }
    });

    // Get 6-month trend
    const trend: TrendDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const trendRange = getMonthRange(trendDate);

      const { data: trendTxns } = await supabase
        .from("transactions")
        .select("amount")
        .in("account_id", accountIds)
        .gte("date", trendRange.start)
        .lte("date", trendRange.end);

      let trendIncome = 0, trendExpenses = 0;
      (trendTxns || []).forEach((t: any) => {
        if (t.amount > 0) trendIncome += t.amount;
        else trendExpenses += Math.abs(t.amount);
      });

      trend.push({
        month: formatMonth(trendDate),
        label: getMonthLabel(trendDate),
        income: trendIncome,
        expenses: trendExpenses,
        profit: trendIncome - trendExpenses,
      });
    }

    // Calculate percentage changes
    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;
    const lastProfit = lastIncome - lastExpenses;
    const currentProfit = currentIncome - currentExpenses;
    const profitChange = lastProfit !== 0 ? ((currentProfit - lastProfit) / Math.abs(lastProfit)) * 100 : 0;

    console.log("[Analytics API] getAnalyticsOverview response");
    return {
      currentMonth: {
        income: currentIncome,
        expenses: currentExpenses,
        profit: currentProfit,
      },
      lastMonth: {
        income: lastIncome,
        expenses: lastExpenses,
        profit: lastProfit,
      },
      changes: {
        income: incomeChange,
        expenses: expensesChange,
        profit: profitChange,
      },
      totalBalance,
      trend,
    };
  } catch (error) {
    console.error("[Analytics API] getAnalyticsOverview ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Expense Analysis
// ============================================================================

export async function getExpenseAnalysis(
  dateRange?: DateRange
): Promise<ExpenseAnalysis> {
  console.log("[Analytics API] getExpenseAnalysis via Supabase", dateRange);
  try {
    const accountIds = await getWorkspaceAccountIds();

    if (accountIds.length === 0) {
      return {
        summary: { totalExpenses: 0, transactionCount: 0, categoryCount: 0, avgMonthly: 0 },
        byCategory: [],
        monthlyTrend: [],
      };
    }

    // Default to last 6 months if no range
    const now = new Date();
    const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];
    const endDate = dateRange?.endDate || now.toISOString().split("T")[0];

    // Get expense transactions with categories
    const { data: transactions } = await supabase
      .from("transactions")
      .select(`
        amount,
        date,
        category:categories(id, name, color)
      `)
      .in("account_id", accountIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .lt("amount", 0);

    const txns = transactions || [];
    const totalExpenses = Math.abs(txns.reduce((sum: number, t: any) => sum + t.amount, 0));

    // Group by category
    const categoryMap: Record<string, { amount: number; count: number; name: string; color: string }> = {};
    txns.forEach((t: any) => {
      const catId = t.category?.id || "uncategorized";
      const catName = t.category?.name || "Uncategorized";
      const catColor = t.category?.color || "#6b7280";

      if (!categoryMap[catId]) {
        categoryMap[catId] = { amount: 0, count: 0, name: catName, color: catColor };
      }
      categoryMap[catId].amount += Math.abs(t.amount);
      categoryMap[catId].count++;
    });

    const byCategory: CategoryBreakdown[] = Object.values(categoryMap)
      .map(cat => ({
        name: cat.name,
        amount: cat.amount,
        color: cat.color,
        count: cat.count,
        percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly trend
    const monthlyMap: Record<string, number> = {};
    txns.forEach((t: any) => {
      const month = t.date.substring(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + Math.abs(t.amount);
    });

    const monthlyTrend: MonthlyTrendItem[] = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => {
        const [year, mon] = month.split("-");
        const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
        return {
          month,
          label: getMonthLabel(date),
          amount,
        };
      });

    const avgMonthly = monthlyTrend.length > 0
      ? totalExpenses / monthlyTrend.length
      : 0;

    console.log("[Analytics API] getExpenseAnalysis response");
    return {
      summary: {
        totalExpenses,
        transactionCount: txns.length,
        categoryCount: byCategory.length,
        avgMonthly,
      },
      byCategory,
      monthlyTrend,
    };
  } catch (error) {
    console.error("[Analytics API] getExpenseAnalysis ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Income Analysis
// ============================================================================

export async function getIncomeAnalysis(
  dateRange?: DateRange
): Promise<IncomeAnalysis> {
  console.log("[Analytics API] getIncomeAnalysis via Supabase", dateRange);
  try {
    const accountIds = await getWorkspaceAccountIds();

    if (accountIds.length === 0) {
      return {
        summary: { totalIncome: 0, transactionCount: 0, categoryCount: 0, avgMonthly: 0 },
        byCategory: [],
        monthlyTrend: [],
      };
    }

    const now = new Date();
    const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];
    const endDate = dateRange?.endDate || now.toISOString().split("T")[0];

    // Get income transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select(`
        amount,
        date,
        category:categories(id, name, color)
      `)
      .in("account_id", accountIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .gt("amount", 0);

    const txns = transactions || [];
    const totalIncome = txns.reduce((sum: number, t: any) => sum + t.amount, 0);

    // Group by category
    const categoryMap: Record<string, { amount: number; count: number; name: string; color: string }> = {};
    txns.forEach((t: any) => {
      const catId = t.category?.id || "uncategorized";
      const catName = t.category?.name || "Uncategorized";
      const catColor = t.category?.color || "#22c55e";

      if (!categoryMap[catId]) {
        categoryMap[catId] = { amount: 0, count: 0, name: catName, color: catColor };
      }
      categoryMap[catId].amount += t.amount;
      categoryMap[catId].count++;
    });

    const byCategory: CategoryBreakdown[] = Object.values(categoryMap)
      .map(cat => ({
        name: cat.name,
        amount: cat.amount,
        color: cat.color,
        count: cat.count,
        percentage: totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly trend
    const monthlyMap: Record<string, number> = {};
    txns.forEach((t: any) => {
      const month = t.date.substring(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + t.amount;
    });

    const monthlyTrend: MonthlyTrendItem[] = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => {
        const [year, mon] = month.split("-");
        const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
        return {
          month,
          label: getMonthLabel(date),
          amount,
        };
      });

    const avgMonthly = monthlyTrend.length > 0 ? totalIncome / monthlyTrend.length : 0;

    console.log("[Analytics API] getIncomeAnalysis response");
    return {
      summary: {
        totalIncome,
        transactionCount: txns.length,
        categoryCount: byCategory.length,
        avgMonthly,
      },
      byCategory,
      monthlyTrend,
    };
  } catch (error) {
    console.error("[Analytics API] getIncomeAnalysis ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Profit & Loss Report
// ============================================================================

export async function getProfitLoss(
  dateRange?: DateRange
): Promise<ProfitLossReport> {
  console.log("[Analytics API] getProfitLoss via Supabase", dateRange);
  try {
    const incomeAnalysis = await getIncomeAnalysis(dateRange);
    const expenseAnalysis = await getExpenseAnalysis(dateRange);

    const totalIncome = incomeAnalysis.summary.totalIncome;
    const totalExpenses = expenseAnalysis.summary.totalExpenses;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Get previous period for comparison
    const now = new Date();
    const monthsInRange = Math.max(incomeAnalysis.monthlyTrend.length, 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - (monthsInRange * 2), 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - monthsInRange, 0);

    const prevDateRange = {
      startDate: prevStart.toISOString().split("T")[0],
      endDate: prevEnd.toISOString().split("T")[0],
    };

    const prevIncome = await getIncomeAnalysis(prevDateRange);
    const prevExpense = await getExpenseAnalysis(prevDateRange);

    const prevTotalIncome = prevIncome.summary.totalIncome;
    const prevTotalExpenses = prevExpense.summary.totalExpenses;
    const prevProfit = prevTotalIncome - prevTotalExpenses;

    console.log("[Analytics API] getProfitLoss response");
    return {
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
      },
      incomeByCategory: incomeAnalysis.byCategory,
      expensesByCategory: expenseAnalysis.byCategory,
      comparison: {
        income: {
          previous: prevTotalIncome,
          change: totalIncome - prevTotalIncome,
          percentChange: prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0,
        },
        expenses: {
          previous: prevTotalExpenses,
          change: totalExpenses - prevTotalExpenses,
          percentChange: prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0,
        },
        profit: {
          previous: prevProfit,
          change: netProfit - prevProfit,
          percentChange: prevProfit !== 0 ? ((netProfit - prevProfit) / Math.abs(prevProfit)) * 100 : 0,
        },
      },
    };
  } catch (error) {
    console.error("[Analytics API] getProfitLoss ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Cash Flow Report
// ============================================================================

export async function getCashFlow(
  groupBy: CashFlowGroupBy = "month",
  dateRange?: DateRange
): Promise<CashFlowReport> {
  console.log("[Analytics API] getCashFlow via Supabase", groupBy, dateRange);
  try {
    const accountIds = await getWorkspaceAccountIds();

    if (accountIds.length === 0) {
      return {
        summary: { totalInflow: 0, totalOutflow: 0, netCashFlow: 0, averageNetFlow: 0 },
        trend: [],
      };
    }

    const now = new Date();
    const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];
    const endDate = dateRange?.endDate || now.toISOString().split("T")[0];

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, date")
      .in("account_id", accountIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    const txns = transactions || [];

    // Group by period
    const periodMap: Record<string, { inflow: number; outflow: number }> = {};

    txns.forEach((t: any) => {
      let period: string;
      const date = new Date(t.date);

      switch (groupBy) {
        case "day":
          period = t.date;
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split("T")[0];
          break;
        case "month":
        default:
          period = t.date.substring(0, 7);
          break;
      }

      if (!periodMap[period]) {
        periodMap[period] = { inflow: 0, outflow: 0 };
      }

      if (t.amount > 0) {
        periodMap[period].inflow += t.amount;
      } else {
        periodMap[period].outflow += Math.abs(t.amount);
      }
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    let runningBalance = 0;

    const trend: CashFlowPeriod[] = Object.entries(periodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => {
        const netFlow = data.inflow - data.outflow;
        runningBalance += netFlow;
        totalInflow += data.inflow;
        totalOutflow += data.outflow;

        return {
          period,
          inflow: data.inflow,
          outflow: data.outflow,
          netFlow,
          runningBalance,
        };
      });

    const netCashFlow = totalInflow - totalOutflow;
    const averageNetFlow = trend.length > 0 ? netCashFlow / trend.length : 0;

    console.log("[Analytics API] getCashFlow response");
    return {
      summary: {
        totalInflow,
        totalOutflow,
        netCashFlow,
        averageNetFlow,
      },
      trend,
    };
  } catch (error) {
    console.error("[Analytics API] getCashFlow ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Budget vs Actual Report
// ============================================================================

export async function getBudgetVsActual(
  dateRange?: DateRange
): Promise<BudgetVsActualReport> {
  console.log("[Analytics API] getBudgetVsActual via Supabase", dateRange);
  try {
    const userId = await getCurrentUserId();
    const accountIds = await getWorkspaceAccountIds();

    const now = new Date();
    const period = {
      startDate: dateRange?.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
      endDate: dateRange?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
    };

    // Get active budgets
    const { data: budgets } = await supabase
      .from("budgets")
      .select(`
        id,
        category_id,
        amount,
        category:categories(id, name, color)
      `)
      .eq("profile_id", userId)
      .eq("is_active", true);

    if (!budgets || budgets.length === 0 || accountIds.length === 0) {
      return {
        period,
        summary: {
          totalBudgeted: 0,
          totalActual: 0,
          totalVariance: 0,
          variancePercent: 0,
          budgetCount: 0,
          overBudgetCount: 0,
          underBudgetCount: 0,
        },
        comparison: [],
      };
    }

    // Get spending for each category
    const categoryIds = budgets.map((b: any) => b.category_id);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .in("account_id", accountIds)
      .in("category_id", categoryIds)
      .gte("date", period.startDate)
      .lte("date", period.endDate)
      .lt("amount", 0);

    // Sum spending by category
    const spendingMap: Record<string, number> = {};
    (transactions || []).forEach((t: any) => {
      spendingMap[t.category_id] = (spendingMap[t.category_id] || 0) + Math.abs(t.amount);
    });

    let totalBudgeted = 0;
    let totalActual = 0;
    let overBudgetCount = 0;
    let underBudgetCount = 0;

    const comparison = budgets.map((budget: any) => {
      const actualAmount = spendingMap[budget.category_id] || 0;
      const variance = budget.amount - actualAmount;
      const variancePercent = budget.amount > 0 ? (variance / budget.amount) * 100 : 0;
      const utilizationPercent = budget.amount > 0 ? (actualAmount / budget.amount) * 100 : 0;

      totalBudgeted += budget.amount;
      totalActual += actualAmount;

      const status: "over" | "warning" | "under" = actualAmount > budget.amount ? "over" : actualAmount > budget.amount * 0.8 ? "warning" : "under";
      if (status === "over") overBudgetCount++;
      else if (status === "under") underBudgetCount++;

      return {
        budgetId: budget.id,
        categoryId: budget.category_id,
        categoryName: budget.category?.name || "Unknown",
        categoryColor: budget.category?.color || "#6b7280",
        budgetAmount: budget.amount,
        actualAmount,
        variance,
        variancePercent,
        utilizationPercent,
        status,
      };
    });

    const totalVariance = totalBudgeted - totalActual;
    const variancePercent = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

    console.log("[Analytics API] getBudgetVsActual response");
    return {
      period,
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance,
        variancePercent,
        budgetCount: budgets.length,
        overBudgetCount,
        underBudgetCount,
      },
      comparison,
    };
  } catch (error) {
    console.error("[Analytics API] getBudgetVsActual ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Calendar Data
// ============================================================================

export async function getCalendarData(
  year: number,
  month: number
): Promise<CalendarMonthData> {
  console.log("[Analytics API] getCalendarData via Supabase", year, month);
  try {
    const accountIds = await getWorkspaceAccountIds();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const startDate = monthStart.toISOString().split("T")[0];
    const endDate = monthEnd.toISOString().split("T")[0];

    if (accountIds.length === 0) {
      return {
        month: formatMonth(monthStart),
        days: [],
        summary: { totalIncome: 0, totalExpenses: 0, netCashFlow: 0, transactionCount: 0 },
      };
    }

    // Get transactions for the month
    const { data: transactions } = await supabase
      .from("transactions")
      .select(`
        id,
        date,
        amount,
        description,
        category:categories(id, name, color)
      `)
      .in("account_id", accountIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    const txns = transactions || [];

    // Group by day
    const dayMap: Record<string, CalendarEvent[]> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    txns.forEach((t: any) => {
      if (!dayMap[t.date]) {
        dayMap[t.date] = [];
      }

      const eventType = t.amount > 0 ? "income" : "expense";
      if (t.amount > 0) totalIncome += t.amount;
      else totalExpenses += Math.abs(t.amount);

      dayMap[t.date].push({
        id: t.id,
        date: t.date,
        type: eventType,
        title: t.description,
        amount: t.amount,
        category: t.category ? {
          id: t.category.id,
          name: t.category.name,
          color: t.category.color,
        } : undefined,
      });
    });

    // Build days array
    const days: CalendarDay[] = [];
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const events = dayMap[date] || [];

      const dayIncome = events.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
      const dayExpenses = events.filter(e => e.type === "expense").reduce((sum, e) => sum + Math.abs(e.amount), 0);

      days.push({
        date,
        events,
        totals: {
          income: dayIncome,
          expenses: dayExpenses,
          net: dayIncome - dayExpenses,
        },
      });
    }

    console.log("[Analytics API] getCalendarData response");
    return {
      month: formatMonth(monthStart),
      days,
      summary: {
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        transactionCount: txns.length,
      },
    };
  } catch (error) {
    console.error("[Analytics API] getCalendarData ERROR:", error);
    throw error;
  }
}
