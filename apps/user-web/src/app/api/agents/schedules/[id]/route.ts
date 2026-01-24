import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/agents/schedules/[id] - Get a single schedule with agent details
export async function GET(
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

    // Fetch the schedule with agent relation
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select(`
        *,
        agent:ai_agents(id, name, avatar_url, description, model)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Verify user has access to the agent (via workspace membership)
    const { data: hiredAgent } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("ai_agent_id", schedule.agent_id)
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
          { error: "Not authorized to view this schedule" },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error in GET /api/agents/schedules/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/agents/schedules/[id] - Trigger a schedule to run immediately
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

    // Get the schedule with agent info
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select(`
        *,
        ai_agent:ai_agents(id, name, system_prompt)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Verify user has access to the agent (via workspace membership)
    const { data: hiredAgent } = await supabase
      .from("agents")
      .select("id, workspace_id, tools, system_prompt, reports_to")
      .eq("ai_agent_id", schedule.agent_id)
      .single()

    if (!hiredAgent) {
      return NextResponse.json(
        { error: "Agent not found in workspace" },
        { status: 404 }
      )
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", hiredAgent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to run this schedule" },
        { status: 403 }
      )
    }

    // Import and run the execution
    const { executeAgentTask } = await import("@/lib/agent-executor")
    const { sendAgentMessage, formatTaskCompletionMessage, getWorkspaceAdminIds, getWorkspaceOwnerId } = await import("@/lib/agent-messaging")

    // Create execution record
    const { data: execution, error: insertError } = await supabase
      .from("agent_schedule_executions")
      .insert({
        schedule_id: schedule.id,
        agent_id: schedule.agent_id,
        scheduled_for: new Date().toISOString(),
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Execute the task
    try {
      const systemPrompt =
        hiredAgent.system_prompt ||
        schedule.ai_agent?.system_prompt ||
        "You are a helpful AI assistant."

      const result = await executeAgentTask({
        taskPrompt: schedule.task_prompt,
        systemPrompt,
        tools: hiredAgent.tools || [],
        workspaceId: hiredAgent.workspace_id,
        supabase,
      })

      // Update execution as completed
      await supabase
        .from("agent_schedule_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: { text: result.text },
          tool_calls: result.toolCalls,
          tokens_input: result.usage?.promptTokens ?? null,
          tokens_output: result.usage?.completionTokens ?? null,
          duration_ms: result.durationMs,
        })
        .eq("id", execution.id)

      // Send completion message
      // Determine recipients for the completion message
      // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
      let recipientIds: string[] = []
      let recipientSource: string = 'none'

      if (hiredAgent.reports_to && hiredAgent.reports_to.length > 0) {
        recipientIds = hiredAgent.reports_to
        recipientSource = 'reports_to'
      } else if (schedule.created_by) {
        recipientIds = [schedule.created_by]
        recipientSource = 'schedule_created_by'
      } else {
        // Fallback to workspace admins
        recipientIds = await getWorkspaceAdminIds(hiredAgent.workspace_id, supabase)
        recipientSource = 'workspace_admins'

        // Final fallback: workspace owner specifically
        if (recipientIds.length === 0) {
          const ownerId = await getWorkspaceOwnerId(hiredAgent.workspace_id, supabase)
          if (ownerId) {
            recipientIds = [ownerId]
            recipientSource = 'workspace_owner'
          }
        }
      }

      console.log(
        `[ScheduleRun] Recipient resolution for schedule ${schedule.id}: ` +
        `source=${recipientSource}, count=${recipientIds.length}, ids=${recipientIds.join(',')}`
      )

      const content = formatTaskCompletionMessage({
        scheduleName: schedule.name,
        taskPrompt: schedule.task_prompt,
        status: 'completed',
        resultText: result.text,
        durationMs: result.durationMs,
      })

      for (const recipientId of recipientIds) {
        const msgResult = await sendAgentMessage({
          agentId: hiredAgent.id,
          recipientProfileId: recipientId,
          workspaceId: hiredAgent.workspace_id,
          content,
          supabase,
        })

        if (!msgResult.success) {
          console.error(`Failed to send completion message to ${recipientId}: ${msgResult.error}`)
        }
      }

      return NextResponse.json({
        success: true,
        execution: { id: execution.id, status: "completed" },
        result: { text: result.text?.slice(0, 200) },
      })
    } catch (taskError) {
      const errorMessage = taskError instanceof Error ? taskError.message : String(taskError)
      console.error(`Task execution failed for schedule ${schedule.id}:`, errorMessage)

      await supabase
        .from("agent_schedule_executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", execution.id)

      return NextResponse.json({
        success: false,
        execution: { id: execution.id, status: "failed" },
        error: errorMessage,
      })
    }
  } catch (error) {
    console.error("Error in POST /api/agents/schedules/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/agents/schedules/[id] - Update a schedule (toggle enable/disable)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { is_enabled } = body

    const supabase = createAdminClient()

    // Get the schedule
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select("id, agent_id")
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Verify user has access to the agent (via workspace membership)
    const { data: hiredAgent } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("ai_agent_id", schedule.agent_id)
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
          { error: "Not authorized to update this schedule" },
          { status: 403 }
        )
      }
    }

    // Update the schedule
    const { data: updated, error: updateError } = await supabase
      .from("agent_schedules")
      .update({
        is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating schedule:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ schedule: updated })
  } catch (error) {
    console.error("Error in PATCH /api/agents/schedules/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
