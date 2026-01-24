import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/opportunities
 *
 * List all opportunities in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const stage = searchParams.get("stage")
    const leadId = searchParams.get("lead_id")

    let query = supabase
      .from("lead_opportunities")
      .select(`
        id, name, value, stage, probability, expected_close_date, notes, created_at, updated_at,
        lead:leads!inner(id, name, status, workspace_id)
      `)
      .eq("lead.workspace_id", auth.workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (stage) {
      query = query.eq("stage", stage)
    }

    if (leadId) {
      query = query.eq("lead_id", leadId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching opportunities:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in opportunities GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/opportunities
 *
 * Create a new opportunity.
 * Fires opportunity.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { lead_id, name, value, stage, probability, expected_close_date, notes } = body

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the lead belongs to this workspace
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, user_id, workspace_id")
      .eq("id", lead_id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("lead_opportunities")
      .insert({
        lead_id,
        user_id: lead.user_id,
        workspace_id: auth.workspaceId,
        name,
        value: value || null,
        stage: stage || "prospect",
        probability: probability || 0,
        expected_close_date: expected_close_date || null,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook
    await fireWebhooks("opportunity.created", { ...data, lead_id }, auth.workspaceId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in opportunities POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
