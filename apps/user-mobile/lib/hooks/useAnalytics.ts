import { useQuery } from "@tanstack/react-query";

import {
  getAnalyticsOverview,
  getBudgetVsActual,
  getCashFlow,
  getExpenseAnalysis,
  getIncomeAnalysis,
  getProfitLoss,
} from "../api/analytics";
import {
  AnalyticsOverview,
  BudgetVsActualReport,
  CashFlowGroupBy,
  CashFlowReport,
  DateRange,
  ExpenseAnalysis,
  IncomeAnalysis,
  ProfitLossReport,
} from "../types/finance";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: () => [...analyticsKeys.all, "overview"] as const,
  expenses: (dateRange?: DateRange) =>
    [...analyticsKeys.all, "expenses", dateRange] as const,
  income: (dateRange?: DateRange) =>
    [...analyticsKeys.all, "income", dateRange] as const,
  profitLoss: (dateRange?: DateRange) =>
    [...analyticsKeys.all, "profit-loss", dateRange] as const,
  cashFlow: (groupBy: CashFlowGroupBy, dateRange?: DateRange) =>
    [...analyticsKeys.all, "cash-flow", groupBy, dateRange] as const,
  budgetVsActual: (dateRange?: DateRange) =>
    [...analyticsKeys.all, "budget-vs-actual", dateRange] as const,
};

export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverview>({
    queryKey: analyticsKeys.overview(),
    queryFn: getAnalyticsOverview,
    staleTime: 60 * 1000, // 1 minute - dashboard data refreshes frequently
  });
}

export function useExpenseAnalysis(dateRange?: DateRange) {
  return useQuery<ExpenseAnalysis>({
    queryKey: analyticsKeys.expenses(dateRange),
    queryFn: () => getExpenseAnalysis(dateRange),
  });
}

export function useIncomeAnalysis(dateRange?: DateRange) {
  return useQuery<IncomeAnalysis>({
    queryKey: analyticsKeys.income(dateRange),
    queryFn: () => getIncomeAnalysis(dateRange),
  });
}

export function useProfitLoss(dateRange?: DateRange) {
  return useQuery<ProfitLossReport>({
    queryKey: analyticsKeys.profitLoss(dateRange),
    queryFn: () => getProfitLoss(dateRange),
  });
}

export function useCashFlow(
  groupBy: CashFlowGroupBy = "month",
  dateRange?: DateRange
) {
  return useQuery<CashFlowReport>({
    queryKey: analyticsKeys.cashFlow(groupBy, dateRange),
    queryFn: () => getCashFlow(groupBy, dateRange),
  });
}

export function useBudgetVsActual(dateRange?: DateRange) {
  return useQuery<BudgetVsActualReport>({
    queryKey: analyticsKeys.budgetVsActual(dateRange),
    queryFn: () => getBudgetVsActual(dateRange),
  });
}
