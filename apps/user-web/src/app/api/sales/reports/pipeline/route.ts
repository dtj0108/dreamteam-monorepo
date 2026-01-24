import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface PipelineReportData {
  summary: {
    totalDeals: number
    totalValue: number
    weightedValue: number
    avgDealSize: number
  }
  byStage: {
    stageId: string
    stageName: string
    stageColor: string
    dealCount: number
    totalValue: number
  }[]
  byStatus: {
    status: "open" | "won" | "lost"
    count: number
    value: number
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
  const pipelineId = searchParams.get("pipeline_id")

  // Build the deals query
  let dealsQuery = supabase
    .from("deals")
    .select(`
      id,
      value,
      status,
      probability,
      stage_id,
      pipeline_stages!inner (
        id,
        name,
        color,
        win_probability
      )
    `)
    .eq("profile_id", user.id)

  if (startDate) {
    dealsQuery = dealsQuery.gte("created_at", startDate)
  }
  if (endDate) {
    dealsQuery = dealsQuery.lte("created_at", endDate)
  }
  if (pipelineId) {
    dealsQuery = dealsQuery.eq("pipeline_id", pipelineId)
  }

  const { data: deals, error: dealsError } = await dealsQuery

  if (dealsError) {
    return NextResponse.json({ error: dealsError.message }, { status: 500 })
  }

  const dealsList = deals || []

  // Calculate summary
  const totalDeals = dealsList.length
  const totalValue = dealsList.reduce((sum, d) => sum + (d.value || 0), 0)
  const weightedValue = dealsList.reduce((sum, d) => {
    const prob = d.probability ?? (d.pipeline_stages as any)?.win_probability ?? 50
    return sum + ((d.value || 0) * prob / 100)
  }, 0)
  const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0

  // Group by stage
  const stageMap = new Map<string, { stageName: string; stageColor: string; dealCount: number; totalValue: number }>()

  for (const deal of dealsList) {
    const stage = deal.pipeline_stages as any
    if (!stage) continue

    const existing = stageMap.get(stage.id) || {
      stageName: stage.name,
      stageColor: stage.color || "#64748b",
      dealCount: 0,
      totalValue: 0,
    }
    existing.dealCount++
    existing.totalValue += deal.value || 0
    stageMap.set(stage.id, existing)
  }

  const byStage = Array.from(stageMap.entries()).map(([stageId, data]) => ({
    stageId,
    ...data,
  }))

  // Group by status
  const statusMap = new Map<string, { count: number; value: number }>()
  for (const status of ["open", "won", "lost"]) {
    statusMap.set(status, { count: 0, value: 0 })
  }

  for (const deal of dealsList) {
    const status = deal.status || "open"
    const existing = statusMap.get(status) || { count: 0, value: 0 }
    existing.count++
    existing.value += deal.value || 0
    statusMap.set(status, existing)
  }

  const byStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
    status: status as "open" | "won" | "lost",
    ...data,
  }))

  const result: PipelineReportData = {
    summary: {
      totalDeals,
      totalValue,
      weightedValue: Math.round(weightedValue),
      avgDealSize: Math.round(avgDealSize),
    },
    byStage,
    byStatus,
  }

  return NextResponse.json(result)
}
