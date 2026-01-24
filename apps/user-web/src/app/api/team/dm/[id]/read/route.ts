import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// PATCH /api/team/dm/[id]/read - Mark a DM conversation as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dmId } = await params

    if (!dmId) {
      return NextResponse.json({ error: "DM ID required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Update last_read_at for the current user in this conversation
    const { error } = await supabase
      .from("dm_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", dmId)
      .eq("profile_id", session.id)

    if (error) {
      console.error("Error marking DM as read:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PATCH /api/team/dm/[id]/read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
