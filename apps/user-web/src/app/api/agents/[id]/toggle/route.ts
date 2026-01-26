import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, toggleAgentEnabled, getWorkspaceDeployment } from "@dreamteam/database"
import { getSession } from "@dreamteam/auth/session"

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/agents/[id]/toggle - Toggle agent enabled/disabled state
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: agentId } = await context.params
    const body = await request.json()
    const { workspaceId, enabled } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) required" }, { status: 400 })
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

    // Get the deployment to find the agent slug
    const deployment = await getWorkspaceDeployment(workspaceId)

    if (!deployment) {
      return NextResponse.json(
        { error: "No active team deployment found for this workspace" },
        { status: 404 }
      )
    }

    // Find the agent in the deployment config
    const activeConfig = deployment.active_config as {
      agents: Array<{ id: string; slug: string; is_enabled: boolean }>
    }

    const agent = activeConfig?.agents?.find(a => a.id === agentId)

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found in workspace deployment" },
        { status: 404 }
      )
    }

    // Toggle the agent's enabled state
    const result = await toggleAgentEnabled(
      workspaceId,
      agent.slug,
      enabled,
      session.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to toggle agent" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      agentId,
      agentSlug: agent.slug,
      enabled,
    })
  } catch (error) {
    console.error("Error in POST /api/agents/[id]/toggle:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
