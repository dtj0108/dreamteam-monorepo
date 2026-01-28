import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BudgetAlertsResponse,
  BudgetDetailResponse,
  BudgetFilters,
  BudgetsResponse,
  CreateBudgetInput,
  UpdateBudgetInput,
  createBudget,
  deleteBudget,
  getBudget,
  getBudgetAlerts,
  getBudgets,
  updateBudget,
} from "../api/budgets";
import { Budget } from "../types/finance";

export const budgetKeys = {
  all: ["budgets"] as const,
  lists: () => [...budgetKeys.all, "list"] as const,
  list: (filters?: BudgetFilters) => [...budgetKeys.lists(), filters] as const,
  details: () => [...budgetKeys.all, "detail"] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
  alerts: (threshold?: number) => [...budgetKeys.all, "alerts", threshold] as const,
};

export function useBudgets(filters?: BudgetFilters) {
  return useQuery<BudgetsResponse>({
    queryKey: budgetKeys.list(filters),
    queryFn: () => getBudgets(filters),
  });
}

export function useBudget(id: string) {
  return useQuery<BudgetDetailResponse>({
    queryKey: budgetKeys.detail(id),
    queryFn: () => getBudget(id),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBudgetInput) => createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetInput }) =>
      updateBudget(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(id) });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
    },
  });
}

export function useBudgetAlerts(threshold: number = 80) {
  return useQuery<BudgetAlertsResponse>({
    queryKey: budgetKeys.alerts(threshold),
    queryFn: () => getBudgetAlerts(threshold),
  });
}
