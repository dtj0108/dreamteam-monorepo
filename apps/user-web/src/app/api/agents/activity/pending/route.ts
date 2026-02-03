import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/agents/activity/pending - List pending approval executions
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

    // Get pending approval executions
    const { data: executions, error, count } = await supabase
      .from("agent_schedule_executions")
      .select(`
        *,
        schedule:agent_schedules(id, name, cron_expression, task_prompt, workspace_id),
        agent:ai_agents(id, name, avatar_url)
      `, { count: "exact" })
      .eq("schedule.workspace_id", workspaceId)
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false })

    if (error) {
      // If table doesn't exist, return empty
      if (error.code === "42P01") {
        return NextResponse.json({ executions: [], total: 0 })
      }
      console.error("Error fetching pending executions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ executions: executions || [], total: count || 0 })
  } catch (error) {
    console.error("Error in GET /api/agents/activity/pending:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
