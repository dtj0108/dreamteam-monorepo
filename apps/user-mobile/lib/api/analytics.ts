import { get } from "../api";
import {
  AnalyticsOverview,
  BudgetVsActualReport,
  CalendarMonthData,
  CashFlowGroupBy,
  CashFlowReport,
  DateRange,
  ExpenseAnalysis,
  IncomeAnalysis,
  ProfitLossReport,
} from "../types/finance";

// Build query string from date range
function buildDateParams(dateRange?: DateRange): string {
  if (!dateRange) return "";
  const params = new URLSearchParams();
  if (dateRange.startDate) params.append("startDate", dateRange.startDate);
  if (dateRange.endDate) params.append("endDate", dateRange.endDate);
  return params.toString() ? `?${params.toString()}` : "";
}

/**
 * Fetch dashboard analytics overview including:
 * - Current month income/expenses/profit
 * - Last month comparison
 * - Percentage changes
 * - Total balance
 * - 6-month trend data
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return get<AnalyticsOverview>("/api/analytics/overview");
}

/**
 * Fetch expense analysis with category breakdown
 */
export async function getExpenseAnalysis(
  dateRange?: DateRange
): Promise<ExpenseAnalysis> {
  const queryString = buildDateParams(dateRange);
  return get<ExpenseAnalysis>(`/api/analytics/expenses${queryString}`);
}

/**
 * Fetch income analysis with source breakdown
 */
export async function getIncomeAnalysis(
  dateRange?: DateRange
): Promise<IncomeAnalysis> {
  const queryString = buildDateParams(dateRange);
  return get<IncomeAnalysis>(`/api/analytics/income${queryString}`);
}

/**
 * Fetch profit & loss report
 */
export async function getProfitLoss(
  dateRange?: DateRange
): Promise<ProfitLossReport> {
  const queryString = buildDateParams(dateRange);
  return get<ProfitLossReport>(`/api/analytics/profit-loss${queryString}`);
}

/**
 * Fetch cash flow report with inflow/outflow trend
 */
export async function getCashFlow(
  groupBy: CashFlowGroupBy = "month",
  dateRange?: DateRange
): Promise<CashFlowReport> {
  const params = new URLSearchParams();
  params.append("groupBy", groupBy);
  if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
  if (dateRange?.endDate) params.append("endDate", dateRange.endDate);
  return get<CashFlowReport>(`/api/analytics/cash-flow?${params.toString()}`);
}

/**
 * Fetch budget vs actual comparison report
 * Compares budgeted amounts against actual spending by category
 */
export async function getBudgetVsActual(
  dateRange?: DateRange
): Promise<BudgetVsActualReport> {
  const queryString = buildDateParams(dateRange);
  return get<BudgetVsActualReport>(`/api/analytics/budget-vs-actual${queryString}`);
}

/**
 * Fetch calendar data for a specific month
 * Returns daily breakdown of transactions and events
 */
export async function getCalendarData(
  year: number,
  month: number
): Promise<CalendarMonthData> {
  return get<CalendarMonthData>(`/api/analytics/calendar?year=${year}&month=${month}`);
}
