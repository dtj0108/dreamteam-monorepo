import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, TeamMembersResult } from "../types"

export const teamMembersSchema = z.object({
  action: z.enum(["query", "getWorkload"]).default("query").describe("Action to perform: query team members or get workload details"),
  // Query params
  includeWorkload: z.boolean().optional().default(true).describe("Include current task workload for each member"),
  projectId: z.string().optional().describe("Filter to members of a specific project"),
  excludeAgents: z.boolean().optional().default(true).describe("Exclude AI agent profiles from results (default: true for capacity planning)"),
})

export function createTeamMembersTool(context: ToolContext) {
  return tool({
    description: "Query workspace team members and their current workload. Use this to understand who is available for task assignments and to balance work across the team.",
    inputSchema: teamMembersSchema,
    execute: async (params: z.infer<typeof teamMembersSchema>): Promise<TeamMembersResult> => {
      const { supabase, workspaceId } = context
      const { includeWorkload = true, projectId, excludeAgents = true } = params

      if (!workspaceId) {
        throw new Error("Workspace ID is required for team member operations")
      }

      // Get workspace members
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select(`
          profile_id,
          role,
          display_name,
          status,
          joined_at,
          profile:profiles!inner(id, name, role, avatar_url, email, is_agent)
        `)
        .eq("workspace_id", workspaceId)

      if (error) {
        throw new Error(`Failed to fetch team members: ${error.message}`)
      }

      // Type helper for member data
      type MemberData = {
        profile_id: string
        role: string
        display_name: string | null
        status: string | null
        joined_at: string
        profile: {
          id: string
          name: string | null
          role: string | null
          avatar_url: string | null
          email: string | null
          is_agent: boolean | null
        }
      }

      // If filtering by project, get project members
      let projectMemberIds: string[] | null = null
      if (projectId) {
        const { data: projectMembers } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId)

        projectMemberIds = (projectMembers || []).map((pm: any) => pm.user_id)
      }

      // Process members with optional workload
      type WorkloadLevel = "low" | "medium" | "high"
      type MemberWithWorkload = {
        id: string
        name: string
        email: string | null
        role: string
        jobRole: string | null
        avatarUrl: string | null
        status: string | null
        joinedAt: string
        isAgent: boolean
        workload: {
          totalOpenTasks: number
          inProgressCount: number
          todoCount: number
          urgentCount: number
          level: WorkloadLevel
        } | null
      }

      // Batch fetch ALL task assignments for workspace members in ONE query (fixes N+1)
      const memberIds = (members || []).map((m: any) => m.profile_id)
      const tasksByUser: Map<string, any[]> = new Map()

      if (includeWorkload && memberIds.length > 0) {
        const { data: allAssignments } = await supabase
          .from("task_assignees")
          .select(`
            user_id,
            task:task_id(id, status, priority)
          `)
          .in("user_id", memberIds)

        // Group tasks by user in memory
        for (const assignment of allAssignments || []) {
          const tasks = tasksByUser.get(assignment.user_id) || []
          if (assignment.task) tasks.push(assignment.task)
          tasksByUser.set(assignment.user_id, tasks)
        }
      }

      const membersWithWorkload: MemberWithWorkload[] = []
      for (const rawMember of members || []) {
        // Handle Supabase returning profile as either object or array
        const rawProfile = (rawMember as any).profile
        const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
        const member = {
          ...rawMember,
          profile,
        } as MemberData

        // Skip AI agents when excludeAgents is true (for capacity planning)
        if (excludeAgents && member.profile?.is_agent) {
          continue
        }

        // Skip if filtering by project and member is not in project
        if (projectMemberIds && !projectMemberIds.includes(member.profile_id)) {
          continue
        }

        let workload: MemberWithWorkload["workload"] = null
        if (includeWorkload) {
          // Use pre-fetched tasks from the batch query
          const tasks = tasksByUser.get(member.profile_id) || []
          const inProgressCount = tasks.filter((t: any) => t.status === "in_progress").length
          const todoCount = tasks.filter((t: any) => t.status === "todo").length
          const urgentCount = tasks.filter((t: any) => t.priority === "urgent" || t.priority === "high").length

          const taskCount = tasks.length
          const level: WorkloadLevel = taskCount > 10 ? "high" : taskCount > 5 ? "medium" : "low"

          workload = {
            totalOpenTasks: taskCount,
            inProgressCount,
            todoCount,
            urgentCount,
            level,
          }
        }

        membersWithWorkload.push({
          id: member.profile_id,
          name: member.profile?.name || member.display_name || "Unknown",
          email: member.profile?.email || null,
          role: member.role, // workspace role (owner, admin, member)
          jobRole: member.profile?.role || null, // job title/role
          avatarUrl: member.profile?.avatar_url || null,
          status: member.status,
          joinedAt: member.joined_at,
          isAgent: member.profile?.is_agent || false,
          workload,
        })
      }

      // Sort by workload level (lowest first) for easier assignment decisions
      if (includeWorkload) {
        membersWithWorkload.sort((a, b) => {
          const aCount = a.workload?.totalOpenTasks || 0
          const bCount = b.workload?.totalOpenTasks || 0
          return aCount - bCount
        })
      }

      // Calculate team summary
      const totalMembers = membersWithWorkload.length
      const roleBreakdown: Record<string, number> = {}
      const workloadLevels: Record<string, number> = { low: 0, medium: 0, high: 0 }

      membersWithWorkload.forEach((m) => {
        roleBreakdown[m.role] = (roleBreakdown[m.role] || 0) + 1
        if (m.workload) {
          workloadLevels[m.workload.level] = (workloadLevels[m.workload.level] || 0) + 1
        }
      })

      // Calculate data quality warnings for capacity planning
      const warnings: string[] = []

      if (includeWorkload && totalMembers > 0) {
        // Check for members with no tasks (might indicate stale data)
        const zeroTaskMembers = membersWithWorkload.filter(
          (m) => m.workload?.totalOpenTasks === 0 && !m.isAgent
        )
        if (zeroTaskMembers.length > totalMembers * 0.5) {
          warnings.push(
            `${zeroTaskMembers.length} of ${totalMembers} members have 0 tasks assigned - verify data is current`
          )
        }

        // Check if any agents were filtered out (informational)
        const totalRawMembers = (members || []).length
        const agentsFiltered = totalRawMembers - totalMembers
        if (excludeAgents && agentsFiltered > 0) {
          warnings.push(
            `${agentsFiltered} AI agent profile(s) excluded from capacity analysis`
          )
        }
      }

      return {
        members: membersWithWorkload,
        summary: {
          count: totalMembers,
          byRole: roleBreakdown,
          byWorkloadLevel: includeWorkload ? workloadLevels : undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    },
  })
}
