import { NextRequest } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllRunsInRange } from '@/lib/cron-utils'

// Agent server URL for dispatching executions
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3002'

interface ScheduledRun {
  scheduleId: string
  scheduleName: string
  agentId: string
  workspaceId: string | null
  taskPrompt: string
  outputConfig: Record<string, unknown> | null
  profileId: string | null
  runTime: Date
}

interface StreamEvent {
  type: 'init' | 'progress' | 'complete' | 'error'
  current?: number
  total?: number
  durationMs?: number
  result?: {
    scheduleId: string
    scheduleName: string
    runTime: string
    status: 'dispatched' | 'failed'
    executionId: string | null
    error?: string
  }
  summary?: {
    total: number
    dispatched: number
    failed: number
  }
  error?: string
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: StreamEvent
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
}

/**
 * POST /api/admin/time-machine/stream
 *
 * Streams simulation progress via Server-Sent Events (SSE).
 * Each execution completion triggers a progress event.
 */
export async function POST(request: NextRequest) {
  // Auth check
  const { error: authError, user } = await requireSuperadmin()
  if (authError) {
    return authError
  }

  let body: {
    schedule_ids?: string[]
    start_time?: string
    end_time?: string
    use_simulated_time?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { schedule_ids, start_time, end_time, use_simulated_time = true } = body

  // Validate inputs
  if (!schedule_ids || !Array.isArray(schedule_ids) || schedule_ids.length === 0) {
    return new Response(
      JSON.stringify({ error: 'schedule_ids array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!start_time || !end_time) {
    return new Response(
      JSON.stringify({ error: 'start_time and end_time are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const start = new Date(start_time)
  const end = new Date(end_time)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return new Response(
      JSON.stringify({ error: 'Invalid start_time or end_time format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (start >= end) {
    return new Response(
      JSON.stringify({ error: 'start_time must be before end_time' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Limit simulation range to 7 days max for safety
  const maxRangeMs = 7 * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > maxRangeMs) {
    return new Response(
      JSON.stringify({ error: 'Simulation range cannot exceed 7 days' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createAdminClient()

  // Fetch schedules
  const { data: schedules, error: fetchError } = await supabase
    .from('agent_schedules')
    .select('id, name, agent_id, cron_expression, timezone, workspace_id, task_prompt, output_config, created_by')
    .in('id', schedule_ids)
    .eq('is_template', false)

  if (fetchError) {
    console.error('[Time Machine Stream] Fetch schedules error:', fetchError)
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!schedules || schedules.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No schedules found with provided IDs' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const workspaceOwnerMap = new Map<string, string>()
  const workspaceIds = Array.from(
    new Set(schedules.map((schedule) => schedule.workspace_id).filter(Boolean))
  ) as string[]

  if (workspaceIds.length > 0) {
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .in('id', workspaceIds)

    if (workspaceError) {
      console.warn('[Time Machine Stream] Failed to load workspace owners for profile fallback:', workspaceError)
    } else {
      for (const workspace of workspaces || []) {
        if (workspace?.id && workspace?.owner_id) {
          workspaceOwnerMap.set(workspace.id, workspace.owner_id)
        }
      }
    }
  }

  // Calculate all runs for each schedule within the time range
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
        const fallbackProfileId = schedule.workspace_id
          ? workspaceOwnerMap.get(schedule.workspace_id)
          : null

        allRuns.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          agentId: schedule.agent_id,
          workspaceId: schedule.workspace_id,
          taskPrompt: schedule.task_prompt,
          outputConfig: schedule.output_config,
          profileId: schedule.created_by || fallbackProfileId || null,
          runTime,
        })
      }
    } catch (cronError) {
      console.error(`[Time Machine Stream] Error calculating runs for schedule ${schedule.id}:`, cronError)
    }
  }

  // Sort all runs chronologically
  allRuns.sort((a, b) => a.runTime.getTime() - b.runTime.getTime())

  console.log(`[Time Machine Stream] Simulation: ${allRuns.length} total runs across ${schedules.length} schedules`)

  const cronSecret = process.env.CRON_SECRET
  const encoder = new TextEncoder()

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial event with total count
      sendEvent(controller, encoder, {
        type: 'init',
        total: allRuns.length
      })

      let dispatchedCount = 0
      let failedCount = 0

      // Process each run and stream progress
      for (let i = 0; i < allRuns.length; i++) {
        const run = allRuns[i]
        const runStartTime = Date.now()

        let result: StreamEvent['result']

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
            failedCount++
            result = {
              scheduleId: run.scheduleId,
              scheduleName: run.scheduleName,
              runTime: run.runTime.toISOString(),
              executionId: null,
              status: 'failed',
              error: execError?.message || 'Failed to create execution record'
            }
          } else {
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
                  ...(run.profileId ? { profileId: run.profileId } : {}),
                  ...(use_simulated_time ? { simulatedTime: run.runTime.toISOString() } : {}),
                }),
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                failedCount++
                result = {
                  scheduleId: run.scheduleId,
                  scheduleName: run.scheduleName,
                  runTime: run.runTime.toISOString(),
                  executionId: execution.id,
                  status: 'failed',
                  error: errorData.error || `HTTP ${response.status}`
                }
              } else {
                dispatchedCount++
                result = {
                  scheduleId: run.scheduleId,
                  scheduleName: run.scheduleName,
                  runTime: run.runTime.toISOString(),
                  executionId: execution.id,
                  status: 'dispatched'
                }
              }
            } catch (dispatchError) {
              failedCount++
              result = {
                scheduleId: run.scheduleId,
                scheduleName: run.scheduleName,
                runTime: run.runTime.toISOString(),
                executionId: execution.id,
                status: 'failed',
                error: dispatchError instanceof Error ? dispatchError.message : 'Dispatch failed'
              }
            }
          }
        } catch (runError) {
          console.error(`[Time Machine Stream] Error executing run:`, runError)
          failedCount++
          result = {
            scheduleId: run.scheduleId,
            scheduleName: run.scheduleName,
            runTime: run.runTime.toISOString(),
            executionId: null,
            status: 'failed',
            error: runError instanceof Error ? runError.message : 'Unknown error'
          }
        }

        // Stream progress event
        sendEvent(controller, encoder, {
          type: 'progress',
          current: i + 1,
          total: allRuns.length,
          durationMs: Date.now() - runStartTime,
          result
        })
      }

      // Log the simulation
      await logAdminAction(
        user!.id,
        'time_machine_simulate_stream',
        'agent_schedules',
        null,
        {
          schedule_ids,
          start_time,
          end_time,
          total_runs: allRuns.length,
          dispatched: dispatchedCount,
          failed: failedCount,
        },
        request
      )

      // Send completion event
      sendEvent(controller, encoder, {
        type: 'complete',
        summary: {
          total: allRuns.length,
          dispatched: dispatchedCount,
          failed: failedCount
        }
      })

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
