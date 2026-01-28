import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/agent-conversations - List conversations for an agent
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

    // Get user's conversations for this workspace
    // In team mode, conversations may be stored with a different agent_id (the workspace's agent)
    // since team agent IDs don't exist in the agents table (FK constraint)
    // So we query by workspace_id + user_id to get all conversations
    const { data: conversations, error } = await supabase
      .from("agent_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching conversations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(conversations || [])
  } catch (error) {
    console.error("Error in GET /api/agent-conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/agent-conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { agentId, workspaceId, title } = body

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

    // Create the conversation
    const { data: conversation, error } = await supabase
      .from("agent_conversations")
      .insert({
        agent_id: agentId,
        workspace_id: workspaceId,
        user_id: session.id,
        title: title || null,
      })
      .select("id, title, created_at, updated_at")
      .single()

    if (error) {
      console.error("Error creating conversation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/agent-conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
