import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ForecastReportData {
  summary: {
    totalPipelineValue: number
    weightedForecast: number
    expectedThisMonth: number
    expectedThisQuarter: number
  }
  byMonth: {
    month: string
    expectedValue: number
    weightedValue: number
    dealCount: number
  }[]
  byProbabilityBand: {
    band: "0-25%" | "26-50%" | "51-75%" | "76-100%"
    dealCount: number
    totalValue: number
  }[]
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const monthsAhead = parseInt(searchParams.get("months_ahead") || "6", 10)
  const pipelineId = searchParams.get("pipeline_id")

  // Get open deals with expected close dates
  let dealsQuery = supabase
    .from("deals")
    .select(`
      id,
      value,
      probability,
      expected_close_date,
      pipeline_stages (
        win_probability
      )
    `)
    .eq("profile_id", user.id)
    .eq("status", "open")

  if (pipelineId) {
    dealsQuery = dealsQuery.eq("pipeline_id", pipelineId)
  }

  const { data: deals, error: dealsError } = await dealsQuery

  if (dealsError) {
    return NextResponse.json({ error: dealsError.message }, { status: 500 })
  }

  const dealsList = deals || []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Calculate probability for each deal
  const dealsWithProb = dealsList.map(d => ({
    ...d,
    effectiveProb: d.probability ?? (d.pipeline_stages as any)?.win_probability ?? 50,
    closeDate: d.expected_close_date ? new Date(d.expected_close_date) : null,
  }))

  // Summary calculations
  const totalPipelineValue = dealsWithProb.reduce((sum, d) => sum + (d.value || 0), 0)
  const weightedForecast = dealsWithProb.reduce((sum, d) =>
    sum + ((d.value || 0) * d.effectiveProb / 100), 0
  )

  // This month and quarter calculations
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0)
  const thisQuarterEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0)

  const expectedThisMonth = dealsWithProb
    .filter(d => d.closeDate && d.closeDate <= thisMonthEnd)
    .reduce((sum, d) => sum + ((d.value || 0) * d.effectiveProb / 100), 0)

  const expectedThisQuarter = dealsWithProb
    .filter(d => d.closeDate && d.closeDate <= thisQuarterEnd)
    .reduce((sum, d) => sum + ((d.value || 0) * d.effectiveProb / 100), 0)

  // Group by month
  const monthMap = new Map<string, { expectedValue: number; weightedValue: number; dealCount: number }>()

  // Initialize months
  for (let i = 0; i < monthsAhead; i++) {
    const date = new Date(currentYear, currentMonth + i, 1)
    const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    monthMap.set(monthKey, { expectedValue: 0, weightedValue: 0, dealCount: 0 })
  }

  for (const deal of dealsWithProb) {
    if (!deal.closeDate) continue

    const monthKey = deal.closeDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    const existing = monthMap.get(monthKey)
    if (existing) {
      existing.expectedValue += deal.value || 0
      existing.weightedValue += (deal.value || 0) * deal.effectiveProb / 100
      existing.dealCount++
    }
  }

  const byMonth = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    expectedValue: Math.round(data.expectedValue),
    weightedValue: Math.round(data.weightedValue),
    dealCount: data.dealCount,
  }))

  // Group by probability band
  const bands: ("0-25%" | "26-50%" | "51-75%" | "76-100%")[] = ["0-25%", "26-50%", "51-75%", "76-100%"]
  const bandMap = new Map<string, { dealCount: number; totalValue: number }>()

  for (const band of bands) {
    bandMap.set(band, { dealCount: 0, totalValue: 0 })
  }

  for (const deal of dealsWithProb) {
    let band: string
    if (deal.effectiveProb <= 25) band = "0-25%"
    else if (deal.effectiveProb <= 50) band = "26-50%"
    else if (deal.effectiveProb <= 75) band = "51-75%"
    else band = "76-100%"

    const existing = bandMap.get(band)!
    existing.dealCount++
    existing.totalValue += deal.value || 0
  }

  const byProbabilityBand = bands.map(band => ({
    band,
    dealCount: bandMap.get(band)!.dealCount,
    totalValue: Math.round(bandMap.get(band)!.totalValue),
  }))

  const result: ForecastReportData = {
    summary: {
      totalPipelineValue: Math.round(totalPipelineValue),
      weightedForecast: Math.round(weightedForecast),
      expectedThisMonth: Math.round(expectedThisMonth),
      expectedThisQuarter: Math.round(expectedThisQuarter),
    },
    byMonth,
    byProbabilityBand,
  }

  return NextResponse.json(result)
}
