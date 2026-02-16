import { NextRequest, NextResponse } from "next/server"
import {
  processAgentSchedules,
  processApprovedExecutions,
} from "@/lib/schedule-processor"
import { checkRateLimit, getRateLimitHeaders, rateLimitPresets } from "@dreamteam/auth"
import { createAdminClient } from "@dreamteam/database/server"
import { executeAgentTask } from "@/lib/agent-executor"
import { sendAgentMessage, formatTaskCompletionMessage, getWorkspaceAdminIds, getWorkspaceOwnerId } from "@/lib/agent-messaging"
import { mapToolNamesToCategories } from "@/lib/agent-tool-mapping"
import { resolveWorkspaceAgent } from "@/lib/workspace-agent"

// Allow up to 60 seconds for cron processing
export const maxDuration = 60

/**
 * Cron endpoint for processing agent schedules.
 * Called every minute by Vercel Cron.
 *
 * 1. Processes due schedules (creates executions, runs immediate tasks)
 * 2. Processes approved executions (runs tasks that were approved)
 * 
 * Test mode: Add ?test=true to force-run the first available schedule
 */
export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

  if (isProduction) {
    return NextResponse.json(
      { error: "Cron scheduling is handled by the admin app in production." },
      { status: 410 }
    )
  }

  // Rate limiting - use IP address as identifier
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.cron)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    )
  }

  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const { searchParams } = new URL(request.url)
  const testMode = searchParams.get("test") === "true"
  // Block test mode in production (security fix)
  if (testMode && isProduction) {
    return NextResponse.json({ error: "Test mode not allowed in production" }, { status: 403 })
  }

  // Verify cron secret — reject if secret is unset or mismatched (skip in test mode for local dev)
  if ((!cronSecret || authHeader !== `Bearer ${cronSecret}`) && !testMode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Test mode: force-run a schedule for debugging
  if (testMode) {
    console.log("[Cron] TEST MODE - Force running first available schedule")
    
    const supabase = createAdminClient()
    
    // If list=true, show all schedules with their offsets
    if (searchParams.get("list") === "true") {
      const { data: allSchedules } = await supabase
        .from("agent_schedules")
        .select(`id, name, ai_agent:ai_agents(id, name, provider, model)`)
        .eq("is_enabled", true)
        .order("created_at", { ascending: true })
      
      return NextResponse.json({
        testMode: true,
        action: "list",
        schedules: allSchedules?.map((s: NonNullable<typeof allSchedules>[number], i: number) => ({
          offset: i,
          scheduleId: s.id,
          scheduleName: s.name,
          agentName: s.ai_agent?.name,
          provider: s.ai_agent?.provider,
          model: s.ai_agent?.model,
        })),
      })
    }
    
    // Find any enabled schedule (use offset param to select different ones)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const { data: schedules, error: scheduleError } = await supabase
      .from("agent_schedules")
      .select(`
        *,
        ai_agent:ai_agents(id, name, system_prompt, provider, model)
      `)
      .eq("is_enabled", true)
      .range(offset, offset)
      .limit(1)

    if (scheduleError || !schedules || schedules.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No enabled schedules found",
        scheduleError: scheduleError?.message,
      })
    }

    const schedule = schedules[0]
    console.log(`[Cron] TEST: Found schedule ${schedule.id} - ${schedule.name}`)

    const workspaceId = schedule.workspace_id as string | null
    if (!workspaceId) {
      return NextResponse.json({
        success: false,
        error: "Schedule missing workspace context",
        schedule: { id: schedule.id, name: schedule.name, agent_id: schedule.agent_id },
      })
    }

    const resolvedAgent = await resolveWorkspaceAgent({
      workspaceId,
      aiAgentId: schedule.agent_id,
      supabase,
    })

    if (!resolvedAgent.isEnabled) {
      return NextResponse.json({
        success: false,
        error: "Agent not enabled in this workspace",
        schedule: { id: schedule.id, name: schedule.name, agent_id: schedule.agent_id },
      })
    }

    console.log(`[Cron] TEST: Using workspace ${workspaceId} for schedule ${schedule.id}`)

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
      return NextResponse.json({
        success: false,
        error: "Failed to create execution",
        insertError: insertError.message,
      })
    }

    try {
      const systemPrompt =
        resolvedAgent.legacyAgent?.system_prompt ||
        resolvedAgent.deploymentAgent?.system_prompt ||
        schedule.ai_agent?.system_prompt ||
        "You are a helpful AI assistant."

      // Get provider and model from AI agent config
      const provider = (resolvedAgent.deploymentAgent?.provider as "anthropic" | "xai" | undefined) ||
        (schedule.ai_agent?.provider as "anthropic" | "xai" | undefined) ||
        "anthropic"
      const model = resolvedAgent.deploymentAgent?.model || schedule.ai_agent?.model || undefined

      const { data: agentTools } = await supabase
        .from("ai_agent_tools")
        .select("tool:agent_tools(name)")
        .eq("agent_id", schedule.agent_id)

      const rawToolNames = (agentTools
        ?.map((t: { tool: { name: string } | null }) => t.tool?.name)
        .filter(Boolean) as string[]) || []

      const toolCategories = mapToolNamesToCategories(rawToolNames)

      console.log(`[Cron] TEST: Executing task with provider=${provider}, model=${model}: ${schedule.task_prompt.slice(0, 50)}...`)

      const result = await executeAgentTask({
        taskPrompt: schedule.task_prompt,
        systemPrompt,
        tools: toolCategories,
        workspaceId,
        supabase,
        provider,
        model,
      })

      console.log(`[Cron] TEST: Task completed with result length: ${result.text?.length || 0}`)

      // Update execution as completed
      await supabase
        .from("agent_schedule_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: { text: result.text },
          tool_calls: result.toolCalls,
          duration_ms: result.durationMs,
        })
        .eq("id", execution.id)

      // Now test the messaging part
      // Priority: agent.reports_to > schedule.created_by > workspace admins > workspace owner
      console.log(`[Cron] TEST: Starting message delivery...`)
      console.log(`[Cron] TEST: resolvedAgent.reports_to = ${JSON.stringify(resolvedAgent.legacyAgent?.reports_to || [])}`)
      console.log(`[Cron] TEST: schedule.created_by = ${schedule.created_by}`)

      let recipientIds: string[] = []
      let recipientSource = 'none'

      if (resolvedAgent.legacyAgent?.reports_to && resolvedAgent.legacyAgent.reports_to.length > 0) {
        recipientIds = resolvedAgent.legacyAgent.reports_to
        recipientSource = 'reports_to'
      } else if (schedule.created_by) {
        recipientIds = [schedule.created_by]
        recipientSource = 'created_by'
      } else {
        // Fallback to workspace admins
        const workspaceAdmins = await getWorkspaceAdminIds(workspaceId, supabase)
        console.log(`[Cron] TEST: workspaceAdmins = ${JSON.stringify(workspaceAdmins)}`)

        if (workspaceAdmins.length > 0) {
          recipientIds = workspaceAdmins
          recipientSource = 'workspace_admins'
        } else {
          // Final fallback: workspace owner
          const ownerId = await getWorkspaceOwnerId(workspaceId, supabase)
          if (ownerId) {
            recipientIds = [ownerId]
            recipientSource = 'workspace_owner'
          }
        }
      }

      console.log(`[Cron] TEST: Final recipientIds = ${JSON.stringify(recipientIds)} (source: ${recipientSource})`)

      if (recipientIds.length === 0) {
        console.warn(`[Cron] TEST: WARNING - No recipients found! Messages will not be delivered.`)
        return NextResponse.json({
          success: true,
          testMode: true,
          warning: "No recipients found - agent has no reports_to, schedule has no created_by, and workspace has no admins/owner",
          schedule: { id: schedule.id, name: schedule.name },
          execution: { id: execution.id, status: "completed" },
          result: { textLength: result.text?.length, durationMs: result.durationMs },
          messaging: {
            recipientIds: [],
            source: 'none',
            results: [],
          },
          debug: {
            reportsTo: resolvedAgent.legacyAgent?.reports_to || [],
            createdBy: schedule.created_by,
            workspaceId,
          },
        })
      }

      const content = formatTaskCompletionMessage({
        scheduleName: schedule.name,
        taskPrompt: schedule.task_prompt,
        status: 'completed',
        resultText: result.text,
        durationMs: result.durationMs,
      })

      const messageResults = []
      for (const recipientId of recipientIds) {
        console.log(`[Cron] TEST: Sending message to recipient ${recipientId}`)
        const msgResult = await sendAgentMessage({
          agentId: resolvedAgent.legacyAgent?.id,
          agentProfileId: resolvedAgent.agentProfileId ?? undefined,
          aiAgentId: schedule.agent_id,
          recipientProfileId: recipientId,
          workspaceId,
          content,
          supabase,
        })
        console.log(`[Cron] TEST: Message result for ${recipientId}:`, JSON.stringify(msgResult))
        messageResults.push({ recipientId, ...msgResult })
      }

      return NextResponse.json({
        success: true,
        testMode: true,
        schedule: { id: schedule.id, name: schedule.name },
        execution: { id: execution.id, status: "completed" },
        result: { textLength: result.text?.length, durationMs: result.durationMs },
        messaging: {
          recipientIds,
          source: recipientSource,
          results: messageResults,
        },
      })
    } catch (taskError) {
      const errorMessage = taskError instanceof Error ? taskError.message : String(taskError)
      console.error(`[Cron] TEST: Task failed:`, errorMessage)

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
        testMode: true,
        schedule: { id: schedule.id, name: schedule.name },
        execution: { id: execution.id, status: "failed" },
        error: errorMessage,
      })
    }
  }

  try {
    console.log("[Cron] Starting schedule check...")

    // Process due schedules
    const scheduleResult = await processAgentSchedules()
    console.log(
      `[Cron] Schedules: processed=${scheduleResult.processed}, errors=${scheduleResult.errors}`
    )

    // Process approved executions
    const approvalResult = await processApprovedExecutions()
    console.log(
      `[Cron] Approved: processed=${approvalResult.processed}, errors=${approvalResult.errors}`
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      schedules: scheduleResult,
      approvals: approvalResult,
    })
  } catch (error) {
    console.error("[Cron] Error processing schedules:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
