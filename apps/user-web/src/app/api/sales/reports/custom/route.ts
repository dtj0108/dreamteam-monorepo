import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

interface ReportData {
  labels: string[]
  values: number[]
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const entity = searchParams.get("entity") || "deals"
  const metric = searchParams.get("metric") || "count"
  const groupBy = searchParams.get("group_by") || "status"
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  try {
    let result: ReportData = { labels: [], values: [] }

    switch (entity) {
      case "deals":
        result = await getDealsReport(supabase, user.id, metric, groupBy, startDate, endDate)
        break
      case "leads":
        result = await getLeadsReport(supabase, user.id, metric, groupBy, startDate, endDate)
        break
      case "activities":
        result = await getActivitiesReport(supabase, user.id, metric, groupBy, startDate, endDate)
        break
      default:
        return NextResponse.json({ error: "Invalid entity" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("Custom report error:", err)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

async function getDealsReport(
  supabase: any,
  userId: string,
  metric: string,
  groupBy: string,
  startDate: string | null,
  endDate: string | null
): Promise<ReportData> {
  let query = supabase
    .from("deals")
    .select(`
      id,
      value,
      status,
      created_at,
      pipeline_stages (
        name
      )
    `)
    .eq("profile_id", userId)

  if (startDate) query = query.gte("created_at", startDate)
  if (endDate) query = query.lte("created_at", endDate)

  const { data: deals, error } = await query
  if (error) throw error

  const dealsList = deals || []
  const grouped = new Map<string, number[]>()

  for (const deal of dealsList) {
    let key: string
    switch (groupBy) {
      case "stage":
        key = (deal.pipeline_stages as any)?.name || "No Stage"
        break
      case "month":
        key = new Date(deal.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        break
      case "status":
      default:
        key = deal.status || "open"
    }

    const existing = grouped.get(key) || []
    existing.push(deal.value || 0)
    grouped.set(key, existing)
  }

  return calculateMetric(grouped, metric)
}

async function getLeadsReport(
  supabase: any,
  userId: string,
  metric: string,
  groupBy: string,
  startDate: string | null,
  endDate: string | null
): Promise<ReportData> {
  let query = supabase
    .from("leads")
    .select("id, source, status, created_at")
    .eq("user_id", userId)

  if (startDate) query = query.gte("created_at", startDate)
  if (endDate) query = query.lte("created_at", endDate)

  const { data: leads, error } = await query
  if (error) throw error

  const leadsList = leads || []
  const grouped = new Map<string, number[]>()

  for (const lead of leadsList) {
    let key: string
    switch (groupBy) {
      case "source":
        key = lead.source || "Unknown"
        break
      case "month":
        key = new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        break
      case "status":
      default:
        key = lead.status || "new"
    }

    const existing = grouped.get(key) || []
    existing.push(1) // Leads don't have a value field, so we use 1 for counting
    grouped.set(key, existing)
  }

  return calculateMetric(grouped, metric)
}

async function getActivitiesReport(
  supabase: any,
  userId: string,
  metric: string,
  groupBy: string,
  startDate: string | null,
  endDate: string | null
): Promise<ReportData> {
  let query = supabase
    .from("activities")
    .select("id, type, is_completed, created_at")
    .eq("profile_id", userId)

  if (startDate) query = query.gte("created_at", startDate)
  if (endDate) query = query.lte("created_at", endDate)

  const { data: activities, error } = await query
  if (error) throw error

  const activityList = activities || []
  const grouped = new Map<string, number[]>()

  for (const activity of activityList) {
    let key: string
    switch (groupBy) {
      case "completed":
        key = activity.is_completed ? "Completed" : "Pending"
        break
      case "day":
        key = new Date(activity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        break
      case "type":
      default:
        key = activity.type || "Other"
    }

    const existing = grouped.get(key) || []
    existing.push(1) // Activities don't have a value field, so we use 1 for counting
    grouped.set(key, existing)
  }

  return calculateMetric(grouped, metric)
}

function calculateMetric(grouped: Map<string, number[]>, metric: string): ReportData {
  const labels: string[] = []
  const values: number[] = []

  for (const [key, nums] of grouped.entries()) {
    labels.push(key)
    switch (metric) {
      case "sum":
        values.push(nums.reduce((a, b) => a + b, 0))
        break
      case "average":
        values.push(nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0)
        break
      case "count":
      default:
        values.push(nums.length)
    }
  }

  return { labels, values }
}
