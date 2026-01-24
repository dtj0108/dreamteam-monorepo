import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

// GET /api/opportunities - List all opportunities (for kanban board)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const leadId = searchParams.get("lead_id")
    const pipelineId = searchParams.get("pipeline_id")

    const supabase = createAdminClient()

    // Build query
    let query = supabase
      .from("lead_opportunities")
      .select(`
        *,
        lead:leads!inner(
          id,
          name,
          website,
          industry,
          status,
          pipeline_id,
          stage_id,
          pipeline_stage:lead_pipeline_stages(
            id,
            name,
            color,
            position,
            is_won,
            is_lost
          )
        ),
        contact:contacts(id, first_name, last_name, email, phone, title)
      `)
      .eq("lead.user_id", session.id)
      .eq("lead.workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }
    if (leadId) {
      query = query.eq("lead_id", leadId)
    }
    if (pipelineId) {
      query = query.eq("lead.pipeline_id", pipelineId)
    }

    const { data: opportunities, error } = await query

    if (error) {
      console.error("Error fetching opportunities:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Define opportunity type for this response
    interface OpportunityRow {
      id: string
      lead_id: string
      user_id: string
      workspace_id: string | null
      name: string
      value: number | null
      probability: number
      status: string
      expected_close_date: string | null
      notes: string | null
    }

    // Calculate expected value for each opportunity
    const opportunitiesWithExpectedValue = (opportunities || []).map((opp: OpportunityRow) => ({
      ...opp,
      expected_value: opp.value !== null ? opp.value * (opp.probability / 100) : null
    }))

    // Calculate summary stats
    type OppWithExpected = OpportunityRow & { expected_value: number | null }
    const stats = {
      total_count: opportunitiesWithExpectedValue.length,
      total_value: opportunitiesWithExpectedValue.reduce((sum: number, opp: OppWithExpected) => sum + (opp.value || 0), 0),
      weighted_value: opportunitiesWithExpectedValue.reduce((sum: number, opp: OppWithExpected) => sum + (opp.expected_value || 0), 0),
      active_count: opportunitiesWithExpectedValue.filter((opp: OppWithExpected) => opp.status === 'active').length,
      won_count: opportunitiesWithExpectedValue.filter((opp: OppWithExpected) => opp.status === 'won').length,
      lost_count: opportunitiesWithExpectedValue.filter((opp: OppWithExpected) => opp.status === 'lost').length,
    }

    return NextResponse.json({
      opportunities: opportunitiesWithExpectedValue,
      stats
    })
  } catch (error) {
    console.error("Error in opportunities GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
