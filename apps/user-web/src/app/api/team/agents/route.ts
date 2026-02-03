import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/agents - Get all agents for the workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

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

    // Get all active agents in the workspace
    let { data: agents, error } = await supabase
      .from("agents")
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching agents:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Collect all unique profile IDs from reports_to arrays
    const allReportsToIds = new Set<string>()
    agents?.forEach((agent: { reports_to?: string[] | null; [key: string]: unknown }) => {
      if (agent.reports_to && Array.isArray(agent.reports_to)) {
        agent.reports_to.forEach((id: string) => allReportsToIds.add(id))
      }
    })

    // Fetch all profiles at once
    let profilesMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {}
    if (allReportsToIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", Array.from(allReportsToIds))

      profiles?.forEach((p: { id: string; name: string; avatar_url: string | null }) => {
        profilesMap[p.id] = p
      })
    }

    // Attach reports_to_profiles to each agent
    const agentsWithProfiles = agents?.map((agent: { reports_to?: string[] | null; [key: string]: unknown }) => ({
      ...agent,
      reports_to_profiles: (agent.reports_to || [])
        .map((id: string) => profilesMap[id])
        .filter(Boolean),
    }))

    // Fetch unread counts for all agents (messages from agent after last_read_at)
    // This is a single efficient query instead of N+1 queries
    const agentIds = agentsWithProfiles?.map((a: { id: string }) => a.id) || []
    const unreadCountsMap: Record<string, number> = {}

    if (agentIds.length > 0) {
      // Get conversations with last_read_at for this user
      const { data: conversations } = await supabase
        .from("agent_conversations")
        .select("id, agent_id, last_read_at")
        .eq("user_id", session.id)
        .in("agent_id", agentIds)

      if (conversations && conversations.length > 0) {
        // For each conversation, count unread assistant messages
        for (const conv of conversations) {
          let query = supabase
            .from("agent_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("role", "assistant")

          // Only count messages after last_read_at (if set)
          if (conv.last_read_at) {
            query = query.gt("created_at", conv.last_read_at)
          }

          const { count } = await query

          if (count && count > 0) {
            unreadCountsMap[conv.agent_id] = count
          }
        }
      }
    }

    // Merge unread counts into agents
    const agentsWithUnread = agentsWithProfiles?.map((agent: { id: string }) => ({
      ...agent,
      unread_count: unreadCountsMap[agent.id] || 0,
    }))

    return NextResponse.json(agentsWithUnread || [])
  } catch (error) {
    console.error("Error in GET /api/team/agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const {
      workspaceId,
      name,
      description,
      systemPrompt,
      tools = [],
      model = "gpt-4o-mini",
      avatarUrl,
      reportsTo
    } = body

    if (!workspaceId || !name || !systemPrompt) {
      return NextResponse.json(
        { error: "Workspace ID, name, and system prompt are required" },
        { status: 400 }
      )
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

    // Validate tools array
    const validTools = [
      "transactions", "budgets", "accounts", "goals", "webSearch", "dataExport",
      // CRM Tools
      "leads", "opportunities", "tasks",
      // Knowledge Tools
      "knowledge",
      // Project Management Tools
      "projects", "projectTasks", "teamMembers",
    ]
    const filteredTools = tools.filter((t: string) => validTools.includes(t))

    // Create the agent (reports_to is now an array)
    const reportsToArray = Array.isArray(reportsTo) ? reportsTo : [session.id]

    const { data: agent, error: createError } = await supabase
      .from("agents")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        system_prompt: systemPrompt.trim(),
        tools: filteredTools,
        model,
        avatar_url: avatarUrl || null,
        created_by: session.id,
        reports_to: reportsToArray,
      })
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .single()

    if (createError) {
      console.error("Error creating agent:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Fetch profiles for reports_to array
    let reportsToProfiles: { id: string; name: string; avatar_url: string | null }[] = []
    if (agent.reports_to && agent.reports_to.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", agent.reports_to)

      reportsToProfiles = profiles || []
    }

    return NextResponse.json({
      ...agent,
      reports_to_profiles: reportsToProfiles,
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
