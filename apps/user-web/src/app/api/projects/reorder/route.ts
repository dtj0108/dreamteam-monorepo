import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface ProjectPosition {
  id: string
  position: number
}

// POST /api/projects/reorder - Bulk update project positions
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
    const { projects } = body as { projects: ProjectPosition[] }

    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Update each project's position
    // Using Promise.all for better performance
    const updatePromises = projects.map(({ id, position }) =>
      adminSupabase
        .from("projects")
        .update({ position })
        .eq("id", id)
        .eq("workspace_id", workspaceId) // Ensure user can only update their own workspace's projects
    )

    const results = await Promise.all(updatePromises)

    // Check for any errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error("Errors updating project positions:", errors)
      return NextResponse.json({ error: "Failed to update some project positions" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST /api/projects/reorder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
