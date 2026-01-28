import { del, get, post, put } from "../api";
import { RecurringRule, RecurringFrequency } from "../types/finance";

// Response Types
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

// Filter Types
export interface RecurringRuleFilters {
  includeInactive?: boolean;
}

// Input Types
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

// Helper function
function buildQueryString(filters: RecurringRuleFilters): string {
  const params = new URLSearchParams();
  if (filters.includeInactive) params.append("includeInactive", "true");
  const query = params.toString();
  return query ? `?${query}` : "";
}

// API Functions
export async function getRecurringRules(
  filters: RecurringRuleFilters = {}
): Promise<RecurringRulesResponse> {
  const query = buildQueryString(filters);
  return get<RecurringRulesResponse>(`/api/recurring${query}`);
}

export async function getRecurringRule(id: string): Promise<RecurringRule> {
  return get<RecurringRule>(`/api/recurring/${id}`);
}

export async function getUpcomingRecurring(
  days: number = 7
): Promise<UpcomingRecurringResponse> {
  return get<UpcomingRecurringResponse>(`/api/recurring/upcoming?days=${days}`);
}

export async function createRecurringRule(
  data: CreateRecurringRuleInput
): Promise<RecurringRule> {
  return post<RecurringRule>("/api/recurring", data);
}

export async function updateRecurringRule(
  id: string,
  data: UpdateRecurringRuleInput
): Promise<RecurringRule> {
  return put<RecurringRule>(`/api/recurring/${id}`, data);
}

export async function deleteRecurringRule(id: string): Promise<void> {
  return del(`/api/recurring/${id}`);
}

// Execute a recurring rule immediately (creates a transaction)
export async function executeRecurringRule(id: string): Promise<{ transaction_id: string }> {
  return post<{ transaction_id: string }>(`/api/recurring/${id}/execute`);
}
