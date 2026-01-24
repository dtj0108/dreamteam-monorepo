import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, ProjectsResult } from "../types"

export const projectsSchema = z.object({
  action: z.enum(["query", "create", "update"]).default("query").describe("Action to perform: query projects, create a new project, or update an existing project"),
  // Query params
  limit: z.number().optional().default(10).describe("Maximum number of projects to return (for query)"),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional().describe("Filter by project status (for query)"),
  // Create params
  name: z.string().optional().describe("Project name (required for create)"),
  description: z.string().optional().describe("Project description (for create/update)"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium").describe("Project priority (for create/update)"),
  startDate: z.string().optional().describe("Start date in ISO format (for create/update)"),
  targetEndDate: z.string().optional().describe("Target end date in ISO format (for create/update)"),
  // Update params
  projectId: z.string().optional().describe("Project ID (required for update)"),
  newStatus: z.enum(["active", "on_hold", "completed", "archived"]).optional().describe("New status (for update)"),
})

export function createProjectsTool(context: ToolContext) {
  return tool({
    description: "Manage projects. Query existing projects, create new projects, or update project details and status.",
    inputSchema: projectsSchema,
    execute: async (params: z.infer<typeof projectsSchema>): Promise<ProjectsResult | { success: boolean; message: string; project?: any }> => {
      const { supabase, userId, workspaceId } = context
      const { action } = params

      if (!workspaceId) {
        throw new Error("Workspace ID is required for project operations")
      }

      // CREATE: Add a new project
      if (action === "create") {
        const { name, description, priority, startDate, targetEndDate } = params

        if (!name) {
          throw new Error("Project name is required to create a project")
        }

        // Create the project
        const { data: project, error } = await supabase
          .from("projects")
          .insert({
            workspace_id: workspaceId,
            name: name.trim(),
            description: description?.trim() || null,
            status: "active",
            priority: priority || "medium",
            start_date: startDate || null,
            target_end_date: targetEndDate || null,
            owner_id: userId,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create project: ${error.message}`)
        }

        // Add creator as project owner
        await supabase.from("project_members").insert({
          project_id: project.id,
          user_id: userId,
          role: "owner",
        })

        // Log activity
        await supabase.from("project_activity").insert({
          project_id: project.id,
          user_id: userId,
          action: "created",
          entity_type: "project",
          entity_id: project.id,
        })

        return {
          success: true,
          message: `Project "${name}" created successfully`,
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            priority: project.priority,
          },
        }
      }

      // UPDATE: Modify an existing project
      if (action === "update") {
        const { projectId, name, description, priority, startDate, targetEndDate, newStatus } = params

        if (!projectId) {
          throw new Error("Project ID is required to update a project")
        }

        // Build update object
        const updates: Record<string, unknown> = {}
        if (name !== undefined) updates.name = name.trim()
        if (description !== undefined) updates.description = description.trim()
        if (priority !== undefined) updates.priority = priority
        if (startDate !== undefined) updates.start_date = startDate
        if (targetEndDate !== undefined) updates.target_end_date = targetEndDate
        if (newStatus !== undefined) updates.status = newStatus

        const { data: project, error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", projectId)
          .eq("workspace_id", workspaceId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update project: ${error.message}`)
        }

        // Log activity
        await supabase.from("project_activity").insert({
          project_id: project.id,
          user_id: userId,
          action: "updated",
          entity_type: "project",
          entity_id: project.id,
          metadata: { changes: Object.keys(updates) },
        })

        return {
          success: true,
          message: `Project "${project.name}" updated successfully`,
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            priority: project.priority,
          },
        }
      }

      // QUERY: Get projects (default)
      const { limit = 10, status } = params

      let query = supabase
        .from("projects")
        .select(`
          id,
          name,
          description,
          status,
          priority,
          start_date,
          target_end_date,
          created_at,
          updated_at,
          owner:owner_id(id, name, avatar_url),
          tasks(id, status)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq("status", status)
      }

      const { data: projects, error } = await query

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`)
      }

      // Calculate progress for each project
      const formattedProjects = (projects || []).map((project: any) => {
        const tasks = project.tasks || []
        const totalTasks = tasks.length
        const completedTasks = tasks.filter((t: any) => t.status === "done").length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.start_date,
          targetEndDate: project.target_end_date,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          ownerName: project.owner?.name || null,
          totalTasks,
          completedTasks,
          progress,
        }
      })

      // Calculate summary by status
      const byStatus: Record<string, number> = {}
      formattedProjects.forEach((p) => {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1
      })

      return {
        projects: formattedProjects,
        summary: {
          count: formattedProjects.length,
          byStatus,
        },
      }
    },
  })
}
