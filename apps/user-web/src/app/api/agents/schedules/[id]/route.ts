import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { getNextRunTime, isValidCron } from "@/lib/cron-utils"
import { mapToolNamesToCategories } from "@/lib/agent-tool-mapping"
import { resolveWorkspaceAgent } from "@/lib/workspace-agent"
import { getWorkspaceDeployment, type DeployedTeamConfig } from "@dreamteam/database"

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
        agent:ai_agents(id, name, avatar_url, description, model, tier_required)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workspaceId = schedule.workspace_id as string | null
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Schedule missing workspace context" },
        { status: 400 }
      )
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to view this schedule" },
        { status: 403 }
      )
    }

    const deployment = await getWorkspaceDeployment(workspaceId)
    let hiredAgentIds: string[] = []
    if (deployment) {
      const activeConfig = deployment.active_config as DeployedTeamConfig
      hiredAgentIds = (activeConfig?.agents || [])
        .filter((a) => a.is_enabled)
        .map((a) => a.id)
    } else {
      const { data: hiredAgents } = await supabase
        .from("agents")
        .select("ai_agent_id")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .not("ai_agent_id", "is", null)
      hiredAgentIds = (hiredAgents || []).map((a: { ai_agent_id: string }) => a.ai_agent_id)
    }

    const scheduleWithPlan = {
      ...schedule,
      agent_in_plan: hiredAgentIds.includes(schedule.agent_id),
    }

    return NextResponse.json({ schedule: scheduleWithPlan })
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

    // Get the schedule with agent info (including provider and model)
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select(`
        *,
        ai_agent:ai_agents(id, name, system_prompt, provider, model)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workspaceId = schedule.workspace_id as string | null
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Schedule missing workspace context" },
        { status: 400 }
      )
    }

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

    const resolvedAgent = await resolveWorkspaceAgent({
      workspaceId,
      aiAgentId: schedule.agent_id,
      supabase,
    })

    if (!resolvedAgent.isEnabled) {
      return NextResponse.json(
        { error: "Agent not enabled in this workspace" },
        { status: 404 }
      )
    }

    // Fetch tools from ai_agent_tools junction table (not agents.tools column which may be empty)
    const { data: agentTools, error: toolsError } = await supabase
      .from("ai_agent_tools")
      .select("tool:agent_tools(name)")
      .eq("agent_id", schedule.agent_id)

    console.log("[ScheduleRun] Tool loading debug:", {
      scheduleAgentId: schedule.agent_id,
      agentToolsRaw: agentTools,
      toolsError: toolsError?.message,
      toolsCount: agentTools?.length ?? 0,
    })

    const rawToolNames = (agentTools
      ?.map((t: { tool: { name: string } | null }) => t.tool?.name)
      .filter(Boolean) as string[]) || []

    const toolCategories = mapToolNamesToCategories(rawToolNames)

    console.log("[ScheduleRun] Raw tool names:", rawToolNames.slice(0, 10))
    console.log("[ScheduleRun] Final tool categories:", toolCategories)

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

    const scheduleAgentRaw = schedule.ai_agent as {
      id?: string
      name?: string
      system_prompt?: string
      provider?: string
      model?: string
    } | Array<{
      id?: string
      name?: string
      system_prompt?: string
      provider?: string
      model?: string
    }> | null
    const scheduleAgent = Array.isArray(scheduleAgentRaw) ? scheduleAgentRaw[0] : scheduleAgentRaw

    // Execute the task
    try {
      const systemPrompt =
        resolvedAgent.legacyAgent?.system_prompt ||
        resolvedAgent.deploymentAgent?.system_prompt ||
        scheduleAgent?.system_prompt ||
        "You are a helpful AI assistant."

      // Get provider and model from AI agent config
      let provider = (resolvedAgent.deploymentAgent?.provider as "anthropic" | "xai" | undefined) ||
        (scheduleAgent?.provider as "anthropic" | "xai" | undefined)
      let model = resolvedAgent.deploymentAgent?.model || scheduleAgent?.model || undefined

      if (!provider || !model) {
        const { data: aiAgent } = await supabase
          .from("ai_agents")
          .select("provider, model, system_prompt")
          .eq("id", schedule.agent_id)
          .single()

        provider = provider || (aiAgent?.provider as "anthropic" | "xai" | undefined) || "anthropic"
        model = model || aiAgent?.model || undefined
      }

      // Infer provider from model name to ensure consistency
      // This handles cases where the stored provider doesn't match the model type
      if (model) {
        const modelLower = model.toLowerCase()
        if (modelLower.includes("grok")) {
          provider = "xai"
        } else if (modelLower.includes("claude") || modelLower === "sonnet" || modelLower === "opus" || modelLower === "haiku") {
          provider = "anthropic"
        }
      }

      console.log("[ScheduleRun] TOOLS BEING PASSED:", {
        toolCategoriesCount: toolCategories.length,
        toolCategories,
        scheduleAgentId: schedule.agent_id,
      })

      const result = await executeAgentTask({
        taskPrompt: schedule.task_prompt,
        systemPrompt,
        tools: toolCategories,  // Use mapped category names that buildAgentTools expects
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
          agentId: resolvedAgent.legacyAgent?.id,
          agentProfileId: resolvedAgent.agentProfileId ?? undefined,
          aiAgentId: schedule.agent_id,
          recipientProfileId: recipientId,
          workspaceId,
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
      .select("id, agent_id, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workspaceId = schedule.workspace_id as string | null
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Schedule missing workspace context" },
        { status: 400 }
      )
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to update this schedule" },
        { status: 403 }
      )
    }

    if (is_enabled) {
      const resolvedAgent = await resolveWorkspaceAgent({
        workspaceId,
        aiAgentId: schedule.agent_id,
        supabase,
      })

      if (!resolvedAgent.isEnabled) {
        return NextResponse.json(
          { error: "Agent not available in current plan" },
          { status: 400 }
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

// PUT /api/agents/schedules/[id] - Update a schedule
export async function PUT(
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
    const {
      name,
      description,
      cron_expression,
      timezone,
      task_prompt,
      requires_approval,
    } = body

    const supabase = createAdminClient()

    // Get the schedule
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select("id, agent_id, created_by, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workspaceId = schedule.workspace_id as string | null
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Schedule missing workspace context" },
        { status: 400 }
      )
    }

    // Check if user is creator or admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    const isCreatorOrAdmin =
      schedule.created_by === session.id ||
      membership?.role === "admin" ||
      membership?.role === "owner"

    if (!isCreatorOrAdmin) {
      return NextResponse.json(
        { error: "Not authorized to update this schedule" },
        { status: 403 }
      )
    }

    // Validate cron expression if provided
    if (cron_expression && !isValidCron(cron_expression)) {
      return NextResponse.json(
        { error: "Invalid cron expression" },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (cron_expression !== undefined) {
      updateData.cron_expression = cron_expression
      // Recalculate next run time
      updateData.next_run_at = getNextRunTime(cron_expression, timezone || "UTC").toISOString()
    }
    if (timezone !== undefined) updateData.timezone = timezone
    if (task_prompt !== undefined) updateData.task_prompt = task_prompt.trim()
    if (requires_approval !== undefined) updateData.requires_approval = requires_approval

    // Update the schedule
    const { data: updated, error: updateError } = await supabase
      .from("agent_schedules")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        agent:ai_agents(id, name, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error("Error updating schedule:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ schedule: updated })
  } catch (error) {
    console.error("Error in PUT /api/agents/schedules/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/agents/schedules/[id] - Delete a schedule
export async function DELETE(
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

    // Get the schedule
    const { data: schedule, error: fetchError } = await supabase
      .from("agent_schedules")
      .select("id, agent_id, created_by, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workspaceId = schedule.workspace_id as string | null
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Schedule missing workspace context" },
        { status: 400 }
      )
    }

    // Check if user is creator or admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    const isCreatorOrAdmin =
      schedule.created_by === session.id ||
      membership?.role === "admin" ||
      membership?.role === "owner"

    if (!isCreatorOrAdmin) {
      return NextResponse.json(
        { error: "Not authorized to delete this schedule" },
        { status: 403 }
      )
    }

    // Delete the schedule
    const { error: deleteError } = await supabase
      .from("agent_schedules")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting schedule:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/agents/schedules/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
