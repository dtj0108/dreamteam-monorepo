import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ActivityReportData {
  summary: {
    totalActivities: number
    completedCount: number
    completionRate: number
    avgPerDay: number
  }
  byType: {
    type: "call" | "email" | "meeting" | "note" | "task"
    count: number
    completedCount: number
  }[]
  byDay: {
    date: string
    count: number
  }[]
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const typeFilter = searchParams.get("type")

  // Build the activities query
  let activitiesQuery = supabase
    .from("activities")
    .select("id, type, is_completed, created_at")
    .eq("profile_id", user.id)

  if (startDate) {
    activitiesQuery = activitiesQuery.gte("created_at", startDate)
  }
  if (endDate) {
    activitiesQuery = activitiesQuery.lte("created_at", endDate)
  }
  if (typeFilter) {
    activitiesQuery = activitiesQuery.eq("type", typeFilter)
  }

  const { data: activities, error: activitiesError } = await activitiesQuery

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 })
  }

  const activityList = activities || []

  // Summary calculations
  const totalActivities = activityList.length
  const completedCount = activityList.filter(a => a.is_completed).length
  const completionRate = totalActivities > 0
    ? Math.round((completedCount / totalActivities) * 100 * 10) / 10
    : 0

  // Calculate date range for avg per day
  let dayCount = 30 // default
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }
  const avgPerDay = Math.round((totalActivities / dayCount) * 10) / 10

  // Group by type
  const types: ("call" | "email" | "meeting" | "note" | "task")[] = ["call", "email", "meeting", "note", "task"]
  const typeMap = new Map<string, { count: number; completedCount: number }>()

  for (const type of types) {
    typeMap.set(type, { count: 0, completedCount: 0 })
  }

  for (const activity of activityList) {
    const type = activity.type || "task"
    const existing = typeMap.get(type) || { count: 0, completedCount: 0 }
    existing.count++
    if (activity.is_completed) {
      existing.completedCount++
    }
    typeMap.set(type, existing)
  }

  const byType = types.map(type => ({
    type,
    count: typeMap.get(type)!.count,
    completedCount: typeMap.get(type)!.completedCount,
  }))

  // Group by day (last 30 days or date range)
  const dayMap = new Map<string, number>()

  // Initialize days
  const endDateObj = endDate ? new Date(endDate) : new Date()
  const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split("T")[0]
    dayMap.set(dateKey, 0)
  }

  for (const activity of activityList) {
    const dateKey = new Date(activity.created_at).toISOString().split("T")[0]
    if (dayMap.has(dateKey)) {
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1)
    }
  }

  const byDay = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  const result: ActivityReportData = {
    summary: {
      totalActivities,
      completedCount,
      completionRate,
      avgPerDay,
    },
    byType,
    byDay,
  }

  return NextResponse.json(result)
}
