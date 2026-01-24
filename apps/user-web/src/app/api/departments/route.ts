import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

// GET /api/departments - List all departments for the workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Fetch departments with project counts
    const { data: departments, error } = await adminSupabase
      .from("departments")
      .select(`
        *,
        projects(id)
      `)
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching departments:", error)
      return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
    }

    // Transform to include project count
    const departmentsWithCounts = departments?.map((dept: { projects?: { id: string }[] }) => ({
      ...dept,
      project_count: dept.projects?.length || 0,
      projects: undefined, // Remove the projects array, just keep the count
    }))

    return NextResponse.json({ departments: departmentsWithCounts })
  } catch (error) {
    console.error("Error in GET /api/departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Get workspace ID and user ID based on auth type
    let workspaceId: string
    let userId: string | null = null

    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
    } else {
      // Session auth - get workspace from cookie (with fallback to default)
      const resolvedWorkspaceId = await getCurrentWorkspaceId(auth.userId)
      if (!resolvedWorkspaceId) {
        return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
      }
      workspaceId = resolvedWorkspaceId
      userId = auth.userId
    }

    const body = await request.json()
    const { name, description, color, icon, position } = body

    if (!name) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    // Get the max position if not provided
    let finalPosition = position
    if (finalPosition === undefined) {
      const { data: maxPos } = await adminSupabase
        .from("departments")
        .select("position")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: false })
        .limit(1)
        .single()

      finalPosition = (maxPos?.position ?? -1) + 1
    }

    const { data: department, error } = await adminSupabase
      .from("departments")
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        color: color || "#6366f1",
        icon: icon || "building-2",
        position: finalPosition,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating department:", error)
      return NextResponse.json({ error: "Failed to create department" }, { status: 500 })
    }

    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
