import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { getNextRunTime, isValidCron } from "@/lib/cron-utils"

// GET /api/agents/schedules - List all schedules for hired agents
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

    // Get hired agents for this workspace
    const { data: hiredAgents } = await supabase
      .from("agents")
      .select("ai_agent_id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .not("ai_agent_id", "is", null)

    const hiredAgentIds = (hiredAgents || []).map((a: { ai_agent_id: string }) => a.ai_agent_id)

    if (hiredAgentIds.length === 0) {
      return NextResponse.json({ schedules: [], total: 0 })
    }

    // Get filter params
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const agentId = searchParams.get("agent_id")
    const approval = searchParams.get("approval")
    const nextRunBefore = searchParams.get("next_run_before")

    // Build query with filters
    let query = supabase
      .from("agent_schedules")
      .select(`
        *,
        agent:ai_agents(id, name, avatar_url)
      `, { count: "exact" })
      .in("agent_id", hiredAgentIds)

    // Apply filters
    if (search) {
      query = query.ilike("name", `%${search}%`)
    }
    if (status === "enabled") {
      query = query.eq("is_enabled", true)
    } else if (status === "paused") {
      query = query.eq("is_enabled", false)
    }
    if (agentId) {
      query = query.eq("agent_id", agentId)
    }
    if (approval === "required") {
      query = query.eq("requires_approval", true)
    } else if (approval === "not_required") {
      query = query.eq("requires_approval", false)
    }
    if (nextRunBefore) {
      query = query.lte("next_run_at", nextRunBefore)
    }

    const { data: schedules, error, count } = await query
      .order("created_at", { ascending: false })

    if (error) {
      // If table doesn't exist, return empty
      if (error.code === "42P01") {
        return NextResponse.json({ schedules: [], total: 0 })
      }
      console.error("Error fetching schedules:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedules: schedules || [], total: count || 0 })
  } catch (error) {
    console.error("Error in GET /api/agents/schedules:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/agents/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const {
      agent_id,
      name,
      description,
      cron_expression,
      timezone = "UTC",
      task_prompt,
      requires_approval = true,
      workspaceId,
    } = body

    // Validate required fields
    if (!agent_id || !name || !cron_expression || !task_prompt || !workspaceId) {
      return NextResponse.json(
        { error: "Missing required fields: agent_id, name, cron_expression, task_prompt, workspaceId" },
        { status: 400 }
      )
    }

    // Validate cron expression
    if (!isValidCron(cron_expression)) {
      return NextResponse.json(
        { error: "Invalid cron expression" },
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

    // Verify the agent is hired by this workspace
    const { data: hiredAgent, error: agentError } = await supabase
      .from("agents")
      .select("id, ai_agent_id")
      .eq("workspace_id", workspaceId)
      .eq("ai_agent_id", agent_id)
      .eq("is_active", true)
      .single()

    if (agentError || !hiredAgent) {
      return NextResponse.json(
        { error: "Agent not hired in this workspace" },
        { status: 400 }
      )
    }

    // Calculate next run time
    const nextRunAt = getNextRunTime(cron_expression, timezone)

    // Create the schedule
    const { data: schedule, error: insertError } = await supabase
      .from("agent_schedules")
      .insert({
        agent_id,
        name: name.trim(),
        description: description?.trim() || null,
        cron_expression,
        timezone,
        task_prompt: task_prompt.trim(),
        requires_approval,
        is_enabled: true,
        next_run_at: nextRunAt.toISOString(),
        created_by: session.id,
        output_config: {},
      })
      .select(`
        *,
        agent:ai_agents(id, name, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error("Error creating schedule:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/agents/schedules:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
