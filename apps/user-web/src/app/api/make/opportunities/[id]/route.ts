import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/opportunities/[id]
 *
 * Get a single opportunity by ID.
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

    const { data, error } = await supabase
      .from("lead_opportunities")
      .select(`
        *,
        lead:leads!inner(id, name, status, workspace_id)
      `)
      .eq("id", id)
      .eq("lead.workspace_id", auth.workspaceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
      }
      console.error("Error fetching opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in opportunity GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/make/opportunities/[id]
 *
 * Update an opportunity.
 * Fires opportunity.stage_changed webhook if stage changes.
 * Fires opportunity.won webhook if stage becomes "won".
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    // Get the current opportunity to check for stage changes
    const { data: currentOpp } = await supabase
      .from("lead_opportunities")
      .select(`
        stage,
        lead:leads!inner(workspace_id)
      `)
      .eq("id", id)
      .eq("lead.workspace_id", auth.workspaceId)
      .single()

    if (!currentOpp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    const oldStage = currentOpp.stage

    // Build update object with allowed fields
    const allowedFields = [
      "name",
      "value",
      "stage",
      "probability",
      "expected_close_date",
      "notes",
    ]

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from("lead_opportunities")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhooks for stage changes
    if (body.stage && body.stage !== oldStage) {
      await fireWebhooks(
        "opportunity.stage_changed",
        { ...data, old_stage: oldStage, new_stage: body.stage },
        auth.workspaceId
      )

      // Check if the new stage indicates a win
      if (body.stage.toLowerCase() === "won" || body.stage.toLowerCase() === "closed_won") {
        await fireWebhooks("opportunity.won", data, auth.workspaceId)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in opportunity PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/make/opportunities/[id]
 *
 * Delete an opportunity.
 */
export async function DELETE(
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

    // First verify the opportunity belongs to a lead in this workspace
    const { data: opp } = await supabase
      .from("lead_opportunities")
      .select(`lead:leads!inner(workspace_id)`)
      .eq("id", id)
      .eq("lead.workspace_id", auth.workspaceId)
      .single()

    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("lead_opportunities")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in opportunity DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
