import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { post } from "../api";
import { Subscription, SubscriptionFrequency } from "../types/finance";

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

// Get monthly equivalent amount for any frequency
function getMonthlyAmount(amount: number, frequency: SubscriptionFrequency): number {
  switch (frequency) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4.33;
    case "biweekly":
      return amount * 2.17;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

// ============================================================================
// Types
// ============================================================================

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

export interface SubscriptionFilters {
  includeInactive?: boolean;
}

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

// ============================================================================
// Subscriptions CRUD
// ============================================================================

export async function getSubscriptions(
  filters: SubscriptionFilters = {}
): Promise<SubscriptionsResponse> {
  console.log("[Subscriptions API] getSubscriptions via Supabase", filters);
  try {
    const userId = await getCurrentUserId();

    let query = supabase
      .from("subscriptions")
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .eq("user_id", userId)
      .order("next_renewal_date", { ascending: true });

    if (!filters.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: subscriptions, error } = await query;

    if (error) throw error;

    // Calculate totals
    let monthlyTotal = 0;
    let upcomingThisWeek = 0;
    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    (subscriptions || []).forEach((sub: Subscription) => {
      if (sub.is_active) {
        monthlyTotal += getMonthlyAmount(sub.amount, sub.frequency);

        if (sub.next_renewal_date) {
          const renewalDate = new Date(sub.next_renewal_date);
          if (renewalDate >= now && renewalDate <= oneWeekLater) {
            upcomingThisWeek++;
          }
        }
      }
    });

    const activeCount = (subscriptions || []).filter((s: Subscription) => s.is_active).length;

    console.log("[Subscriptions API] getSubscriptions response:", (subscriptions || []).length, "subscriptions");
    return {
      subscriptions: subscriptions || [],
      totals: {
        monthlyTotal,
        activeCount,
        upcomingThisWeek,
      },
    };
  } catch (error) {
    console.error("[Subscriptions API] getSubscriptions ERROR:", error);
    throw error;
  }
}

export async function getSubscription(id: string): Promise<Subscription> {
  console.log("[Subscriptions API] getSubscription via Supabase", id);
  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Subscriptions API] getSubscription response:", subscription.name);
    return subscription;
  } catch (error) {
    console.error("[Subscriptions API] getSubscription ERROR:", error);
    throw error;
  }
}

export async function getUpcomingSubscriptions(
  days: number = 7
): Promise<UpcomingSubscriptionsResponse> {
  console.log("[Subscriptions API] getUpcomingSubscriptions via Supabase", days);
  try {
    const userId = await getCurrentUserId();

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("next_renewal_date", now.toISOString().split("T")[0])
      .lte("next_renewal_date", futureDate.toISOString().split("T")[0])
      .order("next_renewal_date", { ascending: true });

    if (error) throw error;

    console.log("[Subscriptions API] getUpcomingSubscriptions response:", (subscriptions || []).length, "subscriptions");
    return { subscriptions: subscriptions || [] };
  } catch (error) {
    console.error("[Subscriptions API] getUpcomingSubscriptions ERROR:", error);
    throw error;
  }
}

export async function createSubscription(
  data: CreateSubscriptionInput
): Promise<Subscription> {
  console.log("[Subscriptions API] createSubscription via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        name: data.name,
        amount: data.amount,
        frequency: data.frequency,
        next_renewal_date: data.next_renewal_date,
        category_id: data.category_id || null,
        notes: data.notes || null,
        is_active: true,
        is_auto_detected: false,
      })
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .single();

    if (error) throw error;

    console.log("[Subscriptions API] createSubscription response:", subscription);
    return subscription;
  } catch (error) {
    console.error("[Subscriptions API] createSubscription ERROR:", error);
    throw error;
  }
}

export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionInput
): Promise<Subscription> {
  console.log("[Subscriptions API] updateSubscription via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.next_renewal_date !== undefined) updateData.next_renewal_date = data.next_renewal_date;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:categories(id, name, type, icon, color)
      `)
      .single();

    if (error) throw error;

    console.log("[Subscriptions API] updateSubscription response:", subscription);
    return subscription;
  } catch (error) {
    console.error("[Subscriptions API] updateSubscription ERROR:", error);
    throw error;
  }
}

export async function deleteSubscription(id: string): Promise<void> {
  console.log("[Subscriptions API] deleteSubscription via Supabase", id);
  try {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Subscriptions API] deleteSubscription success");
  } catch (error) {
    console.error("[Subscriptions API] deleteSubscription ERROR:", error);
    throw error;
  }
}

// ============================================================================
// AI Detection (Keep as HTTP - requires pattern analysis)
// ============================================================================

export async function detectSubscriptions(): Promise<DetectSubscriptionsResponse> {
  return post<DetectSubscriptionsResponse>("/api/subscriptions/detect");
}
