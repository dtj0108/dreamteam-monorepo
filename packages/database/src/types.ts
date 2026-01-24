// ============================================
// Database Types
// ============================================

export type AccountType = 
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'loan'
  | 'other';

export type CategoryType = 'expense' | 'income';

export type RecurringFrequency = 
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type CalendarEventType = 'subscription' | 'income' | 'expense' | 'budget_reset';

export type IndustryType = 'saas' | 'retail' | 'service' | 'general';

// ============================================
// Database Row Types
// ============================================

export interface Profile {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  company_name: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  industry_type: IndustryType;
  created_at: string;
  updated_at: string;
}

export interface KPIInput {
  id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  // SaaS metrics
  customer_count: number | null;
  customer_acquisition_cost: number | null;
  lifetime_value: number | null;
  churned_customers: number | null;
  // Retail metrics
  inventory_value: number | null;
  units_sold: number | null;
  // Service metrics
  billable_hours: number | null;
  employee_count: number | null;
  utilization_target: number | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string | null;
  last_four: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parent_id: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  date: string;
  description: string;
  notes: string | null;
  is_transfer: boolean;
  transfer_pair_id: string | null;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringRule {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  frequency: RecurringFrequency;
  next_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
}

export interface BudgetAlert {
  id: string;
  budget_id: string;
  threshold_percent: number;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  merchant_pattern: string;
  amount: number;
  frequency: RecurringFrequency;
  next_renewal_date: string;
  last_charge_date: string | null;
  category_id: string | null;
  reminder_days_before: number;
  is_active: boolean;
  is_auto_detected: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Plaid Types
// ============================================

export type PlaidItemStatus = 'good' | 'error' | 'pending';

export interface PlaidItem {
  id: string;
  workspace_id: string;
  user_id: string;
  plaid_item_id: string;
  plaid_access_token: string;
  plaid_institution_id: string | null;
  institution_name: string | null;
  institution_logo: string | null;
  consent_expiration_time: string | null;
  update_type: string;
  status: PlaidItemStatus;
  error_code: string | null;
  error_message: string | null;
  last_successful_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaidSyncCursor {
  id: string;
  plaid_item_id: string;
  cursor: string | null;
  has_more: boolean;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlaidItemWithAccounts extends PlaidItem {
  accounts: Account[];
}

// ============================================
// Extended Types with Relations
// ============================================

export interface TransactionWithCategory extends Transaction {
  category: Category | null;
}

export interface TransactionWithDetails extends Transaction {
  category: Category | null;
  account: Account;
}

export interface AccountWithTransactions extends Account {
  transactions: Transaction[];
}

export interface RecurringRuleWithDetails extends RecurringRule {
  category: Category | null;
  account: Account;
}

export interface BudgetWithCategory extends Budget {
  category: Category;
}

export interface BudgetWithSpending extends BudgetWithCategory {
  spent: number;
  remaining: number;
  percentUsed: number;
  alerts: BudgetAlert[];
}

export interface SubscriptionWithCategory extends Subscription {
  category: Category | null;
}

export interface SubscriptionWithRenewalInfo extends SubscriptionWithCategory {
  daysUntilRenewal: number;
  isUpcoming: boolean; // true if within reminder_days_before
  monthlyEquivalent: number; // normalized to monthly cost
}

// ============================================
// Calendar Types
// ============================================

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string;
  title: string;
  amount?: number;
  category?: string;
  categoryColor?: string;
  color: string;
}

export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  subscription: '#f43f5e', // rose-500
  income: '#10b981', // emerald-500
  expense: '#f59e0b', // amber-500
  budget_reset: '#3b82f6', // blue-500
};

export const CALENDAR_EVENT_LABELS: Record<CalendarEventType, string> = {
  subscription: 'Bill/Subscription',
  income: 'Expected Income',
  expense: 'Recurring Expense',
  budget_reset: 'Budget Reset',
};

// ============================================
// Form/Input Types
// ============================================

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  institution?: string;
  last_four?: string;
  currency?: string;
}

export interface UpdateAccountInput extends Partial<CreateAccountInput> {
  is_active?: boolean;
}

export interface CreateTransactionInput {
  account_id: string;
  category_id?: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parent_id?: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

export interface CreateRecurringRuleInput {
  account_id: string;
  category_id?: string;
  amount: number;
  description: string;
  frequency: RecurringFrequency;
  next_date: string;
  end_date?: string;
}

export interface UpdateRecurringRuleInput extends Partial<CreateRecurringRuleInput> {
  is_active?: boolean;
}

export interface CreateBudgetInput {
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date?: string;
  rollover?: boolean;
  alert_thresholds?: number[];
}

export interface UpdateBudgetInput extends Partial<Omit<CreateBudgetInput, 'category_id'>> {
  is_active?: boolean;
}

export interface CreateSubscriptionInput {
  name: string;
  merchant_pattern: string;
  amount: number;
  frequency: RecurringFrequency;
  next_renewal_date: string;
  last_charge_date?: string;
  category_id?: string;
  reminder_days_before?: number;
  is_auto_detected?: boolean;
  notes?: string;
}

export interface UpdateSubscriptionInput extends Partial<CreateSubscriptionInput> {
  is_active?: boolean;
}

export interface DetectedSubscription {
  name: string;
  merchant_pattern: string;
  amount: number;
  frequency: RecurringFrequency;
  next_renewal_date: string;
  last_charge_date: string;
  confidence: number; // 0-100 score
  transaction_count: number;
  sample_transactions: Transaction[];
}

// ============================================
// UI Helper Types
// ============================================

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  checking: 'landmark',
  savings: 'piggy-bank',
  credit_card: 'credit-card',
  cash: 'banknote',
  investment: 'trending-up',
  loan: 'hand-coins',
  other: 'wallet',
};

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

// Monthly multipliers for normalizing subscription costs
export const FREQUENCY_TO_MONTHLY: Record<RecurringFrequency, number> = {
  daily: 30,
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 0.33,
  yearly: 0.083,
};

/**
 * Calculate monthly equivalent cost for a subscription
 */
export function calculateMonthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  return Math.abs(amount) * FREQUENCY_TO_MONTHLY[frequency];
}

