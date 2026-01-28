import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/workspace - Get workspace settings
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get workspace
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id, name, slug, description, avatar_url, owner_id, created_at, business_context")
      .eq("id", workspaceId)
      .single()

    if (error) {
      console.error("Error fetching workspace:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(workspace)
  } catch (error) {
    console.error("Error in GET /api/team/workspace:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/team/workspace - Update workspace settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const body = await request.json()
    const { workspaceId, name, description, businessContext } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is owner
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Check if user is owner or has permission
    const isOwner = workspace.owner_id === session.id

    if (!isOwner) {
      // Check for can_edit_workspace permission
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("profile_id", session.id)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: "Not a member of this workspace" },
          { status: 403 }
        )
      }

      const { data: permission } = await supabase
        .from("workspace_permissions")
        .select("is_enabled")
        .eq("workspace_id", workspaceId)
        .eq("role", membership.role)
        .eq("permission_key", "can_edit_workspace")
        .single()

      if (!permission?.is_enabled) {
        return NextResponse.json(
          { error: "You don't have permission to edit workspace settings" },
          { status: 403 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (businessContext !== undefined) updateData.business_context = businessContext

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Update workspace
    const { data: updated, error } = await supabase
      .from("workspaces")
      .update(updateData)
      .eq("id", workspaceId)
      .select("id, name, slug, description, avatar_url, owner_id, created_at, business_context")
      .single()

    if (error) {
      console.error("Error updating workspace:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error in PATCH /api/team/workspace:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
