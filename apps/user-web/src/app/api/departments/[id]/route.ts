import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/departments/[id] - Get a single department with its projects
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const adminSupabase = createAdminClient()

    // Get workspace ID based on auth type
    let workspaceId: string
    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
    } else {
      // Session auth - get workspace from cookie (with fallback to default)
      const resolvedWorkspaceId = await getCurrentWorkspaceId(auth.userId)
      if (!resolvedWorkspaceId) {
        return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
      }
      workspaceId = resolvedWorkspaceId
    }

    const { data: department, error } = await adminSupabase
      .from("departments")
      .select(`
        *,
        projects(
          id,
          name,
          status,
          priority,
          color,
          start_date,
          target_end_date
        )
      `)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single()

    if (error || !department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    return NextResponse.json({ department })
  } catch (error) {
    console.error("Error in GET /api/departments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/departments/[id] - Update a department
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const adminSupabase = createAdminClient()

    // Get workspace ID based on auth type
    let workspaceId: string
    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
    } else {
      // Session auth - get workspace from cookie (with fallback to default)
      const resolvedWorkspaceId = await getCurrentWorkspaceId(auth.userId)
      if (!resolvedWorkspaceId) {
        return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
      }
      workspaceId = resolvedWorkspaceId
    }

    const body = await request.json()
    const { name, description, color, icon, position } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (color !== undefined) updates.color = color
    if (icon !== undefined) updates.icon = icon
    if (position !== undefined) updates.position = position

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data: department, error } = await adminSupabase
      .from("departments")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) {
      console.error("Error updating department:", error)
      return NextResponse.json({ error: "Failed to update department" }, { status: 500 })
    }

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    return NextResponse.json({ department })
  } catch (error) {
    console.error("Error in PATCH /api/departments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/departments/[id] - Delete a department
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const adminSupabase = createAdminClient()

    // Get workspace ID based on auth type
    let workspaceId: string
    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
    } else {
      // Session auth - get workspace from cookie (with fallback to default)
      const resolvedWorkspaceId = await getCurrentWorkspaceId(auth.userId)
      if (!resolvedWorkspaceId) {
        return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
      }
      workspaceId = resolvedWorkspaceId
    }

    // Delete the department (projects will have department_id set to NULL due to ON DELETE SET NULL)
    const { error } = await adminSupabase
      .from("departments")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Error deleting department:", error)
      return NextResponse.json({ error: "Failed to delete department" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/departments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
