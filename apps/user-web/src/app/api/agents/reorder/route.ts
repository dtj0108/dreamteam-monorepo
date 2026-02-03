import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getWorkspaceDeployment } from "@dreamteam/database"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface AgentOrganization {
  department_assignments: Record<string, string | null> // agentId -> departmentId (null = General)
  position_order: string[] // Ordered list of agent IDs
}

// POST /api/agents/reorder - Update agent organization (positions and department assignments)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get workspace ID based on auth type
    let workspaceId: string
    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
    } else {
      const resolvedWorkspaceId = await getCurrentWorkspaceId(auth.userId)
      if (!resolvedWorkspaceId) {
        return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
      }
      workspaceId = resolvedWorkspaceId
    }

    const body = await request.json()
    const { organization } = body as { organization: AgentOrganization }

    if (!organization || !organization.position_order || !Array.isArray(organization.position_order)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get current deployment to update customizations
    const deployment = await getWorkspaceDeployment(workspaceId)

    if (!deployment) {
      return NextResponse.json({ error: "No deployed team found for this workspace" }, { status: 404 })
    }

    // Merge agent_organization into existing customizations
    const currentCustomizations = (deployment.customizations as Record<string, unknown>) || {}
    const updatedCustomizations = {
      ...currentCustomizations,
      agent_organization: {
        department_assignments: organization.department_assignments || {},
        position_order: organization.position_order,
      },
    }

    // Update the deployment record with new customizations
    const { error: updateError } = await adminSupabase
      .from("workspace_deployed_teams")
      .update({ customizations: updatedCustomizations })
      .eq("workspace_id", workspaceId)

    if (updateError) {
      console.error("Error updating agent organization:", updateError)
      return NextResponse.json({ error: "Failed to update agent organization" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      organization: updatedCustomizations.agent_organization,
    })
  } catch (error) {
    console.error("Error in POST /api/agents/reorder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/agents/reorder - Get current agent organization
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get workspace ID based on auth type
    let workspaceId: string
    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
    } else {
      const resolvedWorkspaceId = await getCurrentWorkspaceId(auth.userId)
      if (!resolvedWorkspaceId) {
        return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
      }
      workspaceId = resolvedWorkspaceId
    }

    const deployment = await getWorkspaceDeployment(workspaceId)

    if (!deployment) {
      return NextResponse.json({
        organization: {
          department_assignments: {},
          position_order: [],
        }
      })
    }

    const customizations = (deployment.customizations as Record<string, unknown>) || {}
    const agentOrganization = customizations.agent_organization as AgentOrganization | undefined

    return NextResponse.json({
      organization: agentOrganization || {
        department_assignments: {},
        position_order: [],
      }
    })
  } catch (error) {
    console.error("Error in GET /api/agents/reorder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
