import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendScheduledTaskNotification } from '@/lib/agent-messaging'

/**
 * POST /api/admin/scheduled-tasks/[executionId]/notify
 *
 * Called by agent-server after scheduled execution completes to send DM notifications.
 * Auth: Bearer CRON_SECRET (same secret agent-server uses for other admin API calls)
 *
 * Body: {
 *   status: 'completed' | 'failed',
 *   resultText: string,
 *   durationMs: number
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    // Verify CRON_SECRET authentication
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (!cronSecret) {
      console.error('[notify] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('[notify] Unauthorized - invalid cron secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { executionId } = await params
    const body = await request.json()
    const { status, resultText, durationMs } = body

    if (!status || !resultText) {
      return NextResponse.json(
        { error: 'Missing required fields: status, resultText' },
        { status: 400 }
      )
    }

    if (status !== 'completed' && status !== 'failed') {
      return NextResponse.json(
        { error: 'status must be "completed" or "failed"' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch execution with schedule and agent details
    const { data: execution, error: execError } = await supabase
      .from('agent_schedule_executions')
      .select(`
        *,
        schedule:agent_schedules(id, name, task_prompt, created_by, workspace_id),
        agent:ai_agents(id, name)
      `)
      .eq('id', executionId)
      .single()

    if (execError || !execution) {
      console.error('[notify] Execution not found:', execError)
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    const schedule = execution.schedule as {
      id: string
      name: string
      task_prompt: string
      created_by: string | null
      workspace_id: string | null
    } | null

    if (!schedule?.workspace_id) {
      console.log('[notify] No workspace_id on schedule, skipping notification')
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No workspace_id configured on schedule',
      })
    }

    // Send the notification
    console.log(`[notify] Sending notification for execution ${executionId}`)
    const result = await sendScheduledTaskNotification({
      executionId,
      aiAgentId: execution.agent_id,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      taskPrompt: schedule.task_prompt,
      status,
      resultText,
      durationMs,
      workspaceId: schedule.workspace_id,
      scheduleCreatedBy: schedule.created_by,
      supabase,
    })

    console.log(`[notify] Notification result: ${result.success ? 'success' : 'failed'}, recipients: ${result.recipientCount}`)

    return NextResponse.json({
      success: result.success,
      recipientCount: result.recipientCount,
      errors: result.errors,
    })
  } catch (err) {
    console.error('[notify] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
