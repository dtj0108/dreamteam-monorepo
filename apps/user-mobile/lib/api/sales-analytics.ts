import { get } from "../api";
import {
  SalesAnalyticsOverview,
  ConversionFunnelData,
  DealMetrics,
  ActivityMetrics,
  SalesTrendData,
  TopPerformer,
  SalesDateRange,
} from "../types/sales";

// Build query params from date range
function buildDateParams(dateRange?: SalesDateRange): URLSearchParams {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.append("start_date", dateRange.startDate);
  if (dateRange?.endDate) params.append("end_date", dateRange.endDate);
  return params;
}

// Get sales analytics overview
export async function getSalesOverview(
  dateRange?: SalesDateRange
): Promise<SalesAnalyticsOverview> {
  const params = buildDateParams(dateRange);
  const query = params.toString();
  const url = query ? `/api/sales/analytics/overview?${query}` : "/api/sales/analytics/overview";
  return get<SalesAnalyticsOverview>(url);
}

// Get conversion funnel data
export async function getConversionFunnel(
  dateRange?: SalesDateRange
): Promise<ConversionFunnelData> {
  const params = buildDateParams(dateRange);
  const query = params.toString();
  const url = query ? `/api/sales/analytics/funnel?${query}` : "/api/sales/analytics/funnel";
  return get<ConversionFunnelData>(url);
}

// Get deal metrics
export async function getDealMetrics(
  dateRange?: SalesDateRange
): Promise<DealMetrics> {
  const params = buildDateParams(dateRange);
  const query = params.toString();
  const url = query ? `/api/sales/analytics/deals?${query}` : "/api/sales/analytics/deals";
  return get<DealMetrics>(url);
}

// Get activity metrics
export async function getActivityMetrics(
  dateRange?: SalesDateRange
): Promise<ActivityMetrics> {
  const params = buildDateParams(dateRange);
  const query = params.toString();
  const url = query ? `/api/sales/analytics/activities?${query}` : "/api/sales/analytics/activities";
  return get<ActivityMetrics>(url);
}

// Get sales trends
export async function getSalesTrends(
  dateRange?: SalesDateRange
): Promise<SalesTrendData[]> {
  const params = buildDateParams(dateRange);
  const query = params.toString();
  const url = query ? `/api/sales/analytics/trends?${query}` : "/api/sales/analytics/trends";
  return get<SalesTrendData[]>(url);
}

// Get top performers (leads/deals)
export async function getTopPerformers(
  dateRange?: SalesDateRange
): Promise<TopPerformer[]> {
  const params = buildDateParams(dateRange);
  const query = params.toString();
  const url = query ? `/api/sales/analytics/top-performers?${query}` : "/api/sales/analytics/top-performers";
  return get<TopPerformer[]>(url);
}
