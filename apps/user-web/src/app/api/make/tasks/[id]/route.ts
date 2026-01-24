import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/tasks/[id]
 *
 * Get a single task by ID.
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

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        project:projects!inner(id, name, workspace_id),
        task_assignees(
          user:profiles(id, name, avatar_url)
        ),
        task_labels(
          label:project_labels(id, name, color)
        )
      `)
      .eq("id", id)
      .eq("project.workspace_id", auth.workspaceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 })
      }
      console.error("Error fetching task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...data, name: data.title })
  } catch (error) {
    console.error("Error in task GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/make/tasks/[id]
 *
 * Update a task.
 * Fires task.completed webhook if status becomes "done".
 * Fires task.assigned webhook if assignees change.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    // Get the current task
    const { data: currentTask } = await supabase
      .from("tasks")
      .select(`
        status,
        project:projects!inner(workspace_id),
        task_assignees(user_id)
      `)
      .eq("id", id)
      .eq("project.workspace_id", auth.workspaceId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const oldStatus = currentTask.status
    const oldAssigneeIds = currentTask.task_assignees.map((a: { user_id: string }) => a.user_id)

    // Build update object with allowed fields
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "start_date",
      "due_date",
      "estimated_hours",
      "actual_hours",
      "position",
    ]

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Handle assignee updates
    if (body.assignee_ids !== undefined) {
      const newAssigneeIds = body.assignee_ids as string[]

      // Remove old assignees
      await supabase.from("task_assignees").delete().eq("task_id", id)

      // Add new assignees
      if (newAssigneeIds.length > 0) {
        const assigneeInserts = newAssigneeIds.map((userId: string) => ({
          task_id: id,
          user_id: userId,
        }))
        await supabase.from("task_assignees").insert(assigneeInserts)
      }

      // Check if assignees actually changed
      const sortedOld = [...oldAssigneeIds].sort()
      const sortedNew = [...newAssigneeIds].sort()
      const assigneesChanged =
        sortedOld.length !== sortedNew.length ||
        sortedOld.some((id, i) => id !== sortedNew[i])

      if (assigneesChanged) {
        await fireWebhooks(
          "task.assigned",
          { ...data, name: data.title, old_assignees: oldAssigneeIds, new_assignees: newAssigneeIds },
          auth.workspaceId
        )
      }
    }

    // Fire webhook if task is completed
    if (body.status === "done" && oldStatus !== "done") {
      await fireWebhooks("task.completed", { ...data, name: data.title }, auth.workspaceId)
    }

    return NextResponse.json({ ...data, name: data.title })
  } catch (error) {
    console.error("Error in task PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/make/tasks/[id]
 *
 * Delete a task.
 */
export async function DELETE(
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

    // First verify the task belongs to a project in this workspace
    const { data: task } = await supabase
      .from("tasks")
      .select(`project:projects!inner(workspace_id)`)
      .eq("id", id)
      .eq("project.workspace_id", auth.workspaceId)
      .single()

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in task DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
