import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext } from "@/lib/api-auth"

// POST /api/agents/activity/[id]/reject - Reject an execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || auth.type === "api_key") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = auth.userId

    const { id } = await params
    const body = await request.json()
    const { reason } = body

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
        .eq("profile_id", userId)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: "Not authorized to reject this execution" },
          { status: 403 }
        )
      }
    }

    // Update the execution status
    const { data: updated, error: updateError } = await supabase
      .from("agent_schedule_executions")
      .update({
        status: "rejected",
        rejection_reason: reason || null,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error rejecting execution:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ execution: updated, message: "Execution rejected" })
  } catch (error) {
    console.error("Error in POST /api/agents/activity/[id]/reject:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
