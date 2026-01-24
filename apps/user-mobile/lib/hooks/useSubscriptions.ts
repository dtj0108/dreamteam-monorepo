import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateSubscriptionInput,
  DetectSubscriptionsResponse,
  SubscriptionFilters,
  SubscriptionsResponse,
  UpdateSubscriptionInput,
  UpcomingSubscriptionsResponse,
  createSubscription,
  deleteSubscription,
  detectSubscriptions,
  getSubscription,
  getSubscriptions,
  getUpcomingSubscriptions,
  updateSubscription,
} from "../api/subscriptions";
import { Subscription } from "../types/finance";

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  lists: () => [...subscriptionKeys.all, "list"] as const,
  list: (filters?: SubscriptionFilters) =>
    [...subscriptionKeys.lists(), filters] as const,
  upcoming: (days?: number) =>
    [...subscriptionKeys.all, "upcoming", days] as const,
  details: () => [...subscriptionKeys.all, "detail"] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  detected: () => [...subscriptionKeys.all, "detected"] as const,
};

export function useSubscriptions(filters?: SubscriptionFilters) {
  return useQuery<SubscriptionsResponse>({
    queryKey: subscriptionKeys.list(filters),
    queryFn: () => getSubscriptions(filters),
  });
}

export function useSubscription(id: string) {
  return useQuery<Subscription>({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => getSubscription(id),
    enabled: !!id,
  });
}

export function useUpcomingSubscriptions(days: number = 7) {
  return useQuery<UpcomingSubscriptionsResponse>({
    queryKey: subscriptionKeys.upcoming(days),
    queryFn: () => getUpcomingSubscriptions(days),
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionInput) => createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.upcoming() });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionInput }) =>
      updateSubscription(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.upcoming() });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.upcoming() });
    },
  });
}

export function useDetectSubscriptions() {
  const queryClient = useQueryClient();

  return useMutation<DetectSubscriptionsResponse>({
    mutationFn: detectSubscriptions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detected() });
    },
  });
}
