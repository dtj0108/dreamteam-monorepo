import { Cron } from "croner"
import { createAdminClient } from "@dreamteam/database/server"
import { buildOutputInstructions, type OutputConfig } from "@dreamteam/ai-utils"
import { executeAgentTask } from "./agent-executor"
import { sendAgentMessage, formatTaskCompletionMessage, getWorkspaceAdminIds, getWorkspaceOwnerId } from "./agent-messaging"
import type { SupabaseClient } from "@supabase/supabase-js"
import { logAuditEvent } from "./audit-logger"
import { mapToolNamesToCategories } from "./agent-tool-mapping"
import { resolveWorkspaceAgent } from "./workspace-agent"

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
  workspace_id: string | null
  created_by: string | null
  output_config: OutputConfig | null
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
  ai_agent_id: string
  workspace_id: string
  tools: string[]
  system_prompt: string | null
  reports_to: string[] | null
  style_presets: Record<string, unknown> | null
  custom_instructions: string | null
  profile_id?: string | null
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

interface ResolvedAgentContext {
  source: "deployment" | "legacy"
  ai_agent_id: string
  workspace_id: string
  tools: string[]
  system_prompt: string | null
  provider?: string | null
  model?: string | null
  reports_to?: string[] | null
  style_presets?: Record<string, unknown> | null
  custom_instructions?: string | null
  agent_profile_id?: string | null
  legacy_agent_id?: string | null
}

/**
 * Process all due agent schedules.
 * Called by the cron job to check for schedules whose next_run_at has passed.
 * 
 * Uses PostgreSQL advisory locks to prevent race conditions when multiple
 * cron instances attempt to process the same schedule simultaneously.
 */
