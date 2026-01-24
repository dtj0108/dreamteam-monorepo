import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/leads/[id]/opportunities
 *
 * List all opportunities for a specific lead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // First verify the lead belongs to this workspace
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get all opportunities for this lead
    const { data: opportunities, error } = await supabase
      .from("lead_opportunities")
      .select("id, name, value, stage, probability, expected_close_date, notes, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching opportunities:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: opportunities || [] })
  } catch (error) {
    console.error("Error in lead opportunities GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
