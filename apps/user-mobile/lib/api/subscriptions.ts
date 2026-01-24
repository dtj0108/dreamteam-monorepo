import { del, get, post, put } from "../api";
import { Subscription, SubscriptionFrequency } from "../types/finance";

// Response Types
export interface SubscriptionsResponse {
  subscriptions: Subscription[];
  totals: {
    monthlyTotal: number;
    activeCount: number;
    upcomingThisWeek: number;
  };
}

export interface UpcomingSubscriptionsResponse {
  subscriptions: Subscription[];
}

export interface DetectedSubscription {
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  confidence: number;
  transaction_count: number;
}

export interface DetectSubscriptionsResponse {
  detected: DetectedSubscription[];
}

// Filter Types
export interface SubscriptionFilters {
  includeInactive?: boolean;
}

// Input Types
export interface CreateSubscriptionInput {
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  next_renewal_date: string;
  category_id?: string;
  notes?: string;
}

export interface UpdateSubscriptionInput {
  name?: string;
  amount?: number;
  frequency?: SubscriptionFrequency;
  next_renewal_date?: string;
  category_id?: string;
  is_active?: boolean;
  notes?: string;
}

// Helper function
function buildQueryString(filters: SubscriptionFilters): string {
  const params = new URLSearchParams();
  if (filters.includeInactive) params.append("includeInactive", "true");
  const query = params.toString();
  return query ? `?${query}` : "";
}

// API Functions
export async function getSubscriptions(
  filters: SubscriptionFilters = {}
): Promise<SubscriptionsResponse> {
  const query = buildQueryString(filters);
  return get<SubscriptionsResponse>(`/api/subscriptions${query}`);
}

export async function getSubscription(id: string): Promise<Subscription> {
  return get<Subscription>(`/api/subscriptions/${id}`);
}

export async function getUpcomingSubscriptions(
  days: number = 7
): Promise<UpcomingSubscriptionsResponse> {
  return get<UpcomingSubscriptionsResponse>(
    `/api/subscriptions/upcoming?days=${days}`
  );
}

export async function createSubscription(
  data: CreateSubscriptionInput
): Promise<Subscription> {
  return post<Subscription>("/api/subscriptions", data);
}

export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionInput
): Promise<Subscription> {
  return put<Subscription>(`/api/subscriptions/${id}`, data);
}

export async function deleteSubscription(id: string): Promise<void> {
  return del(`/api/subscriptions/${id}`);
}

export async function detectSubscriptions(): Promise<DetectSubscriptionsResponse> {
  return post<DetectSubscriptionsResponse>("/api/subscriptions/detect");
}
