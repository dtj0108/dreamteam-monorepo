import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  moveDealStage,
  getDealsByStage,
  getDealStats,
  DealStats,
} from "../api/deals";
import {
  Deal,
  DealsResponse,
  CreateDealInput,
  UpdateDealInput,
  DealsQueryParams,
  OpportunityStage,
} from "../types/sales";

// Query keys
export const dealKeys = {
  all: ["deals"] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  list: (params?: DealsQueryParams) => [...dealKeys.lists(), params] as const,
  details: () => [...dealKeys.all, "detail"] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
  byStage: () => [...dealKeys.all, "byStage"] as const,
  stats: () => [...dealKeys.all, "stats"] as const,
};

// Queries
export function useDeals(params?: DealsQueryParams) {
  return useQuery<DealsResponse>({
    queryKey: dealKeys.list(params),
    queryFn: () => getDeals(params),
  });
}

export function useDeal(id: string) {
  return useQuery<Deal>({
    queryKey: dealKeys.detail(id),
    queryFn: () => getDeal(id),
    enabled: !!id,
  });
}

export function useDealsByStage() {
  return useQuery<Record<OpportunityStage, Deal[]>>({
    queryKey: dealKeys.byStage(),
    queryFn: getDealsByStage,
  });
}

export function useDealStats() {
  return useQuery<DealStats>({
    queryKey: dealKeys.stats(),
    queryFn: getDealStats,
  });
}

// Mutations
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDealInput) => createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealKeys.byStage() });
      queryClient.invalidateQueries({ queryKey: dealKeys.stats() });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<UpdateDealInput, "id"> }) =>
      updateDeal(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dealKeys.byStage() });
      queryClient.invalidateQueries({ queryKey: dealKeys.stats() });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealKeys.byStage() });
      queryClient.invalidateQueries({ queryKey: dealKeys.stats() });
    },
  });
}

export function useMoveDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: OpportunityStage }) =>
      moveDealStage(id, stage),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dealKeys.byStage() });
      queryClient.invalidateQueries({ queryKey: dealKeys.stats() });
    },
  });
}
