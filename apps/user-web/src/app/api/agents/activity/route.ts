import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext } from "@/lib/api-auth"

// GET /api/agents/activity - List execution history
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || auth.type === "api_key") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = auth.userId

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const agentId = searchParams.get("agent_id")
    const scheduleId = searchParams.get("schedule_id")
    const status = searchParams.get("status")
    const fromDate = searchParams.get("from_date")
    const toDate = searchParams.get("to_date")
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
      .eq("profile_id", userId)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Build query for agent_schedule_executions
    let query = supabase
      .from("agent_schedule_executions")
      .select(`
        *,
        schedule:agent_schedules(id, name, cron_expression, task_prompt, workspace_id),
        agent:ai_agents(id, name, avatar_url)
      `, { count: "exact" })
      .eq("schedule.workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (agentId) {
      query = query.eq("agent_id", agentId)
    }
    if (scheduleId) {
      query = query.eq("schedule_id", scheduleId)
    }
    if (status) {
      query = query.eq("status", status)
    }
    if (fromDate) {
      query = query.gte("created_at", fromDate)
    }
    if (toDate) {
      query = query.lte("created_at", toDate)
    }

    const { data: executions, error, count } = await query

    if (error) {
      console.error("Error fetching executions:", error)
      return NextResponse.json({ executions: [], total: 0 })
    }

    return NextResponse.json({ executions: executions || [], total: count || 0 })
  } catch (error) {
    console.error("Error in GET /api/agents/activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
