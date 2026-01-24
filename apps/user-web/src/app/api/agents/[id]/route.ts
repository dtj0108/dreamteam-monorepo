import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/agents/[id] - Get single agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Try to find in ai_agents first
    const { data: aiAgent, error: aiError } = await supabase
      .from("ai_agents")
      .select(`
        *,
        department:agent_departments(id, name, description, icon)
      `)
      .eq("id", id)
      .single()

    if (aiAgent) {
      // Check if hired in any workspace the user belongs to
      const { data: localAgent } = await supabase
        .from("agents")
        .select("id, hired_at, workspace_id")
        .eq("ai_agent_id", id)
        .single()

      return NextResponse.json({
        agent: aiAgent,
        localAgent: localAgent || null,
        isHired: !!localAgent,
      })
    }

    // If not in ai_agents, try local agents table
    const { data: localAgent, error: localError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single()

    if (localError || !localAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Transform local agent to match AIAgent shape
    return NextResponse.json({
      agent: {
        id: localAgent.id,
        name: localAgent.name,
        slug: null,
        description: localAgent.description,
        department_id: null,
        avatar_url: localAgent.avatar_url,
        model: localAgent.model,
        system_prompt: localAgent.system_prompt,
        permission_mode: "default",
        max_turns: 10,
        is_enabled: localAgent.is_active,
        is_head: false,
        config: {},
        current_version: 1,
        published_version: 1,
        created_at: localAgent.created_at,
        updated_at: localAgent.updated_at,
      },
      localAgent,
      isHired: true,
    })
  } catch (error) {
    console.error("Error in GET /api/agents/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
