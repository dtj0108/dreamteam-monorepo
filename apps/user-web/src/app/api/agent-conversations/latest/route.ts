import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

/**
 * GET /api/agent-conversations/latest
 *
 * Combined endpoint that fetches the user's most recent conversation with an agent
 * AND all its messages in a single request. This eliminates the waterfall of
 * sequential API calls (conversations list → conversation details) that caused
 * a ~1 second delay in chat loading.
 *
 * Query params:
 *   - agentId: The agent to get conversation for
 *   - workspaceId: The workspace context
 *
 * Returns:
 *   - { conversation: {...} | null, messages: [...] }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const workspaceId = searchParams.get("workspaceId")

    if (!agentId || !workspaceId) {
      return NextResponse.json(
        { error: "agentId and workspaceId are required" },
        { status: 400 }
      )
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get user's most recent conversation for this agent
    const { data: conversation, error: convError } = await supabase
      .from("agent_conversations")
      .select("id, title, created_at, updated_at")
      .eq("agent_id", agentId)
      .eq("user_id", session.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    // No conversation found - return null conversation and empty messages
    if (convError?.code === "PGRST116" || !conversation) {
      return NextResponse.json({
        conversation: null,
        messages: [],
      })
    }

    if (convError) {
      console.error("Error fetching conversation:", convError)
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }

    // Get messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from("agent_messages")
      .select("id, role, content, parts, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })

    if (msgError) {
      console.error("Error fetching messages:", msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
    })
  } catch (error) {
    console.error("Error in GET /api/agent-conversations/latest:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
