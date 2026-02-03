import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { mapToolNamesToCategories } from "@/lib/agent-tool-mapping"
import { resolveWorkspaceAgent } from "@/lib/workspace-agent"

// POST /api/admin/agents/[id]/schedules/[scheduleId]/run - Run a schedule immediately
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: agentId, scheduleId } = await params
    const body = await request.json().catch(() => ({}))

    const supabase = createAdminClient()

    // Get the schedule with agent info
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select(`
        *,
        ai_agent:ai_agents(id, name, system_prompt, provider, model)
      `)
      .eq("id", scheduleId)
      .eq("agent_id", agentId)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workspaceId = (schedule.workspace_id as string | null) || body.workspace_id
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Schedule missing workspace context" },
        { status: 400 }
      )
    }

    const resolvedAgent = await resolveWorkspaceAgent({
      workspaceId,
      aiAgentId: agentId,
      supabase,
    })

    if (!resolvedAgent.isEnabled) {
      return NextResponse.json(
        { error: "Agent not enabled in this workspace" },
        { status: 404 }
      )
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to run this schedule" },
        { status: 403 }
      )
    }

    // Import execution and messaging functions
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
        resolvedAgent.legacyAgent?.system_prompt ||
        resolvedAgent.deploymentAgent?.system_prompt ||
        schedule.ai_agent?.system_prompt ||
        "You are a helpful AI assistant."

      const provider = (resolvedAgent.deploymentAgent?.provider as "anthropic" | "xai" | undefined) ||
        (schedule.ai_agent?.provider as "anthropic" | "xai" | undefined) ||
        "anthropic"
      const model = resolvedAgent.deploymentAgent?.model || schedule.ai_agent?.model || undefined

      const { data: agentTools } = await supabase
        .from("ai_agent_tools")
        .select("tool:agent_tools(name)")
        .eq("agent_id", agentId)

      const rawToolNames = (agentTools
        ?.map((t: { tool: { name: string } | null }) => t.tool?.name)
        .filter(Boolean) as string[]) || []

      const toolCategories = mapToolNamesToCategories(rawToolNames)

      const result = await executeAgentTask({
        taskPrompt: schedule.task_prompt,
        systemPrompt,
        tools: toolCategories,
        workspaceId,
        supabase,
        provider,
        model,
        stylePresets: resolvedAgent.legacyAgent?.style_presets as Record<string, unknown> | null,
        customInstructions: resolvedAgent.legacyAgent?.custom_instructions as string | null,
      })

      // Update execution as completed
      await supabase
        .from("agent_schedule_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: { message: result.text, todos: [] },
          tool_calls: result.toolCalls,
          tokens_input: result.usage?.promptTokens ?? null,
          tokens_output: result.usage?.completionTokens ?? null,
          duration_ms: result.durationMs,
        })
        .eq("id", execution.id)

      // Determine recipients for the completion message
      // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
      let recipientIds: string[] = []
      let recipientSource: string = 'none'

      if (resolvedAgent.legacyAgent?.reports_to && resolvedAgent.legacyAgent.reports_to.length > 0) {
        recipientIds = resolvedAgent.legacyAgent.reports_to
        recipientSource = 'reports_to'
      } else if (schedule.created_by) {
        recipientIds = [schedule.created_by]
        recipientSource = 'schedule_created_by'
      } else {
        // Fallback to workspace admins
        recipientIds = await getWorkspaceAdminIds(workspaceId, supabase)
        recipientSource = 'workspace_admins'

        // Final fallback: workspace owner specifically
        if (recipientIds.length === 0) {
          const ownerId = await getWorkspaceOwnerId(workspaceId, supabase)
          if (ownerId) {
            recipientIds = [ownerId]
            recipientSource = 'workspace_owner'
          }
        }
      }

      console.log(`[AdminScheduleRun] ========== MESSAGE DELIVERY START ==========`)
      console.log(
        `[AdminScheduleRun] Recipient resolution for schedule ${scheduleId}: ` +
        `source=${recipientSource}, count=${recipientIds.length}, ids=${recipientIds.join(',')}`
      )
      console.log(`[AdminScheduleRun] Workspace ID: ${workspaceId}`)

      // Format and send completion messages
      const content = formatTaskCompletionMessage({
        scheduleName: schedule.name,
        taskPrompt: schedule.task_prompt,
        status: 'completed',
        resultText: result.text,
        durationMs: result.durationMs,
      })

      console.log(`[AdminScheduleRun] Message content length: ${content.length} chars`)

      const messageResults = []
      for (const recipientId of recipientIds) {
        console.log(`[AdminScheduleRun] Sending to recipient: ${recipientId}`)

        const msgResult = await sendAgentMessage({
          agentId: resolvedAgent.legacyAgent?.id,
          agentProfileId: resolvedAgent.agentProfileId ?? undefined,
          aiAgentId: agentId,
          recipientProfileId: recipientId,
          workspaceId,
          content,
          supabase,
        })

        console.log(`[AdminScheduleRun] Result for ${recipientId}:`, JSON.stringify(msgResult))

        if (!msgResult.success) {
          console.error(`[AdminScheduleRun] FAILED to send to ${recipientId}: ${msgResult.error}`)
        } else {
          console.log(`[AdminScheduleRun] SUCCESS - messageId: ${msgResult.messageId}, conversationId: ${msgResult.conversationId}`)
        }

        messageResults.push({ recipientId, ...msgResult })
      }

      console.log(`[AdminScheduleRun] ========== MESSAGE DELIVERY END ==========`)

      // Refetch the execution with all data for the response
      const { data: finalExecution } = await supabase
        .from("agent_schedule_executions")
        .select("*")
        .eq("id", execution.id)
        .single()

      return NextResponse.json({
        execution: finalExecution,
        message: "Execution completed",
        messaging: { recipientIds, recipientSource, results: messageResults },
        usage: {
          inputTokens: result.usage?.promptTokens ?? 0,
          outputTokens: result.usage?.completionTokens ?? 0,
        },
      })
    } catch (taskError) {
      const errorMessage = taskError instanceof Error ? taskError.message : String(taskError)
      console.error(`Task execution failed for schedule ${scheduleId}:`, errorMessage)

      await supabase
        .from("agent_schedule_executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", execution.id)

      // Refetch the execution with all data for the response
      const { data: finalExecution } = await supabase
        .from("agent_schedule_executions")
        .select("*")
        .eq("id", execution.id)
        .single()

      return NextResponse.json({
        execution: finalExecution,
        message: "Execution failed",
        error: errorMessage,
      })
    }
  } catch (error) {
    console.error("Error in POST /api/admin/agents/[id]/schedules/[scheduleId]/run:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
