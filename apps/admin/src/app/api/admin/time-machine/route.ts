import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNextRunTime, getAllRunsInRange } from '@/lib/cron-utils'

// Agent server URL for dispatching executions
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3002'

interface Schedule {
  id: string
  name: string
  agent_id: string
  cron_expression: string
  timezone: string
  next_run_at: string | null
  last_run_at: string | null
  is_enabled: boolean
  workspace_id: string | null
  agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

/**
 * GET /api/admin/time-machine - Preview schedules and their due status
 * 
 * Query params:
 * - simulated_time: ISO datetime to check which schedules would be due
 * - include_disabled: include disabled schedules in response
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const simulatedTimeParam = searchParams.get('simulated_time')
    const includeDisabled = searchParams.get('include_disabled') === 'true'

    // Parse simulated time or use current time
    const checkTime = simulatedTimeParam 
      ? new Date(simulatedTimeParam) 
      : new Date()

    if (simulatedTimeParam && isNaN(checkTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid simulated_time format. Use ISO 8601.' },
        { status: 400 }
      )
    }

    // Query schedules
    let query = supabase
      .from('agent_schedules')
      .select(`
        id,
        name,
        agent_id,
        cron_expression,
        timezone,
        next_run_at,
        last_run_at,
        is_enabled,
        workspace_id,
        is_template,
        agent:ai_agents(id, name, avatar_url)
      `)
      .eq('is_template', false) // Exclude templates
      .order('next_run_at', { ascending: true, nullsFirst: false })

    if (!includeDisabled) {
      query = query.eq('is_enabled', true)
    }

    const { data: schedules, error: dbError } = await query

    if (dbError) {
      console.error('[Time Machine] Query error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Categorize schedules based on their due status
    const now = new Date()
    const categorized = (schedules || []).map((schedule: Schedule) => {
      const nextRun = schedule.next_run_at ? new Date(schedule.next_run_at) : null
      
      let status: 'due' | 'overdue' | 'pending' | 'no_schedule' = 'pending'
      let wouldBeDueAt = false

      if (!nextRun) {
        status = 'no_schedule'
      } else if (nextRun <= now) {
        status = 'overdue'
        wouldBeDueAt = true
      } else if (nextRun <= checkTime) {
        status = 'due'
        wouldBeDueAt = true
      }

      return {
        ...schedule,
        status,
        would_be_due_at_simulated_time: wouldBeDueAt,
        time_until_due_ms: nextRun ? nextRun.getTime() - now.getTime() : null,
      }
    })

    // Count by status
    const dueCount = categorized.filter(s => s.would_be_due_at_simulated_time).length
    const overdueCount = categorized.filter(s => s.status === 'overdue').length

    return NextResponse.json({
      schedules: categorized,
      simulated_time: checkTime.toISOString(),
      current_time: now.toISOString(),
      summary: {
        total: categorized.length,
        due_at_simulated_time: dueCount,
        currently_overdue: overdueCount,
        pending: categorized.filter(s => s.status === 'pending').length,
      }
    })
  } catch (err) {
    console.error('[Time Machine] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/time-machine - Execute time travel actions
 * 
 * Body:
 * {
 *   action: "make_due" | "set_time" | "reset" | "trigger_cron" | "simulate",
 *   schedule_ids?: string[],
 *   target_time?: string,       // For set_time action
 *   start_time?: string,        // For simulate action
 *   end_time?: string,          // For simulate action
 *   use_simulated_time?: boolean // For simulate action - when true (default), agents see the simulated run time
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const supabase = createAdminClient()
    const body = await request.json()
    const { action, schedule_ids, target_time, start_time, end_time, use_simulated_time } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Handle simulate action separately (more complex flow)
    if (action === 'simulate') {
      // Default to true - agents see simulated time unless explicitly disabled
      const useSimTime = use_simulated_time !== false
      return handleSimulateAction(request, user!, supabase, schedule_ids, start_time, end_time, useSimTime)
    }

    // Handle trigger_cron action (doesn't require schedule_ids)
    if (action === 'trigger_cron') {
      const cronSecret = process.env.CRON_SECRET
      
      // Call the cron endpoint
      const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/check-schedules`
      
      try {
        const cronResponse = await fetch(cronUrl, {
          method: 'GET',
          headers: cronSecret ? {
            'Authorization': `Bearer ${cronSecret}`
          } : {}
        })

        const cronResult = await cronResponse.json()

        await logAdminAction(
          user!.id,
          'time_machine_trigger_cron',
          'cron',
          null,
          { result: cronResult },
          request
        )

        return NextResponse.json({
          success: true,
          action: 'trigger_cron',
          cron_result: cronResult
        })
      } catch (cronError) {
        console.error('[Time Machine] Cron trigger error:', cronError)
        return NextResponse.json(
          { error: 'Failed to trigger cron check', details: cronError instanceof Error ? cronError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Other actions require schedule_ids
    if (!schedule_ids || !Array.isArray(schedule_ids) || schedule_ids.length === 0) {
      return NextResponse.json({ error: 'schedule_ids array is required' }, { status: 400 })
    }

    // Fetch current schedules for logging/rollback
    const { data: currentSchedules, error: fetchError } = await supabase
      .from('agent_schedules')
      .select('id, name, next_run_at, cron_expression, timezone')
      .in('id', schedule_ids)

    if (fetchError) {
      console.error('[Time Machine] Fetch schedules error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!currentSchedules || currentSchedules.length === 0) {
      return NextResponse.json({ error: 'No schedules found with provided IDs' }, { status: 404 })
    }

    const results: Array<{
      id: string
      name: string
      previous_next_run_at: string | null
      new_next_run_at: string | null
      success: boolean
      error?: string
    }> = []

    switch (action) {
      case 'make_due': {
        // Set next_run_at to 1 minute ago to make immediately due
        const dueTime = new Date(Date.now() - 60000).toISOString()

        for (const schedule of currentSchedules) {
          const { error: updateError } = await supabase
            .from('agent_schedules')
            .update({ next_run_at: dueTime })
            .eq('id', schedule.id)

          results.push({
            id: schedule.id,
            name: schedule.name,
            previous_next_run_at: schedule.next_run_at,
            new_next_run_at: dueTime,
            success: !updateError,
            error: updateError?.message
          })
        }
        break
      }

      case 'set_time': {
        if (!target_time) {
          return NextResponse.json({ error: 'target_time is required for set_time action' }, { status: 400 })
        }

        const targetDate = new Date(target_time)
        if (isNaN(targetDate.getTime())) {
          return NextResponse.json({ error: 'Invalid target_time format' }, { status: 400 })
        }

        for (const schedule of currentSchedules) {
          const { error: updateError } = await supabase
            .from('agent_schedules')
            .update({ next_run_at: targetDate.toISOString() })
            .eq('id', schedule.id)

          results.push({
            id: schedule.id,
            name: schedule.name,
            previous_next_run_at: schedule.next_run_at,
            new_next_run_at: targetDate.toISOString(),
            success: !updateError,
            error: updateError?.message
          })
        }
        break
      }

      case 'reset': {
        // Recalculate next_run_at from cron expression
        for (const schedule of currentSchedules) {
          try {
            const nextRun = getNextRunTime(
              schedule.cron_expression,
              schedule.timezone || 'UTC'
            )

            const { error: updateError } = await supabase
              .from('agent_schedules')
              .update({ next_run_at: nextRun.toISOString() })
              .eq('id', schedule.id)

            results.push({
              id: schedule.id,
              name: schedule.name,
              previous_next_run_at: schedule.next_run_at,
              new_next_run_at: nextRun.toISOString(),
              success: !updateError,
              error: updateError?.message
            })
          } catch (cronError) {
            results.push({
              id: schedule.id,
              name: schedule.name,
              previous_next_run_at: schedule.next_run_at,
              new_next_run_at: null,
              success: false,
              error: cronError instanceof Error ? cronError.message : 'Failed to parse cron expression'
            })
          }
        }
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // Log the action
    await logAdminAction(
      user!.id,
      `time_machine_${action}`,
      'agent_schedules',
      null,
      {
        schedule_ids,
        target_time,
        results
      },
      request
    )

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failCount === 0,
      action,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    })
  } catch (err) {
    console.error('[Time Machine] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/time-machine - Batch update next_run_at values
 * 
 * Body:
 * {
 *   schedules: Array<{ id: string, next_run_at: string }>
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const supabase = createAdminClient()
    const body = await request.json()
    const { schedules } = body

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ error: 'schedules array is required' }, { status: 400 })
    }

    // Validate all entries
    for (const entry of schedules) {
      if (!entry.id || !entry.next_run_at) {
        return NextResponse.json(
          { error: 'Each schedule entry must have id and next_run_at' },
          { status: 400 }
        )
      }
      if (isNaN(new Date(entry.next_run_at).getTime())) {
        return NextResponse.json(
          { error: `Invalid next_run_at for schedule ${entry.id}` },
          { status: 400 }
        )
      }
    }

    const results: Array<{
      id: string
      success: boolean
      error?: string
    }> = []

    // Update each schedule
    for (const entry of schedules) {
      const { error: updateError } = await supabase
        .from('agent_schedules')
        .update({ next_run_at: entry.next_run_at })
        .eq('id', entry.id)

      results.push({
        id: entry.id,
        success: !updateError,
        error: updateError?.message
      })
    }

    // Log the batch update
    await logAdminAction(
      user!.id,
      'time_machine_batch_update',
      'agent_schedules',
      null,
      { schedules, results },
      request
    )

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: successCount === results.length,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount
      }
    })
  } catch (err) {
    console.error('[Time Machine] PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle the simulate action - batch run all schedules that would occur in a time range
 */
async function handleSimulateAction(
  request: NextRequest,
  user: { id: string },
  supabase: ReturnType<typeof createAdminClient>,
  scheduleIds: string[] | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  useSimulatedTime: boolean = true // When true, agents see the simulated run time instead of real time
) {
  // Validate inputs
  if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
    return NextResponse.json({ error: 'schedule_ids array is required for simulate action' }, { status: 400 })
  }

