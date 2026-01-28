import { del, get, patch, post } from "../api";
import { Budget, BudgetAlert, BudgetPeriod, Transaction } from "../types/finance";

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

function buildQueryString(filters: BudgetFilters): string {
  const params = new URLSearchParams();
  if (filters.period) params.append("period", filters.period);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getBudgets(
  filters: BudgetFilters = {}
): Promise<BudgetsResponse> {
  const query = buildQueryString(filters);
  return get<BudgetsResponse>(`/api/budgets${query}`);
}

export async function getBudget(id: string): Promise<BudgetDetailResponse> {
  return get<BudgetDetailResponse>(`/api/budgets/${id}`);
}

export async function createBudget(data: CreateBudgetInput): Promise<Budget> {
  return post<Budget>("/api/budgets", data);
}

export async function updateBudget(
  id: string,
  data: UpdateBudgetInput
): Promise<Budget> {
  return patch<Budget>(`/api/budgets/${id}`, data);
}

export async function deleteBudget(id: string): Promise<void> {
  return del(`/api/budgets/${id}`);
}

// Budget Alerts
export interface BudgetAlertsResponse {
  alerts: BudgetAlert[];
  totalAlerts: number;
  warningCount: number;
  exceededCount: number;
}

export async function getBudgetAlerts(
  threshold: number = 80
): Promise<BudgetAlertsResponse> {
  return get<BudgetAlertsResponse>(`/api/budgets/alerts?threshold=${threshold}`);
}
