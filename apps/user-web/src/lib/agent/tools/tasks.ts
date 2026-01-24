import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, TasksResult } from "../types"

export const tasksSchema = z.object({
  action: z.enum(["query", "create", "complete"]).default("query").describe("Action to perform: query tasks, create a new task, or mark a task complete"),
  // Query params
  limit: z.number().optional().default(20).describe("Maximum number of tasks to return (for query)"),
  leadId: z.string().optional().describe("Filter by specific lead ID (for query) or associate task with lead (for create)"),
  completed: z.boolean().optional().describe("Filter by completion status (for query)"),
  overdue: z.boolean().optional().describe("Only show overdue tasks (for query)"),
  // Create params
  title: z.string().optional().describe("Task title (required for create)"),
  description: z.string().optional().describe("Task description (for create)"),
  dueDate: z.string().optional().describe("Due date in ISO format (for create)"),
  // Complete params
  taskId: z.string().optional().describe("Task ID to mark as complete (required for complete)"),
})

export function createTasksTool(context: ToolContext) {
  return tool({
    description: "Manage follow-up tasks. Query tasks with filters, create new tasks for leads, or mark tasks as complete.",
    inputSchema: tasksSchema,
    execute: async (params: z.infer<typeof tasksSchema>): Promise<TasksResult | { success: boolean; message: string; task?: any }> => {
      const { supabase, userId } = context
      const { action } = params

      // CREATE: Add a new task
      if (action === "create") {
        const { title, description, dueDate, leadId } = params

        if (!title) {
          throw new Error("Title is required to create a task")
        }

        const { data: task, error } = await supabase
          .from("lead_tasks")
          .insert({
            user_id: userId,
            lead_id: leadId || null,
            title,
            description: description || null,
            due_date: dueDate || null,
            is_completed: false,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create task: ${error.message}`)
        }

        return {
          success: true,
          message: `Task "${title}" created successfully`,
          task,
        }
      }

      // COMPLETE: Mark a task as done
      if (action === "complete") {
        const { taskId } = params

        if (!taskId) {
          throw new Error("Task ID is required to complete a task")
        }

        const { data: task, error } = await supabase
          .from("lead_tasks")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to complete task: ${error.message}`)
        }

        return {
          success: true,
          message: `Task marked as complete`,
          task,
        }
      }

      // QUERY: Get tasks (default)
      const { limit = 20, leadId, completed, overdue } = params

      let query = supabase
        .from("lead_tasks")
        .select(`
          id,
          title,
          description,
          due_date,
          is_completed,
          completed_at,
          created_at,
          lead:leads (
            id,
            name
          )
        `)
        .eq("user_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit)

      if (leadId) {
        query = query.eq("lead_id", leadId)
      }
      if (completed !== undefined) {
        query = query.eq("is_completed", completed)
      }
      if (overdue) {
        const now = new Date().toISOString()
        query = query.lt("due_date", now).eq("is_completed", false)
      }

      const { data: tasks, error } = await query

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`)
      }

      let pendingCount = 0
      let completedCount = 0
      let overdueCount = 0
      const now = new Date()

      const formattedTasks = (tasks || []).map((task: any) => {
        const isCompleted = task.is_completed
        const taskDueDate = task.due_date ? new Date(task.due_date) : null
        const isOverdue = !isCompleted && taskDueDate !== null && taskDueDate < now

        if (isCompleted) {
          completedCount++
        } else {
          pendingCount++
          if (isOverdue) {
            overdueCount++
          }
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.due_date,
          isCompleted,
          isOverdue,
          completedAt: task.completed_at,
          createdAt: task.created_at,
          leadName: task.lead?.name || null,
          leadId: task.lead?.id || null,
        }
      })

      return {
        tasks: formattedTasks,
        summary: {
          count: formattedTasks.length,
          pendingCount,
          completedCount,
          overdueCount,
        },
      }
    },
  })
}
