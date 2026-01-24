import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import type { AgentWithHireStatus } from "@/lib/types/agents"

// GET /api/agents - List agents from ai_agents table with hire status
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
    const category = searchParams.get("category")
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

    // Get hired agents for this workspace (to check hire status)
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
          localAgentId: agent.id as string,
          hiredAt: agent.created_at as string,
        }))

        return NextResponse.json({ agents, total: agents.length })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Combine with hire status
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
