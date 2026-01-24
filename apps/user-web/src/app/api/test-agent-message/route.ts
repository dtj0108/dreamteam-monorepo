import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// POST /api/test-agent-message - Create a test message in agent chat
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { agentId, workspaceId } = body

    if (!agentId || !workspaceId) {
      return NextResponse.json(
        { error: "agentId and workspaceId are required" },
        { status: 400 }
      )
    }

    console.log("🧪 [TEST] Creating test conversation for agent:", agentId, "user:", session.id)

    // Find or create conversation
    let conversationId: string

    const { data: existing } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .single()

    if (existing) {
      conversationId = existing.id
      console.log("🧪 [TEST] Found existing conversation:", conversationId)
    } else {
      const { data: newConvo, error: createError } = await supabase
        .from("agent_conversations")
        .insert({
          agent_id: agentId,
          user_id: session.id,
          workspace_id: workspaceId,
          title: "Test Conversation",
        })
        .select("id")
        .single()

      if (createError) {
        console.error("🧪 [TEST] Failed to create conversation:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
      conversationId = newConvo.id
      console.log("🧪 [TEST] Created new conversation:", conversationId)
    }

    // Insert test message
    const testContent = `**Test Message**\n\nThis is a test message created at ${new Date().toISOString()} to verify agent chat message loading works correctly.`

    const { data: message, error: msgError } = await supabase
      .from("agent_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: testContent,
        parts: [{ type: "text", text: testContent }],
      })
      .select("id")
      .single()

    if (msgError) {
      console.error("🧪 [TEST] Failed to insert message:", msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    console.log("🧪 [TEST] Created test message:", message.id, "in conversation:", conversationId)

    return NextResponse.json({
      success: true,
      conversationId,
      messageId: message.id,
    })
  } catch (error) {
    console.error("🧪 [TEST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