export async function processAgentSchedules(): Promise<{
  processed: number
  errors: number
  skipped: number
}> {
  const supabase = createAdminClient()
  let processed = 0
  let errors = 0
  let skipped = 0

  // 1. Fetch due schedules using SKIP LOCKED to prevent race conditions
  // This locks the rows at the database level
  const { data: dueSchedules, error: scheduleError } = await supabase.rpc(
    "fetch_due_schedules",
    { batch_size: 50 }
  )

  if (scheduleError) {
    console.error("[ScheduleProcessor] Error fetching schedules:", scheduleError)
    return { processed: 0, errors: 1, skipped: 0 }
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    return { processed: 0, errors: 0, skipped: 0 }
  }

  console.log(`[ScheduleProcessor] Found ${dueSchedules.length} due schedules`)

  // 2. BATCHED DATA LOOKUPS
  const scheduleRows = dueSchedules as ScheduleRow[]
  const agentIds = [...new Set(scheduleRows.map(s => s.agent_id))]
  const workspaceIds = [...new Set(scheduleRows.map(s => s.workspace_id).filter(Boolean) as string[])]

  const { data: localAgents, error: agentsError } = await supabase
    .from("agents")
    .select("id, ai_agent_id, workspace_id, tools, system_prompt, reports_to, style_presets, custom_instructions, profile_id")
    .in("ai_agent_id", agentIds)
    .eq("is_active", true)

  if (agentsError) {
    console.error("[ScheduleProcessor] Error fetching local agents:", agentsError)
    return { processed: 0, errors: 1, skipped: 0 }
  }

  const { data: deployments, error: deploymentError } = await supabase
    .from("workspace_deployed_teams")
    .select("*")
    .in("workspace_id", workspaceIds)
    .eq("status", "active")

  if (deploymentError) {
    console.error("[ScheduleProcessor] Error fetching workspace deployments:", deploymentError)
    return { processed: 0, errors: 1, skipped: 0 }
  }

  const { data: agentTools } = await supabase
    .from("ai_agent_tools")
    .select("agent_id, tool:agent_tools(name)")
    .in("agent_id", agentIds)

  const toolNameMap = new Map<string, string[]>()
  for (const row of agentTools || []) {
    const toolRow = row as { agent_id: string; tool?: { name?: string | null } | null }
    const toolName = toolRow.tool?.name
    if (!toolName) continue
    const existing = toolNameMap.get(toolRow.agent_id) || []
    existing.push(toolName)
    toolNameMap.set(toolRow.agent_id, existing)
  }

  const agentMap = new Map<string, LocalAgentRow>()
  for (const agent of (localAgents || [])) {
    if (!agent.workspace_id) continue
    agentMap.set(`${agent.workspace_id}:${agent.ai_agent_id}`, agent as LocalAgentRow)
  }

  const deploymentMap = new Map<string, { active_config?: unknown }>()
  for (const deployment of deployments || []) {
    deploymentMap.set(deployment.workspace_id, deployment as { active_config?: unknown })
  }

  console.log(`[ScheduleProcessor] Resolved ${agentMap.size} legacy agents and ${deploymentMap.size} deployments for ${dueSchedules.length} schedules`)

  for (const schedule of dueSchedules as ScheduleRow[]) {
    let lockAcquired = false

    try {
      // 3. Acquire advisory lock for this schedule
      // This prevents other cron instances from processing the same schedule
      const { data: lockResult, error: lockError } = await supabase.rpc(
        "acquire_schedule_lock",
        { schedule_id: schedule.id, lock_timeout: "5 minutes" }
      )

      if (lockError) {
        console.error(
          `[ScheduleProcessor] Lock error for schedule ${schedule.id}:`,
          lockError
        )
        errors++
        continue
      }

      if (!lockResult) {
        console.log(
          `[ScheduleProcessor] Schedule ${schedule.id} is already being processed by another instance, skipping`
        )
        skipped++
        continue
      }

      lockAcquired = true
      console.log(`[ScheduleProcessor] Acquired lock for schedule ${schedule.id}`)

      // 4. Re-fetch the schedule with agent data (the RPC returns basic data only)
      // We do this AFTER acquiring the lock to ensure we have the latest data
      const { data: scheduleWithAgent, error: agentError } = await supabase
        .from("agent_schedules")
        .select(`
          *,
          ai_agent:ai_agents(id, name, system_prompt, provider, model)
        `)
        .eq("id", schedule.id)
        .single()

      if (agentError || !scheduleWithAgent) {
        console.error(
          `[ScheduleProcessor] Error fetching schedule ${schedule.id} with agent data:`,
          agentError
        )
        errors++
        continue
      }

      const workspaceId = schedule.workspace_id
      if (!workspaceId) {
        console.warn(
          `[ScheduleProcessor] Schedule ${schedule.id} has no workspace_id, skipping`
        )
        skipped++
        continue
      }

      const deployment = deploymentMap.get(workspaceId) ?? null
      let agentContext: ResolvedAgentContext | null = null

      if (deployment) {
        const resolvedAgent = await resolveWorkspaceAgent({
          workspaceId,
          aiAgentId: schedule.agent_id,
          supabase,
          deployment,
        })

        if (!resolvedAgent.isEnabled || !resolvedAgent.deploymentAgent) {
          console.warn(
            `[ScheduleProcessor] Agent not enabled for schedule ${schedule.id} in workspace ${workspaceId}, skipping`
          )
          skipped++
          continue
        }

        const rawToolNames = toolNameMap.get(schedule.agent_id) || []
        const toolCategories = mapToolNamesToCategories(rawToolNames)

        agentContext = {
          source: "deployment",
          ai_agent_id: schedule.agent_id,
          workspace_id: workspaceId,
          tools: toolCategories,
          system_prompt: resolvedAgent.deploymentAgent.system_prompt || null,
          provider: resolvedAgent.deploymentAgent.provider || scheduleWithAgent.ai_agent?.provider || null,
          model: resolvedAgent.deploymentAgent.model || scheduleWithAgent.ai_agent?.model || null,
          agent_profile_id: resolvedAgent.agentProfileId ?? null,
        }
      } else {
        const localAgent = agentMap.get(`${workspaceId}:${schedule.agent_id}`)
        if (!localAgent) {
          console.warn(
            `[ScheduleProcessor] No active local agent found for ai_agent_id=${schedule.agent_id} in workspace ${workspaceId}, skipping schedule ${schedule.id}`
          )
          skipped++
          continue
        }

        agentContext = {
          source: "legacy",
          ai_agent_id: schedule.agent_id,
          workspace_id: localAgent.workspace_id,
          tools: localAgent.tools || [],
          system_prompt: localAgent.system_prompt,
          provider: scheduleWithAgent.ai_agent?.provider || null,
          model: scheduleWithAgent.ai_agent?.model || null,
          reports_to: localAgent.reports_to,
          style_presets: localAgent.style_presets,
          custom_instructions: localAgent.custom_instructions,
          agent_profile_id: localAgent.profile_id ?? null,
          legacy_agent_id: localAgent.id,
        }
      }

      if (!agentContext) {
        console.warn(
          `[ScheduleProcessor] Unable to resolve agent context for schedule ${schedule.id}, skipping`
        )
        skipped++
        continue
      }

      // 6. Create execution record
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

      // 7. Update schedule's next_run_at
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

      // 8. Execute if immediate (no approval required)
      if (!schedule.requires_approval && execution) {
        await runExecution(
          execution.id,
          scheduleWithAgent as ScheduleRow,
          agentContext,
          supabase,
          schedule.created_by // Notify the user who created the schedule
        )
      }

      processed++
      console.log(`[ScheduleProcessor] Successfully processed schedule ${schedule.id}`)
    } catch (error) {
      console.error(
        `[ScheduleProcessor] Error processing schedule ${schedule.id}:`
      )
      if (error instanceof Error) {
        console.error(`  Message: ${error.message}`)
        console.error(`  Stack: ${error.stack}`)
      } else {
        console.error(`  Error:`, error)
      }
      errors++
    } finally {
      // 9. Always release the lock, even if processing failed
      if (lockAcquired) {
        try {
          await supabase.rpc("release_schedule_lock", { schedule_id: schedule.id })
          console.log(`[ScheduleProcessor] Released lock for schedule ${schedule.id}`)
        } catch (releaseError) {
          console.error(
            `[ScheduleProcessor] Error releasing lock for schedule ${schedule.id}:`,
            releaseError
          )
        }
      }
    }
  }

  return { processed, errors, skipped }
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

  if (!approved || approved.length === 0) {
    return { processed: 0, errors: 0 }
  }

  const executionRows = approved as ExecutionRow[]
  const agentIds = [...new Set(executionRows.map(e => e.agent_id))]
  const workspaceIds = [...new Set(executionRows.map(e => e.schedule.workspace_id).filter(Boolean) as string[])]

  const { data: localAgents, error: agentsError } = await supabase
    .from("agents")
    .select("id, ai_agent_id, workspace_id, tools, system_prompt, reports_to, style_presets, custom_instructions, profile_id")
    .in("ai_agent_id", agentIds)

  if (agentsError) {
    console.error("[ScheduleProcessor] Error fetching local agents for executions:", agentsError)
    return { processed: 0, errors: 1 }
  }

  const { data: deployments, error: deploymentError } = await supabase
    .from("workspace_deployed_teams")
    .select("*")
    .in("workspace_id", workspaceIds)
    .eq("status", "active")

  if (deploymentError) {
    console.error("[ScheduleProcessor] Error fetching workspace deployments:", deploymentError)
    return { processed: 0, errors: 1 }
  }

  const { data: agentTools } = await supabase
    .from("ai_agent_tools")
    .select("agent_id, tool:agent_tools(name)")
    .in("agent_id", agentIds)

  const toolNameMap = new Map<string, string[]>()
  for (const row of agentTools || []) {
    const toolRow = row as { agent_id: string; tool?: { name?: string | null } | null }
    const toolName = toolRow.tool?.name
    if (!toolName) continue
    const existing = toolNameMap.get(toolRow.agent_id) || []
    existing.push(toolName)
    toolNameMap.set(toolRow.agent_id, existing)
  }

  const agentMap = new Map<string, LocalAgentRow>()
  for (const agent of (localAgents || [])) {
    if (!agent.workspace_id) continue
    agentMap.set(`${agent.workspace_id}:${agent.ai_agent_id}`, agent as LocalAgentRow)
  }

  const deploymentMap = new Map<string, { active_config?: unknown }>()
  for (const deployment of deployments || []) {
    deploymentMap.set(deployment.workspace_id, deployment as { active_config?: unknown })
  }

  console.log(`[ScheduleProcessor] Resolved ${agentMap.size} legacy agents and ${deploymentMap.size} deployments for ${approved.length} approved executions`)

  for (const exec of approved as ExecutionRow[]) {
    try {
      const workspaceId = exec.schedule.workspace_id
      if (!workspaceId) {
        console.warn(
          `[ScheduleProcessor] Execution ${exec.id} has no workspace_id`
        )
        await supabase
          .from("agent_schedule_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Schedule missing workspace context",
          })
          .eq("id", exec.id)
        errors++
        continue
      }

      const deployment = deploymentMap.get(workspaceId) ?? null
      let agentContext: ResolvedAgentContext | null = null

      if (deployment) {
        const resolvedAgent = await resolveWorkspaceAgent({
          workspaceId,
          aiAgentId: exec.agent_id,
          supabase,
          deployment,
        })

        if (!resolvedAgent.isEnabled || !resolvedAgent.deploymentAgent) {
          console.warn(
            `[ScheduleProcessor] Agent not enabled for execution ${exec.id} in workspace ${workspaceId}`
          )
          await supabase
            .from("agent_schedule_executions")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_message: "Agent not enabled in workspace",
            })
            .eq("id", exec.id)
          errors++
          continue
        }

        const rawToolNames = toolNameMap.get(exec.agent_id) || []
        const toolCategories = mapToolNamesToCategories(rawToolNames)

        agentContext = {
          source: "deployment",
          ai_agent_id: exec.agent_id,
          workspace_id: workspaceId,
          tools: toolCategories,
          system_prompt: resolvedAgent.deploymentAgent.system_prompt || null,
          provider: resolvedAgent.deploymentAgent.provider || exec.schedule.ai_agent?.provider || null,
          model: resolvedAgent.deploymentAgent.model || exec.schedule.ai_agent?.model || null,
          agent_profile_id: resolvedAgent.agentProfileId ?? null,
        }
      } else {
        const localAgent = agentMap.get(`${workspaceId}:${exec.agent_id}`)
        if (!localAgent) {
          console.warn(
            `[ScheduleProcessor] No local agent found for execution ${exec.id} in workspace ${workspaceId}`
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

        agentContext = {
          source: "legacy",
          ai_agent_id: exec.agent_id,
          workspace_id: localAgent.workspace_id,
          tools: localAgent.tools || [],
          system_prompt: localAgent.system_prompt,
          provider: exec.schedule.ai_agent?.provider || null,
          model: exec.schedule.ai_agent?.model || null,
          reports_to: localAgent.reports_to,
          style_presets: localAgent.style_presets,
          custom_instructions: localAgent.custom_instructions,
          agent_profile_id: localAgent.profile_id ?? null,
          legacy_agent_id: localAgent.id,
        }
      }

      if (!agentContext) {
        console.warn(
          `[ScheduleProcessor] Unable to resolve agent context for execution ${exec.id}`
        )
        await supabase
          .from("agent_schedule_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Agent resolution failed",
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
      
      // Log execution started (approved execution)
      await logAuditEvent({
        action: 'schedule_execution_started',
        resourceType: 'agent_schedule_execution',
        resourceId: exec.id,
        workspaceId: agentContext.workspace_id,
        agentId: exec.agent_id,
        actorType: 'system',
        metadata: {
          schedule_id: exec.schedule.id,
          approved_by: exec.approved_by,
          started_at: new Date().toISOString(),
        },
      })

      await runExecution(
        exec.id,
        exec.schedule,
        agentContext,
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
  agentContext: ResolvedAgentContext,
  supabase: SupabaseClient,
  notifyUserId?: string | null
): Promise<void> {
  // Get provider and model from AI agent config
  const provider = (agentContext.provider as "anthropic" | "xai" | undefined) ||
    (schedule.ai_agent?.provider as "anthropic" | "xai" | undefined) ||
    "anthropic"
  const model = agentContext.model || schedule.ai_agent?.model || undefined

  try {
    // Prefer local agent's system prompt, fall back to AI agent's
    const systemPrompt =
      agentContext.system_prompt ||
      schedule.ai_agent?.system_prompt ||
      "You are a helpful AI assistant."

    // Build task prompt with output formatting instructions
    const outputInstructions = buildOutputInstructions(schedule.output_config)
    const finalTaskPrompt = `${schedule.task_prompt}

---

${outputInstructions}`

    const result = await executeAgentTask({
      taskPrompt: finalTaskPrompt,
      systemPrompt,
      tools: agentContext.tools || [],
      workspaceId: agentContext.workspace_id,
      supabase,
      provider,
      model,
      stylePresets: agentContext.style_presets as Record<string, unknown> | null,
      customInstructions: agentContext.custom_instructions || null,
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
    
    // Log execution completed
    await logAuditEvent({
      action: 'schedule_execution_completed',
      resourceType: 'agent_schedule_execution',
      resourceId: executionId,
      workspaceId: agentContext.workspace_id,
      agentId: agentContext.ai_agent_id,
      actorType: 'system',
      metadata: {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        duration_ms: result.durationMs,
        tool_calls: result.toolCalls?.length ?? 0,
        tokens_input: result.usage?.promptTokens ?? null,
        tokens_output: result.usage?.completionTokens ?? null,
        completed_at: new Date().toISOString(),
      },
    })

    // Post completion message to agent chat
    // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
    let recipientIds: string[] = []
    let recipientSource: string = 'none'

    if (agentContext.reports_to && agentContext.reports_to.length > 0) {
      recipientIds = agentContext.reports_to
      recipientSource = 'reports_to'
    } else if (notifyUserId) {
      recipientIds = [notifyUserId]
      recipientSource = 'notifyUserId'
    } else {
      // Fallback to workspace admins
      recipientIds = await getWorkspaceAdminIds(agentContext.workspace_id, supabase)
      recipientSource = 'workspaceAdmins'

      // Final fallback: workspace owner specifically
      if (recipientIds.length === 0) {
        const ownerId = await getWorkspaceOwnerId(agentContext.workspace_id, supabase)
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
            agentId: agentContext.legacy_agent_id || undefined,
            agentProfileId: agentContext.agent_profile_id || undefined,
            aiAgentId: agentContext.ai_agent_id,
            recipientProfileId: recipientId,
            workspaceId: agentContext.workspace_id,
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
        `Agent reports_to=${JSON.stringify(agentContext.reports_to)}, ` +
        `schedule.created_by=${notifyUserId || 'null'}, workspace_id=${agentContext.workspace_id}`
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
    
    // Log execution failed
    await logAuditEvent({
      action: 'schedule_execution_failed',
      resourceType: 'agent_schedule_execution',
      resourceId: executionId,
      workspaceId: agentContext.workspace_id,
      agentId: agentContext.ai_agent_id,
      actorType: 'system',
      metadata: {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        error: errorMessage,
        failed_at: new Date().toISOString(),
      },
    })

    // Post failure message to agent chat
    // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
    let failureRecipientIds: string[] = []
    if (agentContext.reports_to && agentContext.reports_to.length > 0) {
      failureRecipientIds = agentContext.reports_to
    } else if (notifyUserId) {
      failureRecipientIds = [notifyUserId]
    } else {
      failureRecipientIds = await getWorkspaceAdminIds(agentContext.workspace_id, supabase)
      // Final fallback: workspace owner
      if (failureRecipientIds.length === 0) {
        const ownerId = await getWorkspaceOwnerId(agentContext.workspace_id, supabase)
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
            agentId: agentContext.legacy_agent_id || undefined,
            agentProfileId: agentContext.agent_profile_id || undefined,
            aiAgentId: agentContext.ai_agent_id,
            recipientProfileId: recipientId,
            workspaceId: agentContext.workspace_id,
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
        `Agent reports_to=${JSON.stringify(agentContext.reports_to)}, ` +
        `schedule.created_by=${notifyUserId || 'null'}, workspace_id=${agentContext.workspace_id}`
      )
    }
  }
}
