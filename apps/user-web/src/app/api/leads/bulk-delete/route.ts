import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface BulkDeleteRequest {
  lead_ids: string[]
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

    const body: BulkDeleteRequest = await request.json()

    if (!body.lead_ids || !Array.isArray(body.lead_ids) || body.lead_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one lead ID is required" },
        { status: 400 }
      )
    }

    if (body.lead_ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 leads can be deleted at once" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Delete leads (only those belonging to the workspace)
    // Contacts will be cascade deleted via foreign key
    const { error, count } = await supabase
      .from("leads")
      .delete()
      .in("id", body.lead_ids)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Bulk delete leads error:", error)
      return NextResponse.json(
        { error: "Failed to delete leads" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: count || body.lead_ids.length,
    })
  } catch (error) {
    console.error("Bulk delete leads error:", error)
    return NextResponse.json(
      { error: "Failed to delete leads" },
      { status: 500 }
    )
  }
}
