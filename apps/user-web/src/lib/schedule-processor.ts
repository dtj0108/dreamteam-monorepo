import { Cron } from "croner"
import { createAdminClient } from "@dreamteam/database/server"
import { executeAgentTask } from "./agent-executor"
import { sendAgentMessage, formatTaskCompletionMessage, getWorkspaceAdminIds, getWorkspaceOwnerId } from "./agent-messaging"
import type { SupabaseClient } from "@supabase/supabase-js"

interface ScheduleRow {
  id: string
  agent_id: string
  name: string
  cron_expression: string
  timezone: string
  task_prompt: string
  requires_approval: boolean
  is_enabled: boolean
  next_run_at: string | null
  created_by: string | null
  ai_agent: {
    id: string
    name: string
    system_prompt: string
    provider: string | null
    model: string | null
  } | null
}

interface LocalAgentRow {
  id: string
  workspace_id: string
  tools: string[]
  system_prompt: string | null
  reports_to: string[] | null
  style_presets: Record<string, unknown> | null
  custom_instructions: string | null
}

interface ExecutionRow {
  id: string
  agent_id: string
  approved_by: string | null
  schedule: ScheduleRow & {
    ai_agent: {
      system_prompt: string
      provider: string | null
      model: string | null
    } | null
  }
}

/**
 * Process all due agent schedules.
 * Called by the cron job to check for schedules whose next_run_at has passed.
 */
