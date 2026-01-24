import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, ProjectTasksResult } from "../types"

export const projectTasksSchema = z.object({
  action: z.enum(["query", "create", "update", "assign"]).default("query").describe("Action to perform: query tasks, create a new task, update a task, or assign a task"),
  // Query params
  projectId: z.string().optional().describe("Filter by project ID (for query) or associate task with project (required for create)"),
  limit: z.number().optional().default(20).describe("Maximum number of tasks to return (for query)"),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional().describe("Filter by task status (for query)"),
  // Create params
  title: z.string().optional().describe("Task title (required for create)"),
  description: z.string().optional().describe("Task description with acceptance criteria (for create/update)"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium").describe("Task priority (for create/update)"),
  dueDate: z.string().optional().describe("Due date in ISO format (for create/update)"),
  estimatedHours: z.number().optional().describe("Estimated hours to complete (for create/update)"),
  // Update params
  taskId: z.string().optional().describe("Task ID (required for update/assign)"),
  newStatus: z.enum(["todo", "in_progress", "review", "done"]).optional().describe("New status (for update)"),
  // Assign params
  assigneeId: z.string().optional().describe("User ID to assign the task to (for assign)"),
})

export function createProjectTasksTool(context: ToolContext) {
  return tool({
    description: "Manage project tasks. Create tasks for projects, update their status, assign to team members, or query existing tasks.",
    inputSchema: projectTasksSchema,
    execute: async (params: z.infer<typeof projectTasksSchema>): Promise<ProjectTasksResult | { success: boolean; message: string; task?: any }> => {
      const { supabase, userId, workspaceId } = context
      const { action } = params

      if (!workspaceId) {
        throw new Error("Workspace ID is required for project task operations")
      }

      // CREATE: Add a new task to a project
      if (action === "create") {
        const { projectId, title, description, priority, dueDate, estimatedHours } = params

        if (!projectId) {
          throw new Error("Project ID is required to create a task")
        }
        if (!title) {
          throw new Error("Task title is required to create a task")
        }

        // Verify project exists and belongs to workspace
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, name")
          .eq("id", projectId)
          .eq("workspace_id", workspaceId)
          .single()

        if (projectError || !project) {
          throw new Error("Project not found or access denied")
        }

        // Get the next position for this project
        const { count } = await supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("project_id", projectId)

        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            project_id: projectId,
            title: title.trim(),
            description: description?.trim() || null,
            status: "todo",
            priority: priority || "medium",
            due_date: dueDate || null,
            estimated_hours: estimatedHours || null,
            position: (count || 0) + 1,
            created_by: userId,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create task: ${error.message}`)
        }

        return {
          success: true,
          message: `Task "${title}" created in project "${project.name}"`,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            projectName: project.name,
          },
        }
      }

      // UPDATE: Modify an existing task
      if (action === "update") {
        const { taskId, title, description, priority, dueDate, estimatedHours, newStatus } = params

        if (!taskId) {
          throw new Error("Task ID is required to update a task")
        }

        // Build update object
        const updates: Record<string, unknown> = {}
        if (title !== undefined) updates.title = title.trim()
        if (description !== undefined) updates.description = description.trim()
        if (priority !== undefined) updates.priority = priority
        if (dueDate !== undefined) updates.due_date = dueDate
        if (estimatedHours !== undefined) updates.estimated_hours = estimatedHours
        if (newStatus !== undefined) updates.status = newStatus

        const { data: task, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", taskId)
          .select(`
            *,
            project:project_id(id, name, workspace_id)
          `)
          .single()

        if (error) {
          throw new Error(`Failed to update task: ${error.message}`)
        }

        // Verify workspace access
        if (task.project?.workspace_id !== workspaceId) {
          throw new Error("Access denied to this task")
        }

        return {
          success: true,
          message: `Task "${task.title}" updated`,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
        }
      }

      // ASSIGN: Assign a task to a team member
      if (action === "assign") {
        const { taskId, assigneeId } = params

        if (!taskId) {
          throw new Error("Task ID is required to assign a task")
        }
        if (!assigneeId) {
          throw new Error("Assignee ID is required to assign a task")
        }

        // Verify task exists and get details
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .select(`
            id,
            title,
            project:project_id(id, name, workspace_id)
          `)
          .eq("id", taskId)
          .single()

        if (taskError || !task) {
          throw new Error("Task not found")
        }

        // Verify workspace access
        if ((task.project as any)?.workspace_id !== workspaceId) {
          throw new Error("Access denied to this task")
        }

        // Verify assignee is a workspace member
        const { data: member, error: memberError } = await supabase
          .from("workspace_members")
          .select("profile_id, profile:profiles(name)")
          .eq("workspace_id", workspaceId)
          .eq("profile_id", assigneeId)
          .single()

        if (memberError || !member) {
          throw new Error("Assignee is not a member of this workspace")
        }

        // Check if already assigned
        const { data: existingAssignment } = await supabase
          .from("task_assignees")
          .select("id")
          .eq("task_id", taskId)
          .eq("user_id", assigneeId)
          .single()

        if (existingAssignment) {
          return {
            success: true,
            message: `Task is already assigned to this user`,
            task: { id: task.id, title: task.title },
          }
        }

        // Create assignment
        const { error: assignError } = await supabase
          .from("task_assignees")
          .insert({
            task_id: taskId,
            user_id: assigneeId,
          })

        if (assignError) {
          throw new Error(`Failed to assign task: ${assignError.message}`)
        }

        const assigneeName = (member.profile as any)?.name || "team member"
        return {
          success: true,
          message: `Task "${task.title}" assigned to ${assigneeName}`,
          task: {
            id: task.id,
            title: task.title,
            assigneeId,
            assigneeName,
          },
        }
      }

      // QUERY: Get tasks (default)
      const { projectId, limit = 20, status } = params

      let query = supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          estimated_hours,
          actual_hours,
          position,
          created_at,
          project:project_id(id, name, workspace_id),
          task_assignees(
            user:user_id(id, name, avatar_url)
          )
        `)
        .order("position", { ascending: true })
        .limit(limit)

      // Filter by project if specified
      if (projectId) {
        query = query.eq("project_id", projectId)
      }

      // Filter by status if specified
      if (status) {
        query = query.eq("status", status)
      }

      const { data: tasks, error } = await query

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`)
      }

      // Filter to only tasks from this workspace
      const workspaceTasks = (tasks || []).filter(
        (t: any) => t.project?.workspace_id === workspaceId
      )

      // Format tasks for response
      const formattedTasks = workspaceTasks.map((task: any) => {
        const assignees = (task.task_assignees || []).map((a: any) => ({
          id: a.user?.id,
          name: a.user?.name,
          avatarUrl: a.user?.avatar_url,
        }))

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.due_date,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          projectId: task.project?.id,
          projectName: task.project?.name,
          assignees,
          createdAt: task.created_at,
        }
      })

      // Calculate summary by status
      const byStatus: Record<string, number> = {}
      const byPriority: Record<string, number> = {}
      formattedTasks.forEach((t) => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1
      })

      return {
        tasks: formattedTasks,
        summary: {
          count: formattedTasks.length,
          byStatus,
          byPriority,
        },
      }
    },
  })
}
