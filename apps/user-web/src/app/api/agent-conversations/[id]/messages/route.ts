import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { getWorkspaceBilling, hasActiveAgents } from '@/lib/billing-queries'

// POST /api/agent-conversations/[id]/messages - Save messages to conversation
export async function POST(
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
    const { messages } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      )
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from("agent_conversations")
      .select("id, title, workspace_id")
      .eq("id", conversationId)
      .eq("user_id", session.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Billing gate: require active agent subscription to save messages
    if (conversation.workspace_id) {
      const billing = await getWorkspaceBilling(conversation.workspace_id)
      if (!hasActiveAgents(billing)) {
        return NextResponse.json(
          { error: 'Agent subscription required', code: 'no_agent_subscription' },
          { status: 403 }
        )
      }
    }

    // Insert messages
    const messagesToInsert = messages.map((msg: any) => ({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content || "",
      parts: msg.parts || null,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from("agent_messages")
      .insert(messagesToInsert)
      .select("id, role, content, parts, created_at")

    if (insertError) {
      console.error("Error inserting messages:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Auto-generate title from first user message if no title
    if (!conversation.title && messages.length > 0) {
      const firstUserMessage = messages.find((m: any) => m.role === "user")
      if (firstUserMessage?.content) {
        const autoTitle = firstUserMessage.content.slice(0, 50) +
          (firstUserMessage.content.length > 50 ? "..." : "")
        await supabase
          .from("agent_conversations")
          .update({ title: autoTitle })
          .eq("id", conversationId)
      }
    }

    return NextResponse.json({ messages: inserted }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/agent-conversations/[id]/messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
