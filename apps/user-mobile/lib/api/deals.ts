import { del, get, post, put } from "../api";
import {
  Deal,
  DealsResponse,
  CreateDealInput,
  UpdateDealInput,
  DealsQueryParams,
  OpportunityStage,
} from "../types/sales";

// Deals CRUD
export async function getDeals(params?: DealsQueryParams): Promise<DealsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.stage) searchParams.append("stage", params.stage);
  if (params?.lead_id) searchParams.append("lead_id", params.lead_id);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const query = searchParams.toString();
  const url = query ? `/api/deals?${query}` : "/api/deals";
  const response = await get<Deal[] | DealsResponse>(url);

  // Handle both array and object responses
  if (Array.isArray(response)) {
    return { deals: response, total: response.length };
  }
  return response;
}

export async function getDeal(id: string): Promise<Deal> {
  return get<Deal>(`/api/deals/${id}`);
}

export async function createDeal(data: CreateDealInput): Promise<Deal> {
  return post<Deal>("/api/deals", data);
}

export async function updateDeal(
  id: string,
  data: Omit<UpdateDealInput, "id">
): Promise<Deal> {
  return put<Deal>(`/api/deals/${id}`, data);
}

export async function deleteDeal(id: string): Promise<void> {
  return del(`/api/deals/${id}`);
}

// Move deal to different stage
export async function moveDealStage(
  id: string,
  stage: OpportunityStage
): Promise<Deal> {
  return put<Deal>(`/api/deals/${id}/stage`, { stage });
}

// Get deals grouped by stage (for Kanban board)
export async function getDealsByStage(): Promise<Record<OpportunityStage, Deal[]>> {
  const response = await getDeals();
  const deals = response.deals;

  const stages: OpportunityStage[] = [
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ];

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

  const stages: OpportunityStage[] = [
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ];

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
