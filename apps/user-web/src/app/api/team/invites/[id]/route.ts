import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

type SupabaseClient = ReturnType<typeof createAdminClient>

// Helper to check if user can manage invites
async function canManageInvites(
  supabase: SupabaseClient,
  userId: string,
  inviteId: string
) {
  // Get the invite to find workspace
  const { data: invite, error: inviteError } = await supabase
    .from("pending_invites")
    .select("workspace_id")
    .eq("id", inviteId)
    .single()

  if (inviteError || !invite) {
    return { allowed: false, error: "Invite not found", status: 404 }
  }

  // Check user's role in workspace
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", invite.workspace_id)
    .eq("profile_id", userId)
    .single()

  if (memberError || !membership) {
    return { allowed: false, error: "Not a member of this workspace", status: 403 }
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return { allowed: false, error: "Only admins can manage invites", status: 403 }
  }

  return { allowed: true, membership }
}

// PUT /api/team/invites/[id] - Update invite role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id } = await params

    const body = await request.json()
    const { role } = body

    if (!role || !["member", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Check permissions
    const permCheck = await canManageInvites(supabase, session.id, id)
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: permCheck.error },
        { status: permCheck.status }
      )
    }

    // Update the invite
    const { data: updated, error: updateError } = await supabase
      .from("pending_invites")
      .update({ role })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating invite:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error in PUT /api/team/invites/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/invites/[id] - Revoke invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id } = await params

    // Check permissions
    const permCheck = await canManageInvites(supabase, session.id, id)
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: permCheck.error },
        { status: permCheck.status }
      )
    }

    // Delete the invite
    const { error: deleteError } = await supabase
      .from("pending_invites")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting invite:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/invites/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
