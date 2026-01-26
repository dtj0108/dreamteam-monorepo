import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAgentById } from '@/lib/agent-runtime'
import { sendScheduledTaskNotification } from '@/lib/agent-messaging'

// POST /api/admin/scheduled-tasks/[executionId]/approve - Approve and run a pending execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  // #region agent log
  const fs = require('fs')
  const logPath = '/Users/drewbaskin/dreamteam-monorepo-1/.cursor/debug.log'
  const log = (msg: string, data: Record<string, unknown>) => {
    const entry = JSON.stringify({ location: 'approve-route.ts', message: msg, data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'admin-path' }) + '\n'
    try { fs.appendFileSync(logPath, entry) } catch {}
    console.log(`[DEBUG] ${msg}:`, JSON.stringify(data))
  }
  log('Approve route called', { path: request.url })
  // #endregion

  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { executionId } = await params
    const supabase = createAdminClient()
    const now = new Date()

    // Get execution (include provider for correct AI SDK selection)
    const { data: execution, error: execError } = await supabase
      .from('agent_schedule_executions')
      .select(`
        *,
        schedule:agent_schedules(id, name, task_prompt, created_by, workspace_id),
        agent:ai_agents(id, name, model, provider, system_prompt, is_enabled)
      `)
      .eq('id', executionId)
      .single()

    log('Fetched execution', { 
      executionId, 
      hasExecution: !!execution, 
      error: execError?.message,
      agentProvider: execution?.agent?.provider,
      agentModel: execution?.agent?.model
    })

    if (execError || !execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    if (execution.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot approve execution with status: ${execution.status}` },
        { status: 400 }
      )
    }

    // Check if agent is enabled
    if (!execution.agent?.is_enabled) {
      return NextResponse.json(
        { error: 'Cannot approve: Agent is disabled' },
        { status: 400 }
      )
    }

    // Update to approved/running
    const { data: updatedExecution, error: updateError } = await supabase
      .from('agent_schedule_executions')
      .update({
        status: 'running',
        approved_by: user!.id,
        approved_at: now.toISOString(),
        started_at: now.toISOString()
      })
      .eq('id', executionId)
      .select()
      .single()

    if (updateError) {
      console.error('Approve execution error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Run the agent after approval
    const startTime = Date.now()

    try {
      const taskPrompt = execution.schedule?.task_prompt || 'Execute scheduled task'
      log('About to call runAgentById', { 
        agentId: execution.agent_id, 
        agentProvider: execution.agent?.provider,
        agentModel: execution.agent?.model,
        taskPromptPreview: taskPrompt.substring(0, 100)
      })
      const result = await runAgentById(execution.agent_id, taskPrompt)
      log('runAgentById returned', { success: result.success, error: result.error })
      const duration = Date.now() - startTime

      await supabase
        .from('agent_schedule_executions')
        .update({
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          result: {
            message: result.result,
            todos: result.todos,
          },
          tool_calls: result.toolCalls,
          tokens_input: result.usage.inputTokens,
          tokens_output: result.usage.outputTokens,
          error_message: result.error || null,
          duration_ms: duration,
        })
        .eq('id', executionId)

      // Send completion notification
      const schedule = execution.schedule as {
        id: string
        name: string
        task_prompt: string
        created_by: string | null
        workspace_id: string | null
      } | null

      if (schedule?.workspace_id) {
        try {
          await sendScheduledTaskNotification({
            executionId,
            aiAgentId: execution.agent_id,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            taskPrompt: schedule.task_prompt,
            status: result.success ? 'completed' : 'failed',
            resultText: result.success ? result.result : (result.error || 'Unknown error'),
            durationMs: duration,
            workspaceId: schedule.workspace_id,
            scheduleCreatedBy: schedule.created_by,
            supabase,
          })
        } catch (notifyError) {
          console.error('[approve] Failed to send notification:', notifyError)
          // Don't fail the approval if notification fails
        }
      }

      await logAdminAction(
        user!.id,
        'schedule_execution_approved',
        'agent_schedule_execution',
        executionId,
        { schedule_id: execution.schedule_id, agent_id: execution.agent_id },
        request
      )

      return NextResponse.json({
        execution: {
          ...updatedExecution,
          status: result.success ? 'completed' : 'failed',
          result: { message: result.result, todos: result.todos },
        },
        message: result.success ? 'Execution approved and completed' : 'Execution approved but failed',
        usage: result.usage,
      })
    } catch (execError) {
      const duration = Date.now() - startTime
      log('runAgentById threw error', { 
        error: execError instanceof Error ? execError.message : String(execError),
        errorName: execError instanceof Error ? execError.name : 'unknown',
        duration
      })

      await supabase
        .from('agent_schedule_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: execError instanceof Error ? execError.message : 'Unknown error',
          duration_ms: duration,
        })
        .eq('id', executionId)

      // Send failure notification
      const schedule = execution.schedule as {
        id: string
        name: string
        task_prompt: string
        created_by: string | null
        workspace_id: string | null
      } | null

      if (schedule?.workspace_id) {
        try {
          await sendScheduledTaskNotification({
            executionId,
            aiAgentId: execution.agent_id,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            taskPrompt: schedule.task_prompt,
            status: 'failed',
            resultText: execError instanceof Error ? execError.message : 'Unknown error',
            durationMs: duration,
            workspaceId: schedule.workspace_id,
            scheduleCreatedBy: schedule.created_by,
            supabase,
          })
        } catch (notifyError) {
          console.error('[approve] Failed to send failure notification:', notifyError)
        }
      }

      await logAdminAction(
        user!.id,
        'schedule_execution_approved',
        'agent_schedule_execution',
        executionId,
        { schedule_id: execution.schedule_id, agent_id: execution.agent_id, error: 'Execution failed' },
        request
      )

      return NextResponse.json({
        execution: { ...updatedExecution, status: 'failed' },
        message: 'Execution approved but failed',
        error: execError instanceof Error ? execError.message : 'Unknown error',
      }, { status: 500 })
    }
  } catch (err) {
    console.error('Approve execution error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
