import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

// GET /api/projects - List all projects for the workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const departmentId = searchParams.get("department_id")

    let query = adminSupabase
      .from("projects")
      .select(`
        *,
        department:departments(id, name, color, icon),
        owner:profiles!projects_owner_id_fkey(id, name, avatar_url),
        project_members(
          id,
          role,
          user:profiles(id, name, avatar_url)
        ),
        tasks(
          id,
          project_id,
          title,
          description,
          status,
          priority,
          start_date,
          due_date,
          position,
          task_assignees(
            id,
            user:profiles(id, name, avatar_url)
          )
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (departmentId) {
      query = query.eq("department_id", departmentId)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }

    // Calculate progress for each project
    type Project = { tasks?: { status: string }[]; [key: string]: unknown }
    const projectsWithProgress = projects?.map((project: Project) => {
      const tasks = project.tasks || []
      const completedTasks = tasks.filter((t: { status: string }) => t.status === "done").length
      const totalTasks = tasks.length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        ...project,
        progress,
        completedTasks,
        totalTasks,
      }
    })

    return NextResponse.json({ projects: projectsWithProgress })
  } catch (error) {
    console.error("Error in GET /api/projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS for project creation
    const adminSupabase = createAdminClient()

    // Get workspace ID and user ID based on auth type
    let workspaceId: string
    let userId: string | null = null

    if (isApiKeyAuth(auth)) {
      workspaceId = auth.workspaceId
      // API key doesn't have a user, so owner will be null
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
    const { name, description, status, priority, color, icon, start_date, target_end_date, budget, department_id } = body

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    // Create the project
    const { data: project, error: projectError } = await adminSupabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        status: status || "active",
        priority: priority || "medium",
        color: color || "#6366f1",
        icon: icon || "folder",
        start_date,
        target_end_date,
        budget,
        owner_id: userId,
        department_id: department_id || null,
        position: 0, // New projects go to top
      })
      .select()
      .single()

    if (projectError) {
      console.error("Error creating project:", projectError)
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }

    // Add the creator as an owner member (only for session auth)
    if (userId) {
      await adminSupabase
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: userId,
          role: "owner",
        })

      // Log activity
      await adminSupabase
        .from("project_activity")
        .insert({
          project_id: project.id,
          user_id: userId,
          action: "created",
          entity_type: "project",
          entity_id: project.id,
        })
    }

    // Fire webhook for Make.com integrations (non-blocking)
    fireWebhooks("project.created", project, workspaceId)

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

