import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface BulkUpdateRequest {
  lead_ids: string[]
  updates: {
    stage_id?: string
    assigned_to?: string | null
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const body: BulkUpdateRequest = await request.json()

    if (!body.lead_ids || !Array.isArray(body.lead_ids) || body.lead_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one lead ID is required" },
        { status: 400 }
      )
    }

    if (body.lead_ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 leads can be updated at once" },
        { status: 400 }
      )
    }

    if (!body.updates || Object.keys(body.updates).length === 0) {
      return NextResponse.json(
        { error: "At least one update field is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.updates.stage_id !== undefined) {
      updateData.stage_id = body.updates.stage_id
    }

    if (body.updates.assigned_to !== undefined) {
      updateData.assigned_to = body.updates.assigned_to
    }

    // Update leads (only those belonging to user's workspace)
    const { error, count } = await supabase
      .from("leads")
      .update(updateData)
      .in("id", body.lead_ids)
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Bulk update leads error:", error)
      return NextResponse.json(
        { error: "Failed to update leads" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated: count || body.lead_ids.length,
    })
  } catch (error) {
    console.error("Bulk update leads error:", error)
    return NextResponse.json(
      { error: "Failed to update leads" },
      { status: 500 }
    )
  }
}
