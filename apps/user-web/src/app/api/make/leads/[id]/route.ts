import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/leads/[id]
 *
 * Get a single lead by ID.
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
      .from("leads")
      .select(`
        *,
        contacts:contacts(id, first_name, last_name, email, phone, title),
        opportunities:lead_opportunities(id, name, value, stage, probability, expected_close_date),
        tasks:lead_tasks(id, title, description, due_date, is_completed)
      `)
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
      }
      console.error("Error fetching lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/make/leads/[id]
 *
 * Update a lead.
 * Fires lead.status_changed webhook if status changes.
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

    // Get the current lead to check for status/stage changes
    const { data: currentLead } = await supabase
      .from("leads")
      .select("status, stage_id")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (!currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const oldStatus = currentLead.status
    const oldStageId = currentLead.stage_id

    // Build update object with allowed fields
    const allowedFields = [
      "name",
      "website",
      "industry",
      "status",
      "notes",
      "address",
      "city",
      "state",
      "country",
      "postal_code",
      "pipeline_id",
      "stage_id",
    ]

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .select()
      .single()

    if (error) {
      console.error("Error updating lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire status change webhook if status changed
    if (body.status && body.status !== oldStatus) {
      await fireWebhooks(
        "lead.status_changed",
        { ...data, old_status: oldStatus, new_status: body.status },
        auth.workspaceId
      )
    }

    // Fire stage change webhook if stage changed
    if (body.stage_id && body.stage_id !== oldStageId) {
      await fireWebhooks(
        "lead.stage_changed",
        { ...data, old_stage_id: oldStageId, new_stage_id: body.stage_id },
        auth.workspaceId
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/make/leads/[id]
 *
 * Delete a lead.
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

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)

    if (error) {
      console.error("Error deleting lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in lead DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
