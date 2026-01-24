import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// PATCH /api/agent-conversations/[id]/read - Mark conversation as read
// Updates last_read_at to current timestamp, clearing unread badges
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: conversationId } = await params
    const supabase = createAdminClient()

    // Update last_read_at and verify ownership
    const { data: conversation, error } = await supabase
      .from("agent_conversations")
      .update({ last_read_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", session.id)
      .select("id, last_read_at")
      .single()

    if (error) {
      console.error("Error marking conversation as read:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Error in PATCH /api/agent-conversations/[id]/read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
