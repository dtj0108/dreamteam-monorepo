import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, toggleAgentEnabled, getWorkspaceDeployment } from "@dreamteam/database"
import { getSession } from "@dreamteam/auth/session"

// DELETE /api/agents/[id]/unhire - Disable an agent in deployed team (or soft delete legacy record)
export async function DELETE(
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

    // Try to get workspaceId from query params (for deployed team path)
    const { searchParams } = new URL(request.url)
    const workspaceIdFromQuery = searchParams.get("workspaceId")

    // First, check if this is a deployed team agent by trying to find workspace with this agent
    // We need the workspaceId - check query param first, then check legacy agents table
    let workspaceId: string | null = workspaceIdFromQuery

    if (!workspaceId) {
      // Try to get workspace from legacy agents table
      const { data: localAgent } = await supabase
        .from("agents")
        .select("workspace_id")
        .eq("id", id)
        .single()

      workspaceId = localAgent?.workspace_id || null
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
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

    // Check if workspace has a deployed team
    const deployment = await getWorkspaceDeployment(workspaceId)

    if (deployment) {
      // NEW PATH: Use toggle to disable agent in deployed team
      const activeConfig = deployment.active_config as {
        agents: Array<{ id: string; slug: string; is_enabled: boolean }>
      }

      const agent = activeConfig?.agents?.find(a => a.id === id)

      if (agent) {
        // Found in deployed team - toggle to disabled
        const result = await toggleAgentEnabled(workspaceId, agent.slug, false, session.id)

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || "Failed to disable agent" },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, disabled: true })
      }
    }

    // LEGACY PATH: Soft delete local agent record
    const { data: localAgent, error: fetchError } = await supabase
      .from("agents")
      .select("id, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !localAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Soft delete by setting is_active to false
    const { error: updateError } = await supabase
      .from("agents")
      .update({ is_active: false })
      .eq("id", id)

    if (updateError) {
      console.error("Error unhiring agent:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/agents/[id]/unhire:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
