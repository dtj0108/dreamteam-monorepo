import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateGoalInput,
  GoalFilters,
  GoalsResponse,
  UpdateGoalInput,
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  updateGoal,
} from "../api/goals";
import { Goal, GoalType } from "../types/finance";

// Query key factory
export const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (filters?: GoalFilters) => [...goalKeys.lists(), filters] as const,
  details: () => [...goalKeys.all, "detail"] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
};

// Hooks
export function useGoals(filters?: GoalFilters) {
  return useQuery<GoalsResponse>({
    queryKey: goalKeys.list(filters),
    queryFn: () => getGoals(filters),
  });
}

export function useGoalsByType(type: GoalType) {
  return useGoals({ type });
}

export function useActiveGoals() {
  return useGoals({ is_achieved: false });
}

export function useAchievedGoals() {
  return useGoals({ is_achieved: true });
}

export function useGoal(id: string) {
  return useQuery<Goal>({
    queryKey: goalKeys.detail(id),
    queryFn: () => getGoal(id),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoalInput) => createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      updateGoal(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(id) });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}
