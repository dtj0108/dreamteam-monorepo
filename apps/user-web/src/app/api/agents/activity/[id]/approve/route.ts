import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { processApprovedExecutions } from "@/lib/schedule-processor"

// POST /api/agents/activity/[id]/approve - Approve an execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get the execution
    const { data: execution, error: fetchError } = await supabase
      .from("agent_schedule_executions")
      .select("id, status, agent_id")
      .eq("id", id)
      .single()

    if (fetchError || !execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    if (execution.status !== "pending_approval") {
      return NextResponse.json(
        { error: "Execution is not pending approval" },
        { status: 400 }
      )
    }

    // Verify user has access to the agent (via workspace membership)
    const { data: hiredAgent } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("ai_agent_id", execution.agent_id)
      .single()

    if (hiredAgent) {
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", hiredAgent.workspace_id)
        .eq("profile_id", session.id)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: "Not authorized to approve this execution" },
          { status: 403 }
        )
      }
    }

    // Update the execution status
    const { data: updated, error: updateError } = await supabase
      .from("agent_schedule_executions")
      .update({
        status: "approved",
        approved_by: session.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error approving execution:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fire-and-forget: trigger execution of approved tasks
    // This runs asynchronously so the API response isn't delayed
    processApprovedExecutions()
      .then((result) => {
        console.log(`[Approve] processApprovedExecutions completed:`, result)
      })
      .catch((err) => {
        console.error("[Approve] Error triggering execution:", err)
      })

    return NextResponse.json({ execution: updated, message: "Execution approved" })
  } catch (error) {
    console.error("Error in POST /api/agents/activity/[id]/approve:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
