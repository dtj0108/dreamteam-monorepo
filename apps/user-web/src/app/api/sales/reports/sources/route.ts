import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface SourcesReportData {
  summary: {
    totalLeads: number
    topSource: string
    conversionRate: number
  }
  bySource: {
    source: string
    leadCount: number
    convertedCount: number
    conversionRate: number
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

  // Build the leads query
  let leadsQuery = supabase
    .from("leads")
    .select("id, source, status")
    .eq("user_id", user.id)

  if (startDate) {
    leadsQuery = leadsQuery.gte("created_at", startDate)
  }
  if (endDate) {
    leadsQuery = leadsQuery.lte("created_at", endDate)
  }

  const { data: leads, error: leadsError } = await leadsQuery

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 })
  }

  const leadsList = leads || []

  // Group by source
  const sourceMap = new Map<string, { leadCount: number; convertedCount: number }>()

  for (const lead of leadsList) {
    const source = lead.source || "Unknown"
    const existing = sourceMap.get(source) || { leadCount: 0, convertedCount: 0 }
    existing.leadCount++
    // Consider "qualified" or "converted" as converted leads
    if (lead.status === "qualified" || lead.status === "converted" || lead.status === "won") {
      existing.convertedCount++
    }
    sourceMap.set(source, existing)
  }

  const bySource = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      leadCount: data.leadCount,
      convertedCount: data.convertedCount,
      conversionRate: data.leadCount > 0
        ? Math.round((data.convertedCount / data.leadCount) * 100 * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.leadCount - a.leadCount)

  // Calculate summary
  const totalLeads = leadsList.length
  const totalConverted = bySource.reduce((sum, s) => sum + s.convertedCount, 0)
  const topSource = bySource.length > 0 ? bySource[0].source : "N/A"
  const conversionRate = totalLeads > 0
    ? Math.round((totalConverted / totalLeads) * 100 * 10) / 10
    : 0

  const result: SourcesReportData = {
    summary: {
      totalLeads,
      topSource,
      conversionRate,
    },
    bySource,
  }

  return NextResponse.json(result)
}
