import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/projects/[id]/tasks
 *
 * List all tasks for a specific project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // First verify the project belongs to this workspace
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all tasks for this project
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id, title, description, status, priority, start_date, due_date,
        estimated_hours, actual_hours, position, created_at,
        task_assignees(
          user:profiles(id, name, avatar_url)
        )
      `)
      .eq("project_id", id)
      .order("position", { ascending: true })

    if (error) {
      console.error("Error fetching tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown (name = title)
    const formattedTasks = (tasks || []).map((t: { title: string; [key: string]: unknown }) => ({
      ...t,
      name: t.title,
    }))

    return NextResponse.json({ data: formattedTasks })
  } catch (error) {
    console.error("Error in project tasks GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
