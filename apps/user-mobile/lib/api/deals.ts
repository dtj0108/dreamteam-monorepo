import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import {
  Deal,
  DealsResponse,
  CreateDealInput,
  UpdateDealInput,
  DealsQueryParams,
  OpportunityStage,
} from "../types/sales";

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

// ============================================================================
// Deals CRUD
// ============================================================================

export async function getDeals(params?: DealsQueryParams): Promise<DealsResponse> {
  console.log("[Deals API] getDeals via Supabase", params);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    // Build query - deals are lead_opportunities
    let query = supabase
      .from("lead_opportunities")
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Filter by stage
    if (params?.stage) {
      query = query.eq("stage", params.stage);
    }

    // Filter by lead
    if (params?.lead_id) {
      query = query.eq("lead_id", params.lead_id);
    }

    // Search by name
    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`);
    }

    // Pagination
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter to only deals in leads belonging to this workspace
    // Need to verify leads are in the workspace
    const { data: workspaceLeads } = await supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId);

    const workspaceLeadIds = new Set((workspaceLeads || []).map(l => l.id));

    const deals = (data || [])
      .filter((d: any) => !d.lead_id || workspaceLeadIds.has(d.lead_id))
      .map((d: any) => ({
        ...d,
        lead: d.lead || undefined,
      })) as Deal[];

    console.log("[Deals API] getDeals response:", deals.length, "deals");
    return { deals, total: deals.length };
  } catch (error) {
    console.error("[Deals API] getDeals ERROR:", error);
    throw error;
  }
}

export async function getDeal(id: string): Promise<Deal> {
  console.log("[Deals API] getDeal via Supabase", id);
  try {
    const { data: deal, error } = await supabase
      .from("lead_opportunities")
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    const result: Deal = {
      ...deal,
      lead: deal.lead || undefined,
    };

    console.log("[Deals API] getDeal response:", result.name);
    return result;
  } catch (error) {
    console.error("[Deals API] getDeal ERROR:", error);
    throw error;
  }
}

export async function createDeal(data: CreateDealInput): Promise<Deal> {
  console.log("[Deals API] createDeal via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    const { data: deal, error } = await supabase
      .from("lead_opportunities")
      .insert({
        user_id: userId,
        lead_id: data.lead_id || null,
        name: data.name,
        value: data.value || null,
        stage: data.stage || "prospect",
        probability: data.probability ?? 0,
        expected_close_date: data.expected_close_date || null,
        notes: data.notes || null,
      })
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single();

    if (error) throw error;

    const result: Deal = {
      ...deal,
      lead: deal.lead || undefined,
    };

    console.log("[Deals API] createDeal response:", result);
    return result;
  } catch (error) {
    console.error("[Deals API] createDeal ERROR:", error);
    throw error;
  }
}

export async function updateDeal(
  id: string,
  data: Omit<UpdateDealInput, "id">
): Promise<Deal> {
  console.log("[Deals API] updateDeal via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.lead_id !== undefined) updateData.lead_id = data.lead_id;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.expected_close_date !== undefined) updateData.expected_close_date = data.expected_close_date;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: deal, error } = await supabase
      .from("lead_opportunities")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single();

    if (error) throw error;

    const result: Deal = {
      ...deal,
      lead: deal.lead || undefined,
    };

    console.log("[Deals API] updateDeal response:", result);
    return result;
  } catch (error) {
    console.error("[Deals API] updateDeal ERROR:", error);
    throw error;
  }
}

export async function deleteDeal(id: string): Promise<void> {
  console.log("[Deals API] deleteDeal via Supabase", id);
  try {
    const { error } = await supabase
      .from("lead_opportunities")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Deals API] deleteDeal success");
  } catch (error) {
    console.error("[Deals API] deleteDeal ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Move Deal Stage
// ============================================================================

export async function moveDealStage(
  id: string,
  stage: OpportunityStage
): Promise<Deal> {
  console.log("[Deals API] moveDealStage via Supabase", id, stage);
  try {
    const { data: deal, error } = await supabase
      .from("lead_opportunities")
      .update({
        stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single();

    if (error) throw error;

    const result: Deal = {
      ...deal,
      lead: deal.lead || undefined,
    };

    console.log("[Deals API] moveDealStage response:", result);
    return result;
  } catch (error) {
    console.error("[Deals API] moveDealStage ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Client-Side Aggregation Functions (unchanged, use getDeals internally)
// ============================================================================

// Get deals grouped by stage (for Kanban board)
export async function getDealsByStage(): Promise<Record<OpportunityStage, Deal[]>> {
  const response = await getDeals();
  const deals = response.deals;

  const grouped: Record<OpportunityStage, Deal[]> = {
    prospect: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    closed_won: [],
    closed_lost: [],
  };

  deals.forEach((deal) => {
    if (grouped[deal.stage]) {
      grouped[deal.stage].push(deal);
    }
  });

  return grouped;
}

// Calculate deal statistics
export interface DealStats {
  totalCount: number;
  totalValue: number;
  weightedValue: number;
  avgDealSize: number;
  byStage: Record<OpportunityStage, { count: number; value: number }>;
}

export async function getDealStats(): Promise<DealStats> {
  const response = await getDeals();
  const deals = response.deals;

  const byStage: Record<OpportunityStage, { count: number; value: number }> = {
    prospect: { count: 0, value: 0 },
    qualified: { count: 0, value: 0 },
    proposal: { count: 0, value: 0 },
    negotiation: { count: 0, value: 0 },
    closed_won: { count: 0, value: 0 },
    closed_lost: { count: 0, value: 0 },
  };

  let totalValue = 0;
  let weightedValue = 0;

  deals.forEach((deal) => {
    const value = deal.value || 0;
    totalValue += value;
    weightedValue += value * (deal.probability / 100);

    if (byStage[deal.stage]) {
      byStage[deal.stage].count += 1;
      byStage[deal.stage].value += value;
    }
  });

  return {
    totalCount: deals.length,
    totalValue,
    weightedValue,
    avgDealSize: deals.length > 0 ? totalValue / deals.length : 0,
    byStage,
  };
}
