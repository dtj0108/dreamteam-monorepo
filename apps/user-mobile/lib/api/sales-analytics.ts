import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import {
  SalesAnalyticsOverview,
  ConversionFunnelData,
  ConversionFunnelStage,
  DealMetrics,
  ActivityMetrics,
  SalesTrendData,
  TopPerformer,
  SalesDateRange,
  OpportunityStage,
  OPPORTUNITY_STAGE_COLORS,
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

function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1).toISOString().split("T")[0];
  const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
  return { start, end };
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

// ============================================================================
// Sales Analytics Overview
// ============================================================================

export async function getSalesOverview(
  dateRange?: SalesDateRange
): Promise<SalesAnalyticsOverview> {
  console.log("[SalesAnalytics API] getSalesOverview via Supabase", dateRange);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    const now = new Date();
    const currentMonth = getMonthRange(now);
    const startDate = dateRange?.startDate || currentMonth.start;
    const endDate = dateRange?.endDate || currentMonth.end;

    // Get leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    const allLeads = leads || [];
    const leadsInRange = allLeads.filter((l: any) =>
      l.created_at >= startDate && l.created_at <= endDate + "T23:59:59"
    );

    const totalLeads = allLeads.length;
    const newLeads = leadsInRange.length;
    const qualifiedLeads = allLeads.filter((l: any) => l.status === "qualified").length;

    // Get opportunities/deals
    const { data: deals } = await supabase
      .from("lead_opportunities")
      .select("id, stage, value, probability, created_at")
      .eq("user_id", userId);

    const allDeals = deals || [];
    const wonDeals = allDeals.filter((d: any) => d.stage === "closed_won").length;
    const lostDeals = allDeals.filter((d: any) => d.stage === "closed_lost").length;

    // Pipeline values
    const openDeals = allDeals.filter((d: any) =>
      !["closed_won", "closed_lost"].includes(d.stage)
    );
    const totalPipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const weightedValue = openDeals.reduce((sum: number, d: any) =>
      sum + (d.value || 0) * (d.probability / 100), 0
    );
    const wonValue = allDeals
      .filter((d: any) => d.stage === "closed_won")
      .reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const lostValue = allDeals
      .filter((d: any) => d.stage === "closed_lost")
      .reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    // Conversion rate
    const conversionRate = totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0;

    // Calculate changes (compare to previous period)
    const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevStart = new Date(new Date(startDate).getTime() - periodLength).toISOString().split("T")[0];
    const prevEnd = new Date(new Date(startDate).getTime() - 1).toISOString().split("T")[0];

    const prevLeads = allLeads.filter((l: any) =>
      l.created_at >= prevStart && l.created_at <= prevEnd + "T23:59:59"
    ).length;
    const prevDeals = allDeals.filter((d: any) =>
      d.created_at >= prevStart && d.created_at <= prevEnd + "T23:59:59"
    ).length;
    const dealsInRange = allDeals.filter((d: any) =>
      d.created_at >= startDate && d.created_at <= endDate + "T23:59:59"
    ).length;

    const prevWonValue = allDeals
      .filter((d: any) =>
        d.stage === "closed_won" &&
        d.created_at >= prevStart &&
        d.created_at <= prevEnd + "T23:59:59"
      )
      .reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const currentWonValue = allDeals
      .filter((d: any) =>
        d.stage === "closed_won" &&
        d.created_at >= startDate &&
        d.created_at <= endDate + "T23:59:59"
      )
      .reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    console.log("[SalesAnalytics API] getSalesOverview response");
    return {
      summary: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        wonDeals,
        lostDeals,
        conversionRate,
      },
      pipelineValue: {
        total: totalPipelineValue,
        weighted: weightedValue,
        won: wonValue,
        lost: lostValue,
      },
      changes: {
        leads: prevLeads > 0 ? ((newLeads - prevLeads) / prevLeads) * 100 : 0,
        deals: prevDeals > 0 ? ((dealsInRange - prevDeals) / prevDeals) * 100 : 0,
        revenue: prevWonValue > 0 ? ((currentWonValue - prevWonValue) / prevWonValue) * 100 : 0,
      },
    };
  } catch (error) {
    console.error("[SalesAnalytics API] getSalesOverview ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Conversion Funnel
// ============================================================================

export async function getConversionFunnel(
  dateRange?: SalesDateRange
): Promise<ConversionFunnelData> {
  console.log("[SalesAnalytics API] getConversionFunnel via Supabase", dateRange);
  try {
    const userId = await getCurrentUserId();

    // Get all deals
    const { data: deals } = await supabase
      .from("lead_opportunities")
      .select("id, stage, value")
      .eq("user_id", userId);

    const allDeals = deals || [];

    // Stage order for funnel
    const stageOrder: OpportunityStage[] = [
      "prospect",
      "qualified",
      "proposal",
      "negotiation",
      "closed_won",
    ];

    const stages: ConversionFunnelStage[] = stageOrder.map((stageName, index) => {
      const stageDeals = allDeals.filter((d: any) => d.stage === stageName);
      const count = stageDeals.length;
      const value = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

      // Conversion rate to next stage
      const prevStageCount = index === 0
        ? allDeals.length
        : allDeals.filter((d: any) => d.stage === stageOrder[index - 1]).length;
      const conversionRate = prevStageCount > 0 ? (count / prevStageCount) * 100 : 0;

      return {
        id: stageName,
        name: stageName.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
        color: OPPORTUNITY_STAGE_COLORS[stageName],
        count,
        value,
        conversionRate,
      };
    });

    const totalDeals = allDeals.length;
    const wonDeals = allDeals.filter((d: any) => d.stage === "closed_won").length;
    const overallConversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    console.log("[SalesAnalytics API] getConversionFunnel response");
    return {
      stages,
      overallConversionRate,
    };
  } catch (error) {
    console.error("[SalesAnalytics API] getConversionFunnel ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Deal Metrics
// ============================================================================

export async function getDealMetrics(
  dateRange?: SalesDateRange
): Promise<DealMetrics> {
  console.log("[SalesAnalytics API] getDealMetrics via Supabase", dateRange);
  try {
    const userId = await getCurrentUserId();

    const { data: deals } = await supabase
      .from("lead_opportunities")
      .select("id, name, stage, value, probability, expected_close_date, created_at, updated_at")
      .eq("user_id", userId);

    const allDeals = deals || [];

    // Calculate totals
    const openDeals = allDeals.filter((d: any) =>
      !["closed_won", "closed_lost"].includes(d.stage)
    );
    const wonDeals = allDeals.filter((d: any) => d.stage === "closed_won");
    const lostDeals = allDeals.filter((d: any) => d.stage === "closed_lost");

    const totalPipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const expectedRevenue = openDeals.reduce((sum: number, d: any) =>
      sum + (d.value || 0) * (d.probability / 100), 0
    );
    const wonValue = wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const lostValue = lostDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const avgDealSize = allDeals.length > 0
      ? allDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / allDeals.length
      : 0;

    // Average time to close (for won deals)
    let avgTimeToClose = 0;
    if (wonDeals.length > 0) {
      const totalDays = wonDeals.reduce((sum: number, d: any) => {
        const created = new Date(d.created_at).getTime();
        const closed = new Date(d.updated_at).getTime();
        return sum + (closed - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgTimeToClose = totalDays / wonDeals.length;
    }

    // By stage breakdown
    const stages: OpportunityStage[] = [
      "prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"
    ];

    const byStage = stages.map(stage => {
      const stageDeals = allDeals.filter((d: any) => d.stage === stage);
      const stageValue = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
      return {
        stage,
        count: stageDeals.length,
        value: stageValue,
        avgValue: stageDeals.length > 0 ? stageValue / stageDeals.length : 0,
      };
    });

    // Deals nearing close (expected close within 30 days)
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const nearingClose = openDeals
      .filter((d: any) => {
        if (!d.expected_close_date) return false;
        const closeDate = new Date(d.expected_close_date);
        return closeDate >= now && closeDate <= thirtyDaysLater;
      })
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        value: d.value || 0,
        expectedCloseDate: d.expected_close_date,
        probability: d.probability,
      }))
      .sort((a: any, b: any) =>
        new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime()
      )
      .slice(0, 10);

    console.log("[SalesAnalytics API] getDealMetrics response");
    return {
      summary: {
        totalPipelineValue,
        expectedRevenue,
        wonValue,
        lostValue,
        avgDealSize,
        avgTimeToClose,
      },
      byStage,
      nearingClose,
    };
  } catch (error) {
    console.error("[SalesAnalytics API] getDealMetrics ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Activity Metrics
// ============================================================================

export async function getActivityMetrics(
  dateRange?: SalesDateRange
): Promise<ActivityMetrics> {
  console.log("[SalesAnalytics API] getActivityMetrics via Supabase", dateRange);
  try {
    const userId = await getCurrentUserId();

    const now = new Date();
    const currentMonth = getMonthRange(now);
    const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split("T")[0];
    const endDate = dateRange?.endDate || currentMonth.end;

    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, lead_id, is_completed, created_at")
      .eq("profile_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    const allActivities = activities || [];

    // Summary counts
    const callsMade = allActivities.filter((a: any) => a.type === "call").length;
    const emailsSent = allActivities.filter((a: any) => a.type === "email").length;
    const meetingsHeld = allActivities.filter((a: any) => a.type === "meeting").length;
    const tasksCompleted = allActivities.filter((a: any) => a.type === "task" && a.is_completed).length;

    // Monthly trend
    const monthlyMap: Record<string, { calls: number; emails: number; meetings: number; tasks: number }> = {};
    allActivities.forEach((a: any) => {
      const month = a.created_at.substring(0, 7);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { calls: 0, emails: 0, meetings: 0, tasks: 0 };
      }
      if (a.type === "call") monthlyMap[month].calls++;
      else if (a.type === "email") monthlyMap[month].emails++;
      else if (a.type === "meeting") monthlyMap[month].meetings++;
      else if (a.type === "task") monthlyMap[month].tasks++;
    });

    const trend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        ...data,
      }));

    // Activities by lead
    const leadActivityMap: Record<string, number> = {};
    allActivities.forEach((a: any) => {
      if (a.lead_id) {
        leadActivityMap[a.lead_id] = (leadActivityMap[a.lead_id] || 0) + 1;
      }
    });

    // Get lead names for top leads
    const topLeadIds = Object.entries(leadActivityMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    let byLead: Array<{ leadId: string; leadName: string; activityCount: number }> = [];

    if (topLeadIds.length > 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name")
        .in("id", topLeadIds);

      const leadNames = Object.fromEntries((leads || []).map((l: any) => [l.id, l.name]));

      byLead = topLeadIds.map(leadId => ({
        leadId,
        leadName: leadNames[leadId] || "Unknown",
        activityCount: leadActivityMap[leadId],
      }));
    }

    console.log("[SalesAnalytics API] getActivityMetrics response");
    return {
      summary: {
        totalActivities: allActivities.length,
        callsMade,
        emailsSent,
        meetingsHeld,
        tasksCompleted,
      },
      trend,
      byLead,
    };
  } catch (error) {
    console.error("[SalesAnalytics API] getActivityMetrics ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Sales Trends
// ============================================================================

export async function getSalesTrends(
  dateRange?: SalesDateRange
): Promise<SalesTrendData[]> {
  console.log("[SalesAnalytics API] getSalesTrends via Supabase", dateRange);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    const now = new Date();
    const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];
    const endDate = dateRange?.endDate || now.toISOString().split("T")[0];

    // Get leads and deals grouped by month
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    const { data: deals } = await supabase
      .from("lead_opportunities")
      .select("id, stage, value, created_at")
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    // Group by month
    const monthMap: Record<string, {
      newLeads: number;
      qualifiedLeads: number;
      wonDeals: number;
      revenue: number;
    }> = {};

    (leads || []).forEach((l: any) => {
      const month = l.created_at.substring(0, 7);
      if (!monthMap[month]) {
        monthMap[month] = { newLeads: 0, qualifiedLeads: 0, wonDeals: 0, revenue: 0 };
      }
      monthMap[month].newLeads++;
      if (l.status === "qualified") {
        monthMap[month].qualifiedLeads++;
      }
    });

    (deals || []).forEach((d: any) => {
      const month = d.created_at.substring(0, 7);
      if (!monthMap[month]) {
        monthMap[month] = { newLeads: 0, qualifiedLeads: 0, wonDeals: 0, revenue: 0 };
      }
      if (d.stage === "closed_won") {
        monthMap[month].wonDeals++;
        monthMap[month].revenue += d.value || 0;
      }
    });

    const trends: SalesTrendData[] = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => {
        const [year, mon] = period.split("-");
        const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
        return {
          period,
          label: getMonthLabel(date),
          ...data,
        };
      });

    console.log("[SalesAnalytics API] getSalesTrends response:", trends.length, "periods");
    return trends;
  } catch (error) {
    console.error("[SalesAnalytics API] getSalesTrends ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Top Performers
// ============================================================================

export async function getTopPerformers(
  dateRange?: SalesDateRange
): Promise<TopPerformer[]> {
  console.log("[SalesAnalytics API] getTopPerformers via Supabase", dateRange);
  try {
    const userId = await getCurrentUserId();

    // Get all deals ordered by value
    const { data: deals } = await supabase
      .from("lead_opportunities")
      .select("id, name, value, stage, probability, expected_close_date")
      .eq("user_id", userId)
      .order("value", { ascending: false })
      .limit(10);

    const topPerformers: TopPerformer[] = (deals || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      value: d.value || 0,
      stage: d.stage,
      closingDate: d.expected_close_date,
      probability: d.probability,
    }));

    console.log("[SalesAnalytics API] getTopPerformers response:", topPerformers.length, "performers");
    return topPerformers;
  } catch (error) {
    console.error("[SalesAnalytics API] getTopPerformers ERROR:", error);
    throw error;
  }
}