  if (!startTime || !endTime) {
    return NextResponse.json({ error: 'start_time and end_time are required for simulate action' }, { status: 400 })
  }

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start_time or end_time format' }, { status: 400 })
  }

  if (start >= end) {
    return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
  }

  // Limit simulation range to 7 days max for safety
  const maxRangeMs = 7 * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > maxRangeMs) {
    return NextResponse.json({ error: 'Simulation range cannot exceed 7 days' }, { status: 400 })
  }

  // Fetch schedules
  const { data: schedules, error: fetchError } = await supabase
    .from('agent_schedules')
    .select('id, name, agent_id, cron_expression, timezone, workspace_id, task_prompt, output_config')
    .in('id', scheduleIds)
    .eq('is_template', false)

  if (fetchError) {
    console.error('[Time Machine] Fetch schedules error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ error: 'No schedules found with provided IDs' }, { status: 404 })
  }

  // Calculate all runs for each schedule within the time range
  interface ScheduledRun {
    scheduleId: string
    scheduleName: string
    agentId: string
    workspaceId: string | null
    taskPrompt: string
    outputConfig: Record<string, unknown> | null
    runTime: Date
  }

  const allRuns: ScheduledRun[] = []

  for (const schedule of schedules) {
    try {
      const runs = getAllRunsInRange(
        schedule.cron_expression,
        schedule.timezone || 'UTC',
        start,
        end,
        50 // Max 50 runs per schedule
      )

      for (const runTime of runs) {
        allRuns.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          agentId: schedule.agent_id,
          workspaceId: schedule.workspace_id,
          taskPrompt: schedule.task_prompt,
          outputConfig: schedule.output_config,
          runTime,
        })
      }
    } catch (cronError) {
      console.error(`[Time Machine] Error calculating runs for schedule ${schedule.id}:`, cronError)
    }
  }

  // Sort all runs chronologically
  allRuns.sort((a, b) => a.runTime.getTime() - b.runTime.getTime())

  console.log(`[Time Machine] Simulation: ${allRuns.length} total runs across ${schedules.length} schedules`)

  // Execute each run in order
  const executionResults: Array<{
    scheduleId: string
    scheduleName: string
    runTime: string
    executionId: string | null
    status: 'dispatched' | 'failed' | 'skipped'
    error?: string
  }> = []

  const cronSecret = process.env.CRON_SECRET

  for (const run of allRuns) {
    try {
      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('agent_schedule_executions')
        .insert({
          schedule_id: run.scheduleId,
          agent_id: run.agentId,
          scheduled_for: run.runTime.toISOString(),
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (execError || !execution) {
        executionResults.push({
          scheduleId: run.scheduleId,
          scheduleName: run.scheduleName,
          runTime: run.runTime.toISOString(),
          executionId: null,
          status: 'failed',
          error: execError?.message || 'Failed to create execution record'
        })
        continue
      }

      // Dispatch to agent server
      try {
        const response = await fetch(`${AGENT_SERVER_URL}/scheduled-execution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cronSecret ? { 'Authorization': `Bearer ${cronSecret}` } : {})
          },
          body: JSON.stringify({
            executionId: execution.id,
            agentId: run.agentId,
            taskPrompt: run.taskPrompt,
            workspaceId: run.workspaceId,
            outputConfig: run.outputConfig,
            // Pass simulated time so agent sees the "would have run at" time
            ...(useSimulatedTime ? { simulatedTime: run.runTime.toISOString() } : {}),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          executionResults.push({
            scheduleId: run.scheduleId,
            scheduleName: run.scheduleName,
            runTime: run.runTime.toISOString(),
            executionId: execution.id,
            status: 'failed',
            error: errorData.error || `HTTP ${response.status}`
          })
        } else {
          executionResults.push({
            scheduleId: run.scheduleId,
            scheduleName: run.scheduleName,
            runTime: run.runTime.toISOString(),
            executionId: execution.id,
            status: 'dispatched'
          })
        }
      } catch (dispatchError) {
        executionResults.push({
          scheduleId: run.scheduleId,
          scheduleName: run.scheduleName,
          runTime: run.runTime.toISOString(),
          executionId: execution.id,
          status: 'failed',
          error: dispatchError instanceof Error ? dispatchError.message : 'Dispatch failed'
        })
      }
    } catch (runError) {
      console.error(`[Time Machine] Error executing run:`, runError)
      executionResults.push({
        scheduleId: run.scheduleId,
        scheduleName: run.scheduleName,
        runTime: run.runTime.toISOString(),
        executionId: null,
        status: 'failed',
        error: runError instanceof Error ? runError.message : 'Unknown error'
      })
    }
  }

  // Log the simulation
  await logAdminAction(
    user.id,
    'time_machine_simulate',
    'agent_schedules',
    null,
    {
      schedule_ids: scheduleIds,
      start_time: startTime,
      end_time: endTime,
      total_runs: allRuns.length,
      dispatched: executionResults.filter(r => r.status === 'dispatched').length,
      failed: executionResults.filter(r => r.status === 'failed').length,
    },
    request
  )

  const dispatchedCount = executionResults.filter(r => r.status === 'dispatched').length
  const failedCount = executionResults.filter(r => r.status === 'failed').length

  return NextResponse.json({
    success: failedCount === 0,
    action: 'simulate',
    simulation: {
      start_time: startTime,
      end_time: endTime,
      schedules_included: schedules.length,
      total_runs: allRuns.length,
    },
    results: executionResults,
    summary: {
      total: executionResults.length,
      dispatched: dispatchedCount,
      failed: failedCount,
    }
  })
}
