import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface BulkDeleteRequest {
  contact_ids: string[]
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

    if (!body.contact_ids || !Array.isArray(body.contact_ids) || body.contact_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one contact ID is required" },
        { status: 400 }
      )
    }

    if (body.contact_ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 contacts can be deleted at once" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify ownership through leads - get contacts that belong to user's leads
    const { data: validContacts, error: verifyError } = await supabase
      .from("contacts")
      .select(`
        id,
        lead:leads!inner(user_id, workspace_id)
      `)
      .in("id", body.contact_ids)
      .eq("lead.user_id", session.id)
      .eq("lead.workspace_id", workspaceId)

    if (verifyError) {
      console.error("Error verifying contacts:", verifyError)
      return NextResponse.json(
        { error: "Failed to verify contacts" },
        { status: 500 }
      )
    }

    const validContactIds = validContacts?.map((c: { id: string }) => c.id) || []
    if (validContactIds.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts found" },
        { status: 404 }
      )
    }

    // Delete the valid contacts
    const { error, count } = await supabase
      .from("contacts")
      .delete()
      .in("id", validContactIds)

    if (error) {
      console.error("Bulk delete contacts error:", error)
      return NextResponse.json(
        { error: "Failed to delete contacts" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: count || validContactIds.length,
    })
  } catch (error) {
    console.error("Bulk delete contacts error:", error)
    return NextResponse.json(
      { error: "Failed to delete contacts" },
      { status: 500 }
    )
  }
}