/**
 * Calculate days until next renewal
 */
export function calculateDaysUntilRenewal(nextRenewalDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(nextRenewalDate);
  renewal.setHours(0, 0, 0, 0);
  const diffTime = renewal.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Balance Summary Types
// ============================================

export interface BalanceSummary {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  byType: Record<AccountType, number>;
}

export function calculateBalanceSummary(accounts: Account[]): BalanceSummary {
  const byType: Record<AccountType, number> = {
    checking: 0,
    savings: 0,
    credit_card: 0,
    cash: 0,
    investment: 0,
    loan: 0,
    other: 0,
  };

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    if (!account.is_active) continue;
    
    byType[account.type] += account.balance;

    // Credit cards and loans are liabilities (negative balances represent debt)
    if (account.type === 'credit_card' || account.type === 'loan') {
      totalLiabilities += Math.abs(account.balance);
    } else {
      totalAssets += account.balance;
    }
  }

  return {
    totalBalance: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    byType,
  };
}

// ============================================
// KPI Types
// ============================================

export interface KPIMetric {
  id: string;
  name: string;
  value: number | null;
  previousValue?: number | null;
  change?: number | null;
  changePercent?: number | null;
  format: 'currency' | 'percent' | 'number';
  trend?: 'up' | 'down' | 'neutral';
  isManualInput: boolean;
  description?: string;
}

export interface KPIDashboardData {
  industryType: IndustryType;
  period: {
    start: string;
    end: string;
    label: string;
  };
  metrics: KPIMetric[];
  trends: {
    label: string;
    value: number;
  }[];
  manualInputs: KPIInput | null;
}

export interface CreateKPIInputInput {
  period_start: string;
  period_end: string;
  customer_count?: number;
  customer_acquisition_cost?: number;
  lifetime_value?: number;
  churned_customers?: number;
  inventory_value?: number;
  units_sold?: number;
  billable_hours?: number;
  employee_count?: number;
  utilization_target?: number;
}

export interface UpdateKPIInputInput extends Partial<CreateKPIInputInput> {}

export const INDUSTRY_TYPE_LABELS: Record<IndustryType, string> = {
  saas: 'SaaS / Software',
  retail: 'Retail / E-commerce',
  service: 'Professional Services',
  general: 'General Business',
};

export const INDUSTRY_TYPE_DESCRIPTIONS: Record<IndustryType, string> = {
  saas: 'Software as a Service with recurring subscriptions',
  retail: 'Product sales with inventory management',
  service: 'Consulting, agencies, or professional services',
  general: 'Standard business metrics',
};

