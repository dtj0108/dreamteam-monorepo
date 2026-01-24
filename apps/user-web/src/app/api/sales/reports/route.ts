import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ReportMetrics {
  totalRevenue: number
  totalRevenueChange: number  // percentage
  dealsClosed: number
  dealsClosedChange: number   // absolute difference
  newLeads: number
  newLeadsChange: number      // absolute difference
  winRate: number             // percentage
  winRateChange: number       // percentage points
}

function getMonthDateRange(monthsAgo: number = 0) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() - monthsAgo

  const startDate = new Date(year, month, 1)
  const endDate = monthsAgo === 0
    ? now // Current period: first day of month to today
    : new Date(year, month + 1, 0, 23, 59, 59, 999) // Previous period: full month

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentPeriod = getMonthDateRange(0)
  const previousPeriod = getMonthDateRange(1)

  // Fetch deals for current and previous periods
  const [currentDealsResult, previousDealsResult, currentLeadsResult, previousLeadsResult] = await Promise.all([
    // Current period deals
    supabase
      .from("deals")
      .select("id, value, status")
      .eq("profile_id", user.id)
      .in("status", ["won", "lost"])
      .gte("updated_at", currentPeriod.start)
      .lte("updated_at", currentPeriod.end),

    // Previous period deals
    supabase
      .from("deals")
      .select("id, value, status")
      .eq("profile_id", user.id)
      .in("status", ["won", "lost"])
      .gte("updated_at", previousPeriod.start)
      .lte("updated_at", previousPeriod.end),

    // Current period leads
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", currentPeriod.start)
      .lte("created_at", currentPeriod.end),

    // Previous period leads
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", previousPeriod.start)
      .lte("created_at", previousPeriod.end),
  ])

  // Calculate current period metrics
  const currentDeals = currentDealsResult.data || []
  const currentWonDeals = currentDeals.filter(d => d.status === "won")
  const currentLostDeals = currentDeals.filter(d => d.status === "lost")
  const currentTotalRevenue = currentWonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const currentDealsClosed = currentDeals.length
  const currentWinRate = currentDealsClosed > 0
    ? (currentWonDeals.length / currentDealsClosed) * 100
    : 0

  // Calculate previous period metrics
  const previousDeals = previousDealsResult.data || []
  const previousWonDeals = previousDeals.filter(d => d.status === "won")
  const previousTotalRevenue = previousWonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const previousDealsClosed = previousDeals.length
  const previousWinRate = previousDealsClosed > 0
    ? (previousWonDeals.length / previousDealsClosed) * 100
    : 0

  // Lead counts
  const currentNewLeads = currentLeadsResult.count || 0
  const previousNewLeads = previousLeadsResult.count || 0

  // Calculate changes
  const totalRevenueChange = previousTotalRevenue > 0
    ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
    : currentTotalRevenue > 0 ? 100 : 0

  const dealsClosedChange = currentDealsClosed - previousDealsClosed
  const newLeadsChange = currentNewLeads - previousNewLeads
  const winRateChange = currentWinRate - previousWinRate

  const metrics: ReportMetrics = {
    totalRevenue: currentTotalRevenue,
    totalRevenueChange: Math.round(totalRevenueChange * 10) / 10,
    dealsClosed: currentDealsClosed,
    dealsClosedChange,
    newLeads: currentNewLeads,
    newLeadsChange,
    winRate: Math.round(currentWinRate * 10) / 10,
    winRateChange: Math.round(winRateChange * 10) / 10,
  }

  return NextResponse.json(metrics)
}
