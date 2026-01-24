// Finance Module Types

// Plaid Integration Types
export type PlaidItemStatus = "good" | "error" | "pending";

export interface PlaidItem {
  id: string;
  plaid_item_id: string;
  institution_name: string;
  status: PlaidItemStatus;
  error_code?: string;
  error_message?: string;
  last_successful_update?: string;
  created_at: string;
  accounts: PlaidAccount[];
}

export interface PlaidAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  last_four?: string;
  is_plaid_linked: boolean;
}

export interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface ExchangeTokenRequest {
  publicToken: string;
  institutionId?: string;
  institutionName?: string;
}

export interface ExchangeTokenResponse {
  success: boolean;
  plaidItemId: string;
  accountsCreated: number;
  accounts: PlaidAccount[];
}

export interface PlaidSyncResponse {
  success: boolean;
  added: number;
  modified: number;
  removed: number;
}

export interface PlaidAccountsResponse {
  items: PlaidItem[];
}

export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan"
  | "other";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  institution?: string;
  last_four?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id?: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  is_transfer: boolean;
  transfer_pair_id?: string;
  recurring_rule_id?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  category?: Category;
  account?: Account;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  parent_id?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type BudgetPeriod = "weekly" | "biweekly" | "monthly" | "yearly";

export interface Budget {
  id: string;
  profile_id: string;
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  rollover: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined/computed
  category?: Category;
  spent?: number;
  remaining?: number;
  percentUsed?: number;
}

export type GoalType =
  | "revenue"
  | "profit"
  | "valuation"
  | "runway"
  | "revenue_multiple";

export interface Goal {
  id: string;
  profile_id: string;
  type: GoalType;
  name: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date?: string;
  notes?: string;
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  next_renewal_date: string;
  last_charge_date?: string;
  category_id?: string;
  is_active: boolean;
  is_auto_detected: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
}

// Analytics types
export interface AnalyticsOverview {
  currentMonth: {
    income: number;
    expenses: number;
    profit: number;
  };
  lastMonth: {
    income: number;
    expenses: number;
    profit: number;
  };
  changes: {
    income: number;
    expenses: number;
    profit: number;
  };
  totalBalance: number;
  trend?: TrendDataPoint[];
}

export interface TrendDataPoint {
  month: string; // "2024-01"
  label: string; // "Jan"
  income: number;
  expenses: number;
  profit: number;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  color: string;
  count: number;
  percentage?: number;
}

export interface MonthlyTrendItem {
  month: string;
  label: string;
  amount: number;
}

export interface ExpenseAnalysis {
  summary: {
    totalExpenses: number;
    transactionCount: number;
    categoryCount: number;
    avgMonthly: number;
  };
  byCategory: CategoryBreakdown[];
  monthlyTrend: MonthlyTrendItem[];
}

export interface IncomeAnalysis {
  summary: {
    totalIncome: number;
    transactionCount: number;
    categoryCount: number;
    avgMonthly: number;
  };
  byCategory: CategoryBreakdown[];
  monthlyTrend: MonthlyTrendItem[];
}

export interface ProfitLossReport {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  incomeByCategory: CategoryBreakdown[];
  expensesByCategory: CategoryBreakdown[];
  comparison: {
    income: { previous: number; change: number; percentChange: number };
    expenses: { previous: number; change: number; percentChange: number };
    profit: { previous: number; change: number; percentChange: number };
  };
}

export interface CashFlowPeriod {
  period: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  runningBalance: number;
}

export interface CashFlowReport {
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    averageNetFlow: number;
  };
  trend: CashFlowPeriod[];
}

export type CashFlowGroupBy = "day" | "week" | "month";

// Budget vs Actual Report
export type BudgetStatus = "over" | "warning" | "under";

export interface BudgetComparison {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  utilizationPercent: number;
  status: BudgetStatus;
}

export interface BudgetVsActualReport {
  period: DateRange;
  summary: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    variancePercent: number;
    budgetCount: number;
    overBudgetCount: number;
    underBudgetCount: number;
  };
  comparison: BudgetComparison[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AccountTotals {
  assets: number;
  liabilities: number;
  netWorth: number;
}

// Color constants for account types
export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  checking: "#3b82f6",
  savings: "#22c55e",
  credit_card: "#ef4444",
  cash: "#10b981",
  investment: "#8b5cf6",
  loan: "#f97316",
  other: "#6b7280",
};

// Color constants for budget progress
export const getBudgetProgressColor = (percentUsed: number): string => {
  if (percentUsed > 100) return "#ef4444"; // red - over budget
  if (percentUsed >= 80) return "#f59e0b"; // amber - caution
  if (percentUsed >= 50) return "#0ea5e9"; // blue - warning
  return "#22c55e"; // green - on track
};

// Transaction amount helpers
export const isIncome = (amount: number): boolean => amount > 0;
export const isExpense = (amount: number): boolean => amount < 0;

export const getTransactionColor = (amount: number): string => {
  if (amount > 0) return "#22c55e"; // green for income
  if (amount < 0) return "#ef4444"; // red for expense
  return "#6b7280"; // gray for zero/transfer
};

// Goal type colors
export const GOAL_TYPE_COLORS: Record<GoalType, string> = {
  revenue: "#22c55e", // green
  profit: "#0ea5e9", // blue
  valuation: "#8b5cf6", // purple
  runway: "#f59e0b", // amber
  revenue_multiple: "#ec4899", // pink
};

// Goal type labels
export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  revenue: "Revenue",
  profit: "Profit",
  valuation: "Valuation",
  runway: "Runway",
  revenue_multiple: "Revenue Multiple",
};

// Calculate goal progress percentage
export const getGoalProgress = (goal: Goal): number => {
  if (goal.target_amount === 0) return 0;
  return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
};

// Check if goal is on track based on time elapsed vs progress
export const isGoalOnTrack = (goal: Goal): boolean => {
  if (!goal.end_date || goal.is_achieved) return true;

  const start = new Date(goal.start_date).getTime();
  const end = new Date(goal.end_date).getTime();
  const now = Date.now();

  if (now >= end) return goal.is_achieved;
  if (now <= start) return true;

  const timeProgress = ((now - start) / (end - start)) * 100;
  const amountProgress = getGoalProgress(goal);

  return amountProgress >= timeProgress - 10; // 10% tolerance
};
