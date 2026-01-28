import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateRecurringRuleInput,
  RecurringRuleFilters,
  RecurringRulesResponse,
  UpdateRecurringRuleInput,
  UpcomingRecurringResponse,
  createRecurringRule,
  deleteRecurringRule,
  executeRecurringRule,
  getRecurringRule,
  getRecurringRules,
  getUpcomingRecurring,
  updateRecurringRule,
} from "../api/recurring";
import { RecurringRule } from "../types/finance";

export const recurringRuleKeys = {
  all: ["recurringRules"] as const,
  lists: () => [...recurringRuleKeys.all, "list"] as const,
  list: (filters?: RecurringRuleFilters) =>
    [...recurringRuleKeys.lists(), filters] as const,
  upcoming: (days?: number) =>
    [...recurringRuleKeys.all, "upcoming", days] as const,
  details: () => [...recurringRuleKeys.all, "detail"] as const,
  detail: (id: string) => [...recurringRuleKeys.details(), id] as const,
};

export function useRecurringRules(filters?: RecurringRuleFilters) {
  return useQuery<RecurringRulesResponse>({
    queryKey: recurringRuleKeys.list(filters),
    queryFn: () => getRecurringRules(filters),
  });
}

export function useRecurringRule(id: string) {
  return useQuery<RecurringRule>({
    queryKey: recurringRuleKeys.detail(id),
    queryFn: () => getRecurringRule(id),
    enabled: !!id,
  });
}

export function useUpcomingRecurring(days: number = 7) {
  return useQuery<UpcomingRecurringResponse>({
    queryKey: recurringRuleKeys.upcoming(days),
    queryFn: () => getUpcomingRecurring(days),
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringRuleInput) => createRecurringRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.upcoming() });
    },
  });
}

export function useUpdateRecurringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringRuleInput }) =>
      updateRecurringRule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.upcoming() });
    },
  });
}

export function useDeleteRecurringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.upcoming() });
    },
  });
}

export function useExecuteRecurringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => executeRecurringRule(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recurringRuleKeys.lists() });
      // Also invalidate transactions since a new one was created
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
