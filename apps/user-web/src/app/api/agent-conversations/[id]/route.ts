import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/agent-conversations/[id] - Get conversation with messages
export async function GET(
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

    // Get the conversation and verify ownership
    const { data: conversation, error: convError } = await supabase
      .from("agent_conversations")
      .select("id, agent_id, workspace_id, title, created_at, updated_at")
      .eq("id", conversationId)
      .eq("user_id", session.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Get messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from("agent_messages")
      .select("id, role, content, parts, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (msgError) {
      console.error("Error fetching messages:", msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    return NextResponse.json({
      ...conversation,
      messages: messages || [],
    })
  } catch (error) {
    console.error("Error in GET /api/agent-conversations/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/agent-conversations/[id] - Update conversation title
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
    const body = await request.json()
    const { title } = body

    // Update and verify ownership
    const { data: conversation, error } = await supabase
      .from("agent_conversations")
      .update({ title })
      .eq("id", conversationId)
      .eq("user_id", session.id)
      .select("id, title, updated_at")
      .single()

    if (error) {
      console.error("Error updating conversation:", error)
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
    console.error("Error in PATCH /api/agent-conversations/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/agent-conversations/[id] - Delete conversation
export async function DELETE(
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

    // Delete and verify ownership (messages cascade delete)
    const { error } = await supabase
      .from("agent_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", session.id)

    if (error) {
      console.error("Error deleting conversation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/agent-conversations/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
