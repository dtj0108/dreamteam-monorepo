import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/tasks
 *
 * List all tasks in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")
    const projectId = searchParams.get("project_id")

    let query = supabase
      .from("tasks")
      .select(`
        id, title, description, status, priority, start_date, due_date,
        estimated_hours, actual_hours, position, created_at, updated_at,
        project:projects!inner(id, name, workspace_id),
        task_assignees(
          user:profiles(id, name)
        )
      `)
      .eq("project.workspace_id", auth.workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    if (projectId) {
      query = query.eq("project_id", projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown (name = title)
    const formattedTasks = (data || []).map((t: { title: string; [key: string]: unknown }) => ({
      ...t,
      name: t.title,
    }))

    return NextResponse.json({ data: formattedTasks })
  } catch (error) {
    console.error("Error in tasks GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/tasks
 *
 * Create a new task.
 * Fires task.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      project_id,
      title,
      description,
      status,
      priority,
      start_date,
      due_date,
      estimated_hours,
      assignee_ids,
    } = body

    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the project belongs to this workspace
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, workspace_id")
      .eq("id", project_id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get the API key owner for created_by
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    // Get next position
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("project_id", project_id)
      .order("position", { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (lastTask?.position || 0) + 1

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id,
        title,
        description,
        status: status || "todo",
        priority: priority || "medium",
        start_date,
        due_date,
        estimated_hours,
        position: nextPosition,
        created_by: apiKey?.created_by || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add assignees if provided
    if (assignee_ids && assignee_ids.length > 0) {
      const assigneeInserts = assignee_ids.map((userId: string) => ({
        task_id: data.id,
        user_id: userId,
      }))

      await supabase.from("task_assignees").insert(assigneeInserts)
    }

    // Fire webhook
    await fireWebhooks("task.created", { ...data, name: data.title }, auth.workspaceId)

    return NextResponse.json({ ...data, name: data.title }, { status: 201 })
  } catch (error) {
    console.error("Error in tasks POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
