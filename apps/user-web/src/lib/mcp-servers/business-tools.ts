import { z } from "zod"
import type { MCPToolContext, MCPToolResponse, ResponseFormat } from "./types"
import { formatActionableError, formatCurrency, truncateText } from "./types"

// ============================================================================
// MANAGE CRM TOOL (Consolidated: leads, opportunities, tasks)
// ============================================================================

const crmSchema = z.object({
  entity: z.enum(["leads", "opportunities", "tasks"]).describe("Which CRM entity to work with"),
  action: z.enum(["query", "create", "update"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),

  // Common query params
  limit: z.number().optional().default(20),
  search: z.string().optional(),

  // Leads params
  leadStatus: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
  industry: z.string().optional(),

  // Opportunities params
  stage: z.enum(["prospect", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
  leadId: z.string().optional(),
  minValue: z.number().optional(),

  // Tasks params
  isCompleted: z.boolean().optional(),
  overdueOnly: z.boolean().optional(),

  // Create/Update params
  id: z.string().optional().describe("ID of entity to update"),
  name: z.string().optional().describe("Name/title for leads, opportunities, or tasks"),
  website: z.string().optional(),
  notes: z.string().optional(),
  value: z.number().optional().describe("Deal value for opportunities"),
  probability: z.number().optional().describe("Win probability 0-100"),
  expectedCloseDate: z.string().optional(),
  dueDate: z.string().optional(),
})

type CRMInput = z.infer<typeof crmSchema>

async function executeCRM(input: CRMInput, context: MCPToolContext): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { entity, action, responseFormat } = input

  try {
    // ===== LEADS =====
    if (entity === "leads") {
      if (action === "create") {
        const { name, website, industry, notes } = input
        if (!name) return { success: false, error: "Lead name is required." }

        const { data, error } = await supabase
          .from("leads")
          .insert({ user_id: userId, name, website, industry, notes, status: "new" })
          .select()
          .single()

        if (error) throw new Error(error.message)
        return { success: true, data: { message: `Lead "${name}" created.`, id: data.id } }
      }

      if (action === "update") {
        const { id, leadStatus, notes } = input
        if (!id) return { success: false, error: "Lead ID is required. List leads first." }

        const updates: Record<string, unknown> = {}
        if (leadStatus) updates.status = leadStatus
        if (notes) updates.notes = notes

        const { error } = await supabase.from("leads").update(updates).eq("id", id).eq("user_id", userId)
        if (error) throw new Error(error.message)

        return { success: true, data: { message: `Lead updated to status: ${leadStatus || "unchanged"}` } }
      }

      // Query leads
      const { limit = 20, search, leadStatus, industry } = input
      let query = supabase
        .from("leads")
        .select("id, name, website, industry, status, notes, created_at, contacts(first_name, last_name, email)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (leadStatus) query = query.eq("status", leadStatus)
      if (industry) query = query.ilike("industry", `%${industry}%`)
      if (search) query = query.or(`name.ilike.%${search}%,website.ilike.%${search}%`)

      const { data: leads, error } = await query
      if (error) throw new Error(error.message)

      const statusCounts: Record<string, number> = {}
      const formatted = (leads || []).map((lead: any) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
        const contact = lead.contacts?.[0]
        return {
          id: lead.id,
          name: lead.name,
          website: lead.website,
          industry: lead.industry,
          status: lead.status,
          contact: contact ? `${contact.first_name} ${contact.last_name || ""} <${contact.email || "no email"}>` : null,
        }
      })

      if (responseFormat === "concise") {
        const lines = formatted.slice(0, 5).map((l) => `${l.name} (${l.status}) - ${l.industry || "N/A"}`)
        const statusSummary = Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")
        return { success: true, data: { summary: `${formatted.length} leads | ${statusSummary}`, leads: lines.join("\n") } }
      }

      return { success: true, data: { leads: formatted, summary: { count: formatted.length, byStatus: statusCounts } } }
    }

    // ===== OPPORTUNITIES =====
    if (entity === "opportunities") {
      if (action === "create") {
        const { name, value, leadId, probability, expectedCloseDate, notes } = input
        if (!name) return { success: false, error: "Opportunity name is required." }
        if (value === undefined) return { success: false, error: "Deal value is required." }

        const { data, error } = await supabase
          .from("lead_opportunities")
          .insert({
            user_id: userId,
            lead_id: leadId || null,
            name,
            value,
            stage: "prospect",
            probability: probability || 20,
            expected_close_date: expectedCloseDate || null,
            notes,
          })
          .select()
          .single()

        if (error) throw new Error(error.message)
        return { success: true, data: { message: `Opportunity "${name}" created with value ${formatCurrency(value)}`, id: data.id } }
      }

      if (action === "update") {
        const { id, stage, probability, notes } = input
        if (!id) return { success: false, error: "Opportunity ID is required." }

        const updates: Record<string, unknown> = {}
        if (stage) updates.stage = stage
        if (probability !== undefined) updates.probability = probability
        if (notes) updates.notes = notes

        const { error } = await supabase.from("lead_opportunities").update(updates).eq("id", id).eq("user_id", userId)
        if (error) throw new Error(error.message)

        return { success: true, data: { message: `Opportunity updated${stage ? ` to stage: ${stage}` : ""}` } }
      }

      // Query opportunities
      const { limit = 20, stage, leadId, minValue } = input
      let query = supabase
        .from("lead_opportunities")
        .select("id, name, value, stage, probability, expected_close_date, lead:leads(name)")
        .eq("user_id", userId)
        .order("value", { ascending: false })
        .limit(limit)

      if (stage) query = query.eq("stage", stage)
      if (leadId) query = query.eq("lead_id", leadId)
      if (minValue) query = query.gte("value", minValue)

      const { data: opps, error } = await query
      if (error) throw new Error(error.message)

      let totalValue = 0
      let weightedValue = 0
      const stageCounts: Record<string, number> = {}

      const formatted = (opps || []).map((opp: any) => {
        totalValue += opp.value || 0
        weightedValue += (opp.value || 0) * ((opp.probability || 0) / 100)
        stageCounts[opp.stage] = (stageCounts[opp.stage] || 0) + 1

        return {
          id: opp.id,
          name: opp.name,
          value: opp.value,
          stage: opp.stage,
          probability: opp.probability,
          expectedClose: opp.expected_close_date,
          lead: opp.lead?.name || null,
        }
      })

      if (responseFormat === "concise") {
        const lines = formatted.slice(0, 5).map((o) => `${o.name}: ${formatCurrency(o.value)} (${o.stage}, ${o.probability}%)`)
        const summary = `${formatted.length} opportunities | Total: ${formatCurrency(totalValue)} | Weighted: ${formatCurrency(weightedValue)}`
        return { success: true, data: { summary, opportunities: lines.join("\n") } }
      }

      return { success: true, data: { opportunities: formatted, summary: { count: formatted.length, totalValue, weightedValue, byStage: stageCounts } } }
    }

    // ===== CRM TASKS =====
    if (entity === "tasks") {
      if (action === "create") {
        const { name, notes, dueDate, leadId } = input
        if (!name) return { success: false, error: "Task title is required." }

        const { data, error } = await supabase
          .from("lead_tasks")
          .insert({
            user_id: userId,
            lead_id: leadId || null,
            title: name,
            description: notes || null,
            due_date: dueDate || null,
            is_completed: false,
          })
          .select()
          .single()

        if (error) throw new Error(error.message)
        return { success: true, data: { message: `Task "${name}" created${dueDate ? ` due ${dueDate}` : ""}`, id: data.id } }
      }

      if (action === "update") {
        const { id, isCompleted, notes, dueDate } = input
        if (!id) return { success: false, error: "Task ID is required." }

        const updates: Record<string, unknown> = {}
        if (isCompleted !== undefined) {
          updates.is_completed = isCompleted
          if (isCompleted) updates.completed_at = new Date().toISOString()
        }
        if (notes) updates.description = notes
        if (dueDate) updates.due_date = dueDate

        const { error } = await supabase.from("lead_tasks").update(updates).eq("id", id).eq("user_id", userId)
        if (error) throw new Error(error.message)

        return { success: true, data: { message: isCompleted ? "Task marked complete" : "Task updated" } }
      }

      // Query tasks
      const { limit = 20, isCompleted, overdueOnly, leadId } = input
      let query = supabase
        .from("lead_tasks")
        .select("id, title, description, due_date, is_completed, completed_at, lead:leads(name)")
        .eq("user_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit)

      if (isCompleted !== undefined) query = query.eq("is_completed", isCompleted)
      if (leadId) query = query.eq("lead_id", leadId)

      const { data: tasks, error } = await query
      if (error) throw new Error(error.message)

      const now = new Date()
      let overdueCount = 0
      let pendingCount = 0

      const formatted = (tasks || [])
        .filter((t: any) => {
          if (overdueOnly && t.is_completed) return false
          if (overdueOnly && (!t.due_date || new Date(t.due_date) >= now)) return false
          return true
        })
        .map((task: any) => {
          const isOverdue = !task.is_completed && task.due_date && new Date(task.due_date) < now
          if (isOverdue) overdueCount++
          if (!task.is_completed) pendingCount++

          return {
            id: task.id,
            title: task.title,
            dueDate: task.due_date,
            isCompleted: task.is_completed,
            isOverdue,
            lead: task.lead?.name || null,
          }
        })

      if (responseFormat === "concise") {
        const lines = formatted.slice(0, 5).map((t) => `${t.isCompleted ? "✓" : t.isOverdue ? "⚠️" : "○"} ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`)
        const summary = `${formatted.length} tasks | ${pendingCount} pending | ${overdueCount} overdue`
        return { success: true, data: { summary, tasks: lines.join("\n") } }
      }

      return { success: true, data: { tasks: formatted, summary: { count: formatted.length, pendingCount, overdueCount } } }
    }

    return { success: false, error: "Invalid entity. Use 'leads', 'opportunities', or 'tasks'." }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// MANAGE PROJECTS TOOL (Consolidated: projects, tasks, team)
// ============================================================================

const projectsSchema = z.object({
  entity: z.enum(["projects", "tasks", "team"]).describe("Which project entity to work with"),
  action: z.enum(["query", "create", "update", "assign"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),

  // Common params
  projectId: z.string().optional().describe("Project ID (required for tasks, optional for filtering)"),
  limit: z.number().optional().default(20),

  // Project params
  projectStatus: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),

  // Task params
  taskStatus: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  taskPriority: z.enum(["low", "medium", "high", "urgent"]).optional(),

  // Team params
  includeWorkload: z.boolean().optional().default(false),

  // Create/Update params
  id: z.string().optional().describe("ID of entity to update"),
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  assigneeId: z.string().optional(),
})

type ProjectsInput = z.infer<typeof projectsSchema>

async function executeProjects(input: ProjectsInput, context: MCPToolContext): Promise<MCPToolResponse> {
  const { supabase, userId, workspaceId } = context
  const { entity, action, responseFormat } = input

  if (!workspaceId) {
    return { success: false, error: "Workspace context is required for project operations." }
  }

  try {
    // ===== PROJECTS =====
    if (entity === "projects") {
      if (action === "create") {
        const { name, description, priority, startDate, targetEndDate } = input
        if (!name) return { success: false, error: "Project name is required." }

        const { data, error } = await supabase
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

        if (error) throw new Error(error.message)

        // Add creator as owner
        await supabase.from("project_members").insert({ project_id: data.id, user_id: userId, role: "owner" })

        return { success: true, data: { message: `Project "${name}" created.`, id: data.id } }
      }

      if (action === "update") {
        const { id, name, description, projectStatus, priority, targetEndDate } = input
        if (!id) return { success: false, error: "Project ID is required." }

        const updates: Record<string, unknown> = {}
        if (name) updates.name = name.trim()
        if (description) updates.description = description.trim()
        if (projectStatus) updates.status = projectStatus
        if (priority) updates.priority = priority
        if (targetEndDate) updates.target_end_date = targetEndDate

        const { error } = await supabase.from("projects").update(updates).eq("id", id).eq("workspace_id", workspaceId)
        if (error) throw new Error(error.message)

        return { success: true, data: { message: "Project updated." } }
      }

      // Query projects
      const { limit = 20, projectStatus } = input
      let query = supabase
        .from("projects")
        .select("id, name, description, status, priority, start_date, target_end_date, owner:owner_id(name), tasks(id, status)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (projectStatus) query = query.eq("status", projectStatus)

      const { data: projects, error } = await query
      if (error) throw new Error(error.message)

      const statusCounts: Record<string, number> = {}
      const formatted = (projects || []).map((p: any) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
        const totalTasks = p.tasks?.length || 0
        const completedTasks = (p.tasks || []).filter((t: any) => t.status === "done").length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          priority: p.priority,
          progress: `${progress}%`,
          totalTasks,
          completedTasks,
          owner: p.owner?.name || null,
        }
      })

      if (responseFormat === "concise") {
        const lines = formatted.slice(0, 5).map((p) => `${p.name} (${p.status}) - ${p.progress} complete`)
        const summary = `${formatted.length} projects | ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}`
        return { success: true, data: { summary, projects: lines.join("\n") } }
      }

      return { success: true, data: { projects: formatted, summary: { count: formatted.length, byStatus: statusCounts } } }
    }

    // ===== PROJECT TASKS =====
    if (entity === "tasks") {
      if (action === "create") {
        const { projectId, title, description, taskPriority, dueDate, estimatedHours } = input
        if (!projectId) return { success: false, error: "Project ID is required. List projects first." }
        if (!title) return { success: false, error: "Task title is required." }

        // Verify project
        const { data: project } = await supabase
          .from("projects")
          .select("id, name")
          .eq("id", projectId)
          .eq("workspace_id", workspaceId)
          .single()

        if (!project) return { success: false, error: "Project not found." }

        const { count } = await supabase.from("tasks").select("id", { count: "exact" }).eq("project_id", projectId)

        const { data, error } = await supabase
          .from("tasks")
          .insert({
            project_id: projectId,
            title: title.trim(),
            description: description?.trim() || null,
            status: "todo",
            priority: taskPriority || "medium",
            due_date: dueDate || null,
            estimated_hours: estimatedHours || null,
            position: (count || 0) + 1,
            created_by: userId,
          })
          .select()
          .single()

        if (error) throw new Error(error.message)
        return { success: true, data: { message: `Task "${title}" created in "${project.name}"`, id: data.id } }
      }

      if (action === "update") {
        const { id, title, description, taskStatus, taskPriority, dueDate, estimatedHours } = input
        if (!id) return { success: false, error: "Task ID is required." }

        const updates: Record<string, unknown> = {}
        if (title) updates.title = title.trim()
        if (description) updates.description = description.trim()
        if (taskStatus) updates.status = taskStatus
        if (taskPriority) updates.priority = taskPriority
        if (dueDate) updates.due_date = dueDate
        if (estimatedHours) updates.estimated_hours = estimatedHours

        const { error } = await supabase.from("tasks").update(updates).eq("id", id)
        if (error) throw new Error(error.message)

        return { success: true, data: { message: taskStatus ? `Task status: ${taskStatus}` : "Task updated." } }
      }

      if (action === "assign") {
        const { id, assigneeId } = input
        if (!id) return { success: false, error: "Task ID is required." }
        if (!assigneeId) return { success: false, error: "Assignee ID is required. List team first." }

        // Check if already assigned
        const { data: existing } = await supabase
          .from("task_assignees")
          .select("id")
          .eq("task_id", id)
          .eq("user_id", assigneeId)
          .single()

        if (existing) return { success: true, data: { message: "Already assigned." } }

        const { error } = await supabase.from("task_assignees").insert({ task_id: id, user_id: assigneeId })
        if (error) throw new Error(error.message)

        return { success: true, data: { message: "Task assigned." } }
      }

      // Query tasks
      const { projectId, limit = 20, taskStatus, taskPriority } = input
      let query = supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, estimated_hours, project:project_id(id, name, workspace_id), task_assignees(user:user_id(name))")
        .order("position", { ascending: true })
        .limit(limit)

      if (projectId) query = query.eq("project_id", projectId)
      if (taskStatus) query = query.eq("status", taskStatus)
      if (taskPriority) query = query.eq("priority", taskPriority)

      const { data: tasks, error } = await query
      if (error) throw new Error(error.message)

      // Filter by workspace
      const workspaceTasks = (tasks || []).filter((t: any) => t.project?.workspace_id === workspaceId)

      const statusCounts: Record<string, number> = {}
      const priorityCounts: Record<string, number> = {}
      const formatted = workspaceTasks.map((t: any) => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1

        return {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date,
          project: t.project?.name || null,
          assignees: (t.task_assignees || []).map((a: any) => a.user?.name).filter(Boolean).join(", ") || null,
        }
      })

      if (responseFormat === "concise") {
        const lines = formatted.slice(0, 5).map((t) => `[${t.status}] ${t.title} (${t.priority})${t.assignees ? ` → ${t.assignees}` : ""}`)
        const summary = `${formatted.length} tasks | ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}`
        return { success: true, data: { summary, tasks: lines.join("\n") } }
      }

      return { success: true, data: { tasks: formatted, summary: { count: formatted.length, byStatus: statusCounts, byPriority: priorityCounts } } }
    }

    // ===== TEAM MEMBERS =====
    if (entity === "team") {
      const { includeWorkload = false, limit = 50 } = input

      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("role, joined_at, profile:profiles(id, name, email, avatar_url)")
        .eq("workspace_id", workspaceId)
        .limit(limit)

      if (error) throw new Error(error.message)

      const formatted = await Promise.all(
        (members || []).map(async (m: any) => {
          const result: any = {
            id: m.profile?.id,
            name: m.profile?.name,
            email: m.profile?.email,
            role: m.role,
          }

          if (includeWorkload && m.profile?.id) {
            const { count: openTasks } = await supabase
              .from("task_assignees")
              .select("task:task_id(status)", { count: "exact" })
              .eq("user_id", m.profile.id)
              .neq("task.status", "done")

            result.openTasks = openTasks || 0
            result.workload = (openTasks || 0) > 10 ? "high" : (openTasks || 0) > 5 ? "medium" : "low"
          }

          return result
        })
      )

      if (responseFormat === "concise") {
        const lines = formatted.map((m) => `${m.name} (${m.role})${m.openTasks !== undefined ? ` - ${m.openTasks} tasks` : ""}`)
        const summary = `${formatted.length} team members`
        return { success: true, data: { summary, team: lines.join("\n") } }
      }

      return { success: true, data: { team: formatted, summary: { count: formatted.length } } }
    }

    return { success: false, error: "Invalid entity. Use 'projects', 'tasks', or 'team'." }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// TOOL DEFINITIONS EXPORT
// ============================================================================

export const businessToolDefinitions = {
  manageCRM: {
    name: "manageCRM",
    description: "Unified CRM tool for leads, opportunities, and follow-up tasks. Specify entity ('leads', 'opportunities', or 'tasks') and action ('query', 'create', 'update').",
    schema: crmSchema,
    execute: executeCRM,
  },
  manageProjects: {
    name: "manageProjects",
    description: "Unified project management tool for projects, tasks, and team members. Specify entity ('projects', 'tasks', or 'team') and action ('query', 'create', 'update', 'assign').",
    schema: projectsSchema,
    execute: executeProjects,
  },
}

export type BusinessToolName = keyof typeof businessToolDefinitions
