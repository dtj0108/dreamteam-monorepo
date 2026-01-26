import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, toggleAgentEnabled, getWorkspaceDeployment } from "@dreamteam/database"
import { getSession } from "@dreamteam/auth/session"

// POST /api/agents/[id]/hire - Enable an agent in deployed team (or create legacy record)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    const supabase = createAdminClient()

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

    // Check if workspace has a deployed team
    const deployment = await getWorkspaceDeployment(workspaceId)

    if (deployment) {
      // NEW PATH: Use toggle to enable agent in deployed team
      const activeConfig = deployment.active_config as {
        agents: Array<{ id: string; slug: string; is_enabled: boolean }>
      }

      const agent = activeConfig?.agents?.find(a => a.id === id)

      if (!agent) {
        return NextResponse.json(
          { error: "Agent not found in workspace deployment. Upgrade your plan to access more agents." },
          { status: 404 }
        )
      }

      if (agent.is_enabled) {
        return NextResponse.json(
          { error: "Agent is already enabled" },
          { status: 409 }
        )
      }

      // Toggle to enabled
      const result = await toggleAgentEnabled(workspaceId, agent.slug, true, session.id)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to enable agent" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        id: agent.id,
        hired_at: new Date().toISOString(),
        enabled: true,
      }, { status: 200 })
    }

    // LEGACY PATH: Create local agent record
    // Check if already hired
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("ai_agent_id", id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Agent already hired in this workspace" },
        { status: 409 }
      )
    }

    // Get the ai_agent details
    const { data: aiAgent, error: aiError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .single()

    if (aiError || !aiAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Create local agent record
    const { data: localAgent, error: createError } = await supabase
      .from("agents")
      .insert({
        workspace_id: workspaceId,
        ai_agent_id: id,
        name: aiAgent.name,
        description: aiAgent.description,
        avatar_url: aiAgent.avatar_url,
        system_prompt: aiAgent.system_prompt,
        model: aiAgent.model,
        tools: [], // Tools are managed by ai_agent
        is_active: true,
        created_by: session.id,
        hired_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("Error hiring agent:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json(localAgent, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/agents/[id]/hire:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