export async function processAgentSchedules(): Promise<{
  processed: number
  errors: number
}> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  let processed = 0
  let errors = 0

  // 1. Find due schedules with AI agent data (including provider and model)
  const { data: dueSchedules, error: scheduleError } = await supabase
    .from("agent_schedules")
    .select(`
      *,
      ai_agent:ai_agents(id, name, system_prompt, provider, model)
    `)
    .eq("is_enabled", true)
    .lte("next_run_at", now)
    .limit(50)

  if (scheduleError) {
    console.error("[ScheduleProcessor] Error fetching schedules:", scheduleError)
    return { processed: 0, errors: 1 }
  }

  for (const schedule of (dueSchedules as ScheduleRow[]) || []) {
    try {
      // 2. Find local agent (for workspace_id, tools, reports_to, and personality settings)
      const { data: localAgent } = await supabase
        .from("agents")
        .select("id, workspace_id, tools, system_prompt, reports_to, style_presets, custom_instructions")
        .eq("ai_agent_id", schedule.agent_id)
        .eq("is_active", true)
        .single()

      if (!localAgent) {
        console.warn(
          `[ScheduleProcessor] No active local agent found for ai_agent_id=${schedule.agent_id}, skipping schedule ${schedule.id}`
        )
        continue
      }

      // 3. Create execution record
      const status = schedule.requires_approval ? "pending_approval" : "running"
      const { data: execution, error: insertError } = await supabase
        .from("agent_schedule_executions")
        .insert({
          schedule_id: schedule.id,
          agent_id: schedule.agent_id,
          scheduled_for: schedule.next_run_at,
          status,
          started_at: status === "running" ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (insertError) {
        console.error(
          `[ScheduleProcessor] Error creating execution for schedule ${schedule.id}:`,
          insertError
        )
        errors++
        continue
      }

      // 4. Update schedule's next_run_at
      const nextRun = new Cron(schedule.cron_expression, {
        timezone: schedule.timezone || "UTC",
      }).nextRun()

      await supabase
        .from("agent_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun?.toISOString() ?? null,
        })
        .eq("id", schedule.id)

      // 5. Execute if immediate (no approval required)
      if (!schedule.requires_approval && execution) {
        await runExecution(
          execution.id,
          schedule,
          localAgent as LocalAgentRow,
          supabase,
          schedule.created_by // Notify the user who created the schedule
        )
      }

      processed++
    } catch (error) {
      console.error(
        `[ScheduleProcessor] Error processing schedule ${schedule.id}:`,
        error
      )
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Process all approved executions that are waiting to run.
 * Called by the cron job after processing new schedules.
 */
export async function processApprovedExecutions(): Promise<{
  processed: number
  errors: number
}> {
  const supabase = createAdminClient()
  let processed = 0
  let errors = 0

  const { data: approved, error: fetchError } = await supabase
    .from("agent_schedule_executions")
    .select(`
      *,
      schedule:agent_schedules(*,
        ai_agent:ai_agents(system_prompt, provider, model)
      )
    `)
    .eq("status", "approved")
    .limit(20)

  if (fetchError) {
    console.error("[ScheduleProcessor] Error fetching approved executions:", fetchError)
    return { processed: 0, errors: 1 }
  }

  for (const exec of (approved as ExecutionRow[]) || []) {
    try {
      // Get local agent for workspace context, tools, reports_to, and personality settings
      const { data: localAgent } = await supabase
        .from("agents")
        .select("id, workspace_id, tools, system_prompt, reports_to, style_presets, custom_instructions")
        .eq("ai_agent_id", exec.agent_id)
        .single()

      if (!localAgent) {
        console.warn(
          `[ScheduleProcessor] No local agent found for execution ${exec.id}`
        )
        await supabase
          .from("agent_schedule_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Agent no longer available in workspace",
          })
          .eq("id", exec.id)
        errors++
        continue
      }

      // Update status to running
      await supabase
        .from("agent_schedule_executions")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .eq("id", exec.id)

      await runExecution(
        exec.id,
        exec.schedule,
        localAgent as LocalAgentRow,
        supabase,
        exec.approved_by
      )

      processed++
    } catch (error) {
      console.error(
        `[ScheduleProcessor] Error processing approved execution ${exec.id}:`,
        error
      )
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Run a single execution and update the database with results.
 */
async function runExecution(
  executionId: string,
  schedule: ScheduleRow,
  localAgent: LocalAgentRow,
  supabase: SupabaseClient,
  notifyUserId?: string | null
): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'schedule-processor.ts:runExecution:raw-ai-agent',message:'Raw ai_agent data from DB',data:{executionId,aiAgentExists:!!schedule.ai_agent,aiAgentFull:schedule.ai_agent,rawProvider:schedule.ai_agent?.provider,rawProviderType:typeof schedule.ai_agent?.provider,rawModel:schedule.ai_agent?.model,providerIsNull:schedule.ai_agent?.provider===null,providerIsUndefined:schedule.ai_agent?.provider===undefined,providerIsEmptyString:schedule.ai_agent?.provider===''},timestamp:Date.now(),sessionId:'debug-session',runId:'provider-debug',hypothesisId:'A-raw-data'})}).catch(()=>{});
  // #endregion

  // Get provider and model from AI agent config
  const provider = (schedule.ai_agent?.provider as "anthropic" | "xai" | undefined) || "anthropic"
  const model = schedule.ai_agent?.model || undefined

  // #region agent log
  fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'schedule-processor.ts:runExecution:after-fallback',message:'Provider after fallback logic',data:{executionId,scheduleName:schedule.name,agentId:schedule.agent_id,rawProvider:schedule.ai_agent?.provider,resolvedProvider:provider,resolvedModel:model,hasXaiKey:!!process.env.XAI_API_KEY,hasAnthropicKey:!!process.env.ANTHROPIC_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'provider-debug',hypothesisId:'B-fallback'})}).catch(()=>{});
  // #endregion
  try {
    // Prefer local agent's system prompt, fall back to AI agent's
    const systemPrompt =
      localAgent.system_prompt ||
      schedule.ai_agent?.system_prompt ||
      "You are a helpful AI assistant."

    // #region agent log
    fetch('http://127.0.0.1:7251/ingest/ad122d98-a0b2-4935-b292-9bab921eccb9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'schedule-processor.ts:runExecution:beforeExecute',message:'About to call executeAgentTask with provider',data:{executionId,provider,model,systemPromptLength:systemPrompt.length,toolCount:localAgent.tools?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F-provider-fix'})}).catch(()=>{});
    // #endregion

    const result = await executeAgentTask({
      taskPrompt: schedule.task_prompt,
      systemPrompt,
      tools: localAgent.tools || [],
      workspaceId: localAgent.workspace_id,
      supabase,
      provider,
      model,
      stylePresets: localAgent.style_presets as Record<string, unknown> | null,
      customInstructions: localAgent.custom_instructions,
    })

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
      .eq("id", executionId)

    console.log(
      `[ScheduleProcessor] Execution ${executionId} completed successfully`
    )

    // Post completion message to agent chat
    // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
    let recipientIds: string[] = []
    let recipientSource: string = 'none'

    if (localAgent.reports_to && localAgent.reports_to.length > 0) {
      recipientIds = localAgent.reports_to
      recipientSource = 'reports_to'
    } else if (notifyUserId) {
      recipientIds = [notifyUserId]
      recipientSource = 'notifyUserId'
    } else {
      // Fallback to workspace admins
      recipientIds = await getWorkspaceAdminIds(localAgent.workspace_id, supabase)
      recipientSource = 'workspaceAdmins'

      // Final fallback: workspace owner specifically
      if (recipientIds.length === 0) {
        const ownerId = await getWorkspaceOwnerId(localAgent.workspace_id, supabase)
        if (ownerId) {
          recipientIds = [ownerId]
          recipientSource = 'workspaceOwner'
        }
      }
    }

    console.log(
      `[ScheduleProcessor] Recipient resolution for execution ${executionId}: ` +
      `source=${recipientSource}, count=${recipientIds.length}`
    )

    if (recipientIds.length > 0) {
      const content = formatTaskCompletionMessage({
        scheduleName: schedule.name,
        taskPrompt: schedule.task_prompt,
        status: 'completed',
        resultText: result.text,
        durationMs: result.durationMs,
      })

      console.log(
        `[ScheduleProcessor] Sending completion message for execution ${executionId} to ${recipientIds.length} recipient(s)`
      )

      for (const recipientId of recipientIds) {
        try {
          const msgResult = await sendAgentMessage({
            agentId: localAgent.id,
            recipientProfileId: recipientId,
            workspaceId: localAgent.workspace_id,
            content,
            supabase,
          })
          if (msgResult.success) {
            console.log(
              `[ScheduleProcessor] Completion message sent to ${recipientId} for execution ${executionId}`
            )
          } else {
            console.error(
              `[ScheduleProcessor] Failed to send completion message to ${recipientId}: ${msgResult.error}`
            )
          }
        } catch (err) {
          console.error(
            `[ScheduleProcessor] Failed to send completion message to ${recipientId} for execution ${executionId}:`,
            err
          )
          // Continue notifying other recipients even if one fails
        }
      }
    } else {
      console.warn(
        `[ScheduleProcessor] WARNING: No recipients found for execution ${executionId}. ` +
        `Agent reports_to=${JSON.stringify(localAgent.reports_to)}, ` +
        `schedule.created_by=${notifyUserId || 'null'}, workspace_id=${localAgent.workspace_id}`
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await supabase
      .from("agent_schedule_executions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", executionId)

    console.error(
      `[ScheduleProcessor] Execution ${executionId} failed:`,
      errorMessage
    )

    // Post failure message to agent chat
    // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
    let failureRecipientIds: string[] = []
    if (localAgent.reports_to && localAgent.reports_to.length > 0) {
      failureRecipientIds = localAgent.reports_to
    } else if (notifyUserId) {
      failureRecipientIds = [notifyUserId]
    } else {
      failureRecipientIds = await getWorkspaceAdminIds(localAgent.workspace_id, supabase)
      // Final fallback: workspace owner
      if (failureRecipientIds.length === 0) {
        const ownerId = await getWorkspaceOwnerId(localAgent.workspace_id, supabase)
        if (ownerId) {
          failureRecipientIds = [ownerId]
        }
      }
    }

    if (failureRecipientIds.length > 0) {
      const content = formatTaskCompletionMessage({
        scheduleName: schedule.name,
        taskPrompt: schedule.task_prompt,
        status: 'failed',
        resultText: errorMessage,
      })

      console.log(
        `[ScheduleProcessor] Sending failure message for execution ${executionId} to ${failureRecipientIds.length} recipient(s)`
      )

      for (const recipientId of failureRecipientIds) {
        try {
          await sendAgentMessage({
            agentId: localAgent.id,
            recipientProfileId: recipientId,
            workspaceId: localAgent.workspace_id,
            content,
            supabase,
          })
          console.log(
            `[ScheduleProcessor] Failure message sent to ${recipientId} for execution ${executionId}`
          )
        } catch (err) {
          console.error(
            `[ScheduleProcessor] Failed to send failure message to ${recipientId} for execution ${executionId}:`,
            err
          )
          // Continue notifying other recipients even if one fails
        }
      }
    } else {
      console.warn(
        `[ScheduleProcessor] WARNING: No recipients found for failed execution ${executionId}. ` +
        `Agent reports_to=${JSON.stringify(localAgent.reports_to)}, ` +
        `schedule.created_by=${notifyUserId || 'null'}, workspace_id=${localAgent.workspace_id}`
      )
    }
  }
}

