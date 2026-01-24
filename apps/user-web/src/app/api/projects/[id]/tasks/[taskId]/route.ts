import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

// GET /api/projects/[id]/tasks/[taskId] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { data: task, error } = await adminSupabase
      .from("tasks")
      .select(`
        *,
        task_assignees(
          id,
          user:profiles(id, name, avatar_url, email)
        ),
        task_labels(
          label:project_labels(id, name, color)
        ),
        subtasks:tasks!parent_id(
          id, 
          title, 
          status, 
          priority,
          due_date,
          task_assignees(
            user:profiles(id, name, avatar_url)
          )
        ),
        dependencies:task_dependencies!task_id(
          id,
          dependency_type,
          depends_on:tasks!depends_on_id(id, title, status)
        ),
        blocked_by:task_dependencies!depends_on_id(
          id,
          dependency_type,
          task:tasks!task_id(id, title, status)
        ),
        task_comments(
          id,
          content,
          created_at,
          user:profiles(id, name, avatar_url)
        ),
        task_attachments(
          id,
          name,
          file_url,
          file_type,
          file_size,
          created_at
        ),
        created_by_user:profiles!tasks_created_by_fkey(id, name, avatar_url)
      `)
      .eq("id", taskId)
      .single()

    if (error) {
      console.error("Error fetching task:", error)
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/tasks/[taskId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/projects/[id]/tasks/[taskId] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Get current task to detect status change
    const { data: currentTask } = await adminSupabase
      .from("tasks")
      .select("status, project_id")
      .eq("id", taskId)
      .single()

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    const allowedFields = [
      "title", "description", "status", "priority",
      "start_date", "due_date", "estimated_hours", "actual_hours",
      "parent_id", "position"
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Update task
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await adminSupabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)

      if (updateError) {
        console.error("Error updating task:", updateError)
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
      }
    }

    // Update assignees if provided
    if (body.assignees !== undefined) {
      // Remove existing assignees
      await adminSupabase.from("task_assignees").delete().eq("task_id", taskId)
      
      // Add new assignees
      if (body.assignees.length > 0) {
        const assigneeRecords = body.assignees.map((userId: string) => ({
          task_id: taskId,
          user_id: userId,
        }))
        await adminSupabase.from("task_assignees").insert(assigneeRecords)
      }
    }

    // Update labels if provided
    if (body.labels !== undefined) {
      // Remove existing labels
      await adminSupabase.from("task_labels").delete().eq("task_id", taskId)
      
      // Add new labels
      if (body.labels.length > 0) {
        const labelRecords = body.labels.map((labelId: string) => ({
          task_id: taskId,
          label_id: labelId,
        }))
        await adminSupabase.from("task_labels").insert(labelRecords)
      }
    }

    // Log activity (only for session auth)
    if (auth.type === "session") {
      await adminSupabase
        .from("project_activity")
        .insert({
          project_id: projectId,
          user_id: auth.userId,
          action: "updated",
          entity_type: "task",
          entity_id: taskId,
          metadata: { fields: Object.keys(updates) },
        })
    }

    // Fetch updated task
    const { data: task } = await adminSupabase
      .from("tasks")
      .select(`
        *,
        task_assignees(
          user:profiles(id, name, avatar_url, email)
        ),
        task_labels(
          label:project_labels(id, name, color)
        )
      `)
      .eq("id", taskId)
      .single()

    // Fire webhooks for Make.com triggers
    const { data: project } = await adminSupabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single()

    if (project?.workspace_id && task) {
      // Fire task.completed webhook if status changed to done
      if (body.status === "done" && currentTask?.status !== "done") {
        console.log("[task.completed] Firing webhook for workspace:", project.workspace_id)
        await fireWebhooks("task.completed", {
          ...task,
          name: task.title,
        }, project.workspace_id)
      }

      // Fire task.assigned webhook if assignees changed
      if (body.assignees !== undefined && body.assignees.length > 0) {
        const assignees = task.task_assignees?.map((a: { user: { id: string; name: string; email: string } }) => ({
          id: a.user?.id,
          name: a.user?.name,
          email: a.user?.email,
        }))

        console.log("[task.assigned] Firing webhook for workspace:", project.workspace_id)
        await fireWebhooks("task.assigned", {
          ...task,
          name: task.title,
          assignees,
        }, project.workspace_id)
      }
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Error in PATCH /api/projects/[id]/tasks/[taskId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/tasks/[taskId] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Get task title for activity log
    const { data: task } = await adminSupabase
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .single()

    const { error } = await adminSupabase
      .from("tasks")
      .delete()
      .eq("id", taskId)

    if (error) {
      console.error("Error deleting task:", error)
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
    }

    // Log activity (only for session auth)
    if (auth.type === "session") {
      await adminSupabase
        .from("project_activity")
        .insert({
          project_id: projectId,
          user_id: auth.userId,
          action: "deleted",
          entity_type: "task",
          entity_id: taskId,
          metadata: { title: task?.title },
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]/tasks/[taskId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

