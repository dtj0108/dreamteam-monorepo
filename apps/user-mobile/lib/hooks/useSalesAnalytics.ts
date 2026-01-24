import { useQuery } from "@tanstack/react-query";

import {
  getSalesOverview,
  getConversionFunnel,
  getDealMetrics,
  getActivityMetrics,
  getSalesTrends,
  getTopPerformers,
} from "../api/sales-analytics";
import {
  SalesAnalyticsOverview,
  ConversionFunnelData,
  DealMetrics,
  ActivityMetrics,
  SalesTrendData,
  TopPerformer,
  SalesDateRange,
} from "../types/sales";

// Query keys
export const salesAnalyticsKeys = {
  all: ["sales-analytics"] as const,
  overview: (dateRange?: SalesDateRange) =>
    [...salesAnalyticsKeys.all, "overview", dateRange] as const,
  funnel: (dateRange?: SalesDateRange) =>
    [...salesAnalyticsKeys.all, "funnel", dateRange] as const,
  dealMetrics: (dateRange?: SalesDateRange) =>
    [...salesAnalyticsKeys.all, "deal-metrics", dateRange] as const,
  activityMetrics: (dateRange?: SalesDateRange) =>
    [...salesAnalyticsKeys.all, "activity-metrics", dateRange] as const,
  trends: (dateRange?: SalesDateRange) =>
    [...salesAnalyticsKeys.all, "trends", dateRange] as const,
  topPerformers: (dateRange?: SalesDateRange) =>
    [...salesAnalyticsKeys.all, "top-performers", dateRange] as const,
};

// Stale times
const STALE_TIMES = {
  overview: 60 * 1000, // 1 minute
  funnel: 5 * 60 * 1000, // 5 minutes
  dealMetrics: 2 * 60 * 1000, // 2 minutes
  activityMetrics: 2 * 60 * 1000, // 2 minutes
  trends: 10 * 60 * 1000, // 10 minutes
  topPerformers: 5 * 60 * 1000, // 5 minutes
};

// Hooks
export function useSalesOverview(dateRange?: SalesDateRange) {
  return useQuery<SalesAnalyticsOverview>({
    queryKey: salesAnalyticsKeys.overview(dateRange),
    queryFn: () => getSalesOverview(dateRange),
    staleTime: STALE_TIMES.overview,
  });
}

export function useConversionFunnel(dateRange?: SalesDateRange) {
  return useQuery<ConversionFunnelData>({
    queryKey: salesAnalyticsKeys.funnel(dateRange),
    queryFn: () => getConversionFunnel(dateRange),
    staleTime: STALE_TIMES.funnel,
  });
}

export function useDealMetrics(dateRange?: SalesDateRange) {
  return useQuery<DealMetrics>({
    queryKey: salesAnalyticsKeys.dealMetrics(dateRange),
    queryFn: () => getDealMetrics(dateRange),
    staleTime: STALE_TIMES.dealMetrics,
  });
}

export function useActivityMetrics(dateRange?: SalesDateRange) {
  return useQuery<ActivityMetrics>({
    queryKey: salesAnalyticsKeys.activityMetrics(dateRange),
    queryFn: () => getActivityMetrics(dateRange),
    staleTime: STALE_TIMES.activityMetrics,
  });
}

export function useSalesTrends(dateRange?: SalesDateRange) {
  return useQuery<SalesTrendData[]>({
    queryKey: salesAnalyticsKeys.trends(dateRange),
    queryFn: () => getSalesTrends(dateRange),
    staleTime: STALE_TIMES.trends,
  });
}

export function useTopPerformers(dateRange?: SalesDateRange) {
  return useQuery<TopPerformer[]>({
    queryKey: salesAnalyticsKeys.topPerformers(dateRange),
    queryFn: () => getTopPerformers(dateRange),
    staleTime: STALE_TIMES.topPerformers,
  });
}
