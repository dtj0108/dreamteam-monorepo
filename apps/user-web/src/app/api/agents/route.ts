import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getWorkspaceDeployment } from "@dreamteam/database"
import { getSession } from "@dreamteam/auth/session"
import type { AgentWithHireStatus, AgentDepartment } from "@/lib/types/agents"

// Type for deployed agent from active_config
interface DeployedAgent {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  model: string
  provider?: string
  is_enabled: boolean
  tools: unknown[]
  skills: unknown[]
  mind: unknown[]
  rules: unknown[]
  department_id?: string | null
}

interface DeployedTeamConfig {
  team: {
    id: string
    name: string
    slug: string
    head_agent_id: string | null
  }
  agents: DeployedAgent[]
  delegations: unknown[]
  team_mind: unknown[]
}

interface AgentOrganization {
  department_assignments: Record<string, string | null>
  position_order: string[]
}

// GET /api/agents - List agents from deployed team config
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const search = searchParams.get("search")
    const departmentId = searchParams.get("department_id")
    const hiredOnly = searchParams.get("hired_only") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get deployed team configuration for this workspace
    const deployment = await getWorkspaceDeployment(workspaceId)

    if (deployment) {
      // NEW: Read agents from deployed team config
      const activeConfig = deployment.active_config as DeployedTeamConfig
      const deployedAt = deployment.deployed_at
      const customizations = (deployment.customizations as Record<string, unknown>) || {}
      const agentOrganization = customizations.agent_organization as AgentOrganization | undefined

      // Fetch all departments for lookup
      const { data: departmentsData } = await supabase
        .from("agent_departments")
        .select("id, name, description, icon")

      const departmentsMap = new Map<string, AgentDepartment>(
        (departmentsData || []).map((d: AgentDepartment) => [d.id, d])
      )

      let agents: AgentWithHireStatus[] = (activeConfig?.agents || []).map((agent: DeployedAgent) => {
        // Get department ID from organization customizations, fallback to agent's default
        const departmentId = agentOrganization?.department_assignments?.[agent.id] ?? agent.department_id ?? null
        const department = departmentId ? departmentsMap.get(departmentId) : null

        return {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          description: agent.description,
          department_id: departmentId,
          department: department || null,
          avatar_url: agent.avatar_url,
          model: (agent.model || "sonnet") as "sonnet" | "opus" | "haiku",
          system_prompt: agent.system_prompt,
          permission_mode: "default" as const,
          max_turns: 10,
          is_enabled: true, // Template level enablement
          is_head: activeConfig.team.head_agent_id === agent.id,
          config: {},
          current_version: 1,
          published_version: 1,
          created_at: deployedAt,
          updated_at: deployedAt,
          // New fields for auto-hire model
          isHired: agent.is_enabled, // Hired = in deployed team AND enabled
          isInPlan: true, // All agents from deployed team are part of the plan
          isEnabled: agent.is_enabled, // Agent's enabled state in customizations
          localAgentId: agent.id, // Use the agent ID directly
          hiredAt: agent.is_enabled ? deployedAt : null,
        }
      })

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        agents = agents.filter(a =>
          a.name.toLowerCase().includes(searchLower) ||
          (a.description?.toLowerCase().includes(searchLower) ?? false)
        )
      }

      // Apply department filter (if we had department info)
      if (departmentId) {
        agents = agents.filter(a => a.department_id === departmentId)
      }

      // Filter to hired only if requested (enabled agents from deployed team)
      if (hiredOnly) {
        agents = agents.filter(a => a.isHired)
      }

      // Sort by position order if available
      if (agentOrganization?.position_order && agentOrganization.position_order.length > 0) {
        const positionMap = new Map(
          agentOrganization.position_order.map((id, index) => [id, index])
        )
        agents.sort((a, b) => {
          const posA = positionMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
          const posB = positionMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
          return posA - posB
        })
      }

      // Apply pagination
      const total = agents.length
      agents = agents.slice(offset, offset + limit)

      // Get all departments for the response
      const departments = Array.from(departmentsMap.values())

      return NextResponse.json({
        agents,
        total,
        departments,
        organization: agentOrganization || { department_assignments: {}, position_order: [] }
      })
    }

    // FALLBACK: If no deployment, check for legacy hired agents in agents table
    const { data: hiredAgents } = await supabase
      .from("agents")
      .select("id, ai_agent_id, hired_at")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .not("ai_agent_id", "is", null)

    const hiredMap = new Map<string, { localAgentId: string; hiredAt: string | null }>(
      (hiredAgents || []).map((a: { id: string; ai_agent_id: string; hired_at: string | null }) => [a.ai_agent_id, { localAgentId: a.id, hiredAt: a.hired_at }])
    )

    // Build query for ai_agents table
    let query = supabase
      .from("ai_agents")
      .select(`
        id,
        name,
        slug,
        description,
        department_id,
        avatar_url,
        model,
        system_prompt,
        permission_mode,
        max_turns,
        is_enabled,
        is_head,
        config,
        current_version,
        published_version,
        created_at,
        updated_at
      `, { count: "exact" })
      .eq("is_enabled", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    if (departmentId) {
      query = query.eq("department_id", departmentId)
    }

    const { data: aiAgents, error, count } = await query

    if (error) {
      console.error("Error fetching ai_agents:", error)
      // If ai_agents table doesn't exist, fall back to local agents
      if (error.code === "42P01") {
        // Table doesn't exist - return local agents only
        const { data: localAgents } = await supabase
          .from("agents")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        const agents: AgentWithHireStatus[] = (localAgents || []).map((agent: Record<string, unknown>) => ({
          id: agent.id as string,
          name: agent.name as string,
          slug: null,
          description: agent.description as string | null,
          department_id: null,
          avatar_url: agent.avatar_url as string | null,
          model: (agent.model as "sonnet" | "opus" | "haiku") || "sonnet",
          system_prompt: agent.system_prompt as string,
          permission_mode: "default" as const,
          max_turns: 10,
          is_enabled: agent.is_active as boolean,
          is_head: false,
          config: {},
          current_version: 1,
          published_version: 1,
          created_at: agent.created_at as string,
          updated_at: agent.updated_at as string,
          isHired: true,
          isInPlan: false, // Legacy agents not from plan
          isEnabled: true,
          localAgentId: agent.id as string,
          hiredAt: agent.created_at as string,
        }))

        return NextResponse.json({ agents, total: agents.length })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Combine with hire status (legacy path)
    let agents: AgentWithHireStatus[] = (aiAgents || []).map((agent: Record<string, unknown>) => {
      const hireInfo = hiredMap.get(agent.id as string)
      return {
        id: agent.id as string,
        name: agent.name as string,
        slug: agent.slug as string | null,
        description: agent.description as string | null,
        department_id: agent.department_id as string | null,
        avatar_url: agent.avatar_url as string | null,
        model: agent.model as "sonnet" | "opus" | "haiku",
        system_prompt: agent.system_prompt as string,
        permission_mode: (agent.permission_mode as "default" | "acceptEdits" | "bypassPermissions") || "default",
        max_turns: (agent.max_turns as number) || 10,
        is_enabled: agent.is_enabled as boolean,
        is_head: agent.is_head as boolean,
        config: (agent.config as Record<string, unknown>) || {},
        current_version: (agent.current_version as number) || 1,
        published_version: agent.published_version as number | null,
        created_at: agent.created_at as string,
        updated_at: agent.updated_at as string,
        isHired: !!hireInfo,
        isInPlan: false, // No deployment = not from plan
        isEnabled: !!hireInfo,
        localAgentId: hireInfo?.localAgentId || null,
        hiredAt: hireInfo?.hiredAt || null,
      }
    })

    // Filter to hired only if requested
    if (hiredOnly) {
      agents = agents.filter(a => a.isHired)
    }

    return NextResponse.json({ agents, total: count || agents.length })
  } catch (error) {
    console.error("Error in GET /api/agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
