import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext } from "@/lib/api-auth"

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { data: project, error } = await adminSupabase
      .from("projects")
      .select(`
        *,
        owner:profiles!projects_owner_id_fkey(id, name, avatar_url, email),
        project_members(
          id,
          role,
          hours_per_week,
          user:profiles(id, name, avatar_url, email)
        ),
        tasks(
          id,
          title,
          status,
          priority,
          due_date,
          start_date,
          estimated_hours,
          position,
          parent_id,
          task_assignees(
            user:profiles(id, name, avatar_url)
          )
        ),
        milestones(
          id,
          name,
          target_date,
          status
        ),
        project_labels(
          id,
          name,
          color
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching project:", error)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Calculate progress
    const tasks = project.tasks || []
    const completedTasks = tasks.filter((t: { status: string }) => t.status === "done").length
    const totalTasks = tasks.length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return NextResponse.json({ 
      project: {
        ...project,
        progress,
        completedTasks,
        totalTasks,
      }
    })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    const allowedFields = [
      "name", "description", "status", "priority", "color", "icon",
      "start_date", "target_end_date", "actual_end_date", "budget", "position"
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { data: project, error } = await adminSupabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating project:", error)
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
    }

    // Log activity (only for session auth)
    if (auth.type === "session") {
      await adminSupabase
        .from("project_activity")
        .insert({
          project_id: id,
          user_id: auth.userId,
          action: "updated",
          entity_type: "project",
          entity_id: id,
          metadata: { fields: Object.keys(updates) },
        })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in PATCH /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { error } = await adminSupabase
      .from("projects")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting project:", error)
      return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

