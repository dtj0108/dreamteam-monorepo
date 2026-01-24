import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext } from "@/lib/api-auth"
import { sendPushToUsers, type PushNotificationPayload } from "@/lib/push-notifications"
import { fireWebhooks } from "@/lib/make-webhooks"

// GET /api/projects/[id]/tasks - List all tasks for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const assigneeId = searchParams.get("assignee")

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    let query = adminSupabase
      .from("tasks")
      .select(`
        *,
        task_assignees(
          id,
          user:profiles(id, name, avatar_url)
        ),
        task_labels(
          label:project_labels(id, name, color)
        ),
        subtasks:tasks!parent_id(id, title, status),
        dependencies:task_dependencies!task_id(
          depends_on:tasks!depends_on_id(id, title, status)
        ),
        blocked_by:task_dependencies!depends_on_id(
          task:tasks!task_id(id, title, status)
        ),
        created_by_user:profiles!tasks_created_by_fkey(id, name, avatar_url)
      `)
      .eq("project_id", projectId)
      .is("parent_id", null) // Only get top-level tasks
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }

    // Filter by assignee if specified
    type Task = { task_assignees?: { user?: { id: string } }[]; [key: string]: unknown }
    let filteredTasks = tasks
    if (assigneeId) {
      filteredTasks = tasks?.filter((task: Task) => 
        task.task_assignees?.some((a: { user?: { id: string } }) => a.user?.id === assigneeId)
      )
    }

    return NextResponse.json({ tasks: filteredTasks })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects/[id]/tasks - Create a new task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      status, 
      priority, 
      start_date, 
      due_date, 
      estimated_hours,
      parent_id,
      assignees,
      labels,
      position 
    } = body

    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    // Get the max position for the status column if not provided
    let taskPosition = position
    if (taskPosition === undefined) {
      const { data: maxPositionTask } = await adminSupabase
        .from("tasks")
        .select("position")
        .eq("project_id", projectId)
        .eq("status", status || "todo")
        .order("position", { ascending: false })
        .limit(1)
        .single()
      
      taskPosition = (maxPositionTask?.position ?? -1) + 1
    }

    // Create the task
    const { data: task, error: taskError } = await adminSupabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title,
        description,
        status: status || "todo",
        priority: priority || "medium",
        start_date,
        due_date,
        estimated_hours,
        parent_id,
        position: taskPosition,
        created_by: auth.type === "session" ? auth.userId : null,
      })
      .select()
      .single()

    if (taskError) {
      console.error("Error creating task:", taskError)
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
    }

    // Add assignees if provided
    if (assignees && assignees.length > 0) {
      const assigneeRecords = assignees.map((userId: string) => ({
        task_id: task.id,
        user_id: userId,
      }))
      await adminSupabase.from("task_assignees").insert(assigneeRecords)

      // Send push notifications to assignees (excluding self-assignments)
      const currentUserId = auth.type === "session" ? auth.userId : null
      const notifyAssignees = assignees.filter((userId: string) => userId !== currentUserId)

      if (notifyAssignees.length > 0) {
        // Get assigner name for notification
        let assignerName = "Someone"
        if (currentUserId) {
          const { data: assigner } = await adminSupabase
            .from("profiles")
            .select("name")
            .eq("id", currentUserId)
            .single()
          if (assigner?.name) {
            assignerName = assigner.name
          }
        }

        // Get project name for context
        const { data: project } = await adminSupabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single()

        const taskPayload: PushNotificationPayload = {
          title: `${assignerName} assigned you a task`,
          body: `${title}${project?.name ? ` in ${project.name}` : ""}`,
          data: {
            type: "task_assigned",
            taskId: task.id,
            projectId,
          },
        }

        // Send asynchronously to not slow down response
        sendPushToUsers(notifyAssignees, taskPayload).catch((err) =>
          console.error("Error sending task assignment push:", err)
        )
      }
    }

    // Add labels if provided
    if (labels && labels.length > 0) {
      const labelRecords = labels.map((labelId: string) => ({
        task_id: task.id,
        label_id: labelId,
      }))
      await adminSupabase.from("task_labels").insert(labelRecords)
    }

    // Log activity (only for session auth)
    if (auth.type === "session") {
      await adminSupabase
        .from("project_activity")
        .insert({
          project_id: projectId,
          user_id: auth.userId,
          action: "created",
          entity_type: "task",
          entity_id: task.id,
          metadata: { title },
        })
    }

    // Fire webhook for Make.com triggers
    const { data: project } = await adminSupabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single()

    if (project?.workspace_id) {
      console.log("[task.created] Firing webhook for workspace:", project.workspace_id)
      await fireWebhooks("task.created", {
        ...task,
        name: task.title,
        project_id: projectId,
      }, project.workspace_id)
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/projects/[id]/tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

