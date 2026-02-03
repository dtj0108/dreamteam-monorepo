import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getRateLimitHeaders, rateLimitPresets } from '@dreamteam/auth'
import { getNextRunTime } from '@/lib/cron-utils'
import { moveToDLQWithClassification } from '@/lib/schedule-dlq'
import { logAuditEvent, audit } from '@/lib/audit-logger'

// Agent server URL - always Railway in production, env override in development
const isProductionEnv =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
const AGENT_SERVER_URL = isProductionEnv
  ? 'https://agent-server-production-580f.up.railway.app'
  : process.env.AGENT_SERVER_URL || 'http://localhost:3002'

console.log(`[agent-server dispatch] env=${process.env.NODE_ENV || 'unknown'} target=${AGENT_SERVER_URL}`)

/**
 * Determine if an error is retryable based on HTTP status or error message
 * Retryable: network timeouts, 5xx server errors, connection failures
 * Non-retryable: 4xx client errors, validation failures
 */
function isRetryableError(error: string, statusCode?: number): boolean {
  // 5xx server errors are retryable
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true
  }
  
  // 4xx client errors are not retryable (except 429 rate limit)
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return statusCode === 429
  }
  
  // Network-related errors are retryable
  const retryablePatterns = [
    /timeout/i,
    /etimedout/i,
    /econnreset/i,
    /econnrefused/i,
    /enotfound/i,
    /socket hang up/i,
    /network/i,
    /fetch failed/i,
    /abort/i,
  ]
  
  return retryablePatterns.some(pattern => pattern.test(error))
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Dispatch scheduled execution to agent-server
 * Agent-server runs on Railway with no timeout limits and full MCP support
 */
async function dispatchToAgentServer(
  executionId: string,
  agentId: string,
  taskPrompt: string,
  workspaceId?: string,
  outputConfig?: Record<string, unknown>,
  profileId?: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    const response = await fetch(`${AGENT_SERVER_URL}/scheduled-execution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        executionId,
        agentId,
        taskPrompt,
        workspaceId,
        outputConfig,
        profileId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error(`[Cron] Agent server error (${response.status}):`, errorData)
      return { 
        success: false, 
        error: errorData.error || `HTTP ${response.status}`,
        statusCode: response.status 
      }
    }

    const result = await response.json()
    return { success: result.success !== false }
  } catch (error) {
    console.error('[Cron] Failed to dispatch to agent server:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect to agent server'
    return {
      success: false,
      error: errorMessage,
      statusCode: undefined
    }
  }
}

/**
 * Dispatch with exponential backoff retry mechanism
 * Retries on retryable errors with delays: 1s, 2s, 4s
 */
async function dispatchWithRetry(
  executionId: string,
  agentId: string,
  taskPrompt: string,
  workspaceId?: string,
  outputConfig?: Record<string, unknown>,
  profileId?: string,
  maxRetries = 3
): Promise<{ success: boolean; error?: string; attempts: number; retryable: boolean; statusCode?: number }> {
  let lastError: string | undefined
  let lastStatusCode: number | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await dispatchToAgentServer(
      executionId,
      agentId,
      taskPrompt,
      workspaceId,
      outputConfig,
      profileId
    )
    
    if (result.success) {
      return { success: true, attempts: attempt + 1, retryable: false }
    }
    
    lastError = result.error
    lastStatusCode = result.statusCode
    
    // Check if this is a retryable error
    const retryable = isRetryableError(lastError ?? '', lastStatusCode)
    
    // Don't retry if this is the last attempt or error is not retryable
    if (attempt === maxRetries || !retryable) {
      return { 
        success: false, 
        error: lastError, 
        attempts: attempt + 1,
        retryable,
        statusCode: lastStatusCode
      }
    }
    
    // Calculate exponential backoff delay: 1s, 2s, 4s
    const delayMs = Math.pow(2, attempt) * 1000
    
    console.log(`[Cron] Retry ${attempt + 1}/${maxRetries} for execution ${executionId} after ${delayMs}ms. Error: ${lastError}`)
    
    await sleep(delayMs)
  }
  
  // This should never be reached, but just in case
  return { 
    success: false, 
    error: lastError, 
    attempts: maxRetries + 1,
    retryable: true,
    statusCode: lastStatusCode
  }
}

/**
 * Vercel Cron endpoint - called periodically to check for due schedules
 *
 * Security: This endpoint is protected by Vercel's cron authentication
 * In production, verify the CRON_SECRET header
 * 
 * Uses PostgreSQL advisory locks to prevent race conditions when multiple
 * cron instances attempt to process the same schedule simultaneously.
 */
export async function GET(request: NextRequest) {
  const requestId = `cron-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  try {
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

    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()
    
    // Get request context for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Fetch due schedules using SKIP LOCKED to prevent race conditions
    // This returns only schedules that are not currently locked by other workers
    const { data: dueSchedules, error: queryError } = await supabase.rpc(
      'fetch_due_schedules',
      { batch_size: 50 }
    )

    if (queryError) {
      console.error('Query schedules error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      // Log cron job triggered even when no schedules are due
      await audit.cronJobTriggered({
        cronPath: '/api/cron/check-schedules',
        schedulesChecked: 0,
        executionsProcessed: 0,
        ipAddress: clientIp !== 'unknown' ? clientIp : undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })
      
      return NextResponse.json({
        message: 'No schedules due',
        checked_at: now.toISOString(),
        count: 0
      })
    }
    
    // Log cron job triggered
    await audit.cronJobTriggered({
      cronPath: '/api/cron/check-schedules',
      schedulesChecked: dueSchedules.length,
      executionsProcessed: 0,
      ipAddress: clientIp !== 'unknown' ? clientIp : undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    const results: Array<{
      schedule_id: string
      schedule_name: string
      status: string
      execution_id?: string
      error?: string
    }> = []

    console.log(`[Cron] Found ${dueSchedules.length} due schedules`)

    // Process each due schedule
    for (const schedule of dueSchedules) {
      let lockAcquired = false

      try {
        // Acquire advisory lock for this schedule
        // This prevents other cron instances from processing the same schedule
        const { data: lockResult, error: lockError } = await supabase.rpc(
          'acquire_schedule_lock',
          { schedule_id: schedule.id, lock_timeout: '5 minutes' }
        )

        if (lockError) {
          console.error(`[Cron] Lock error for schedule ${schedule.id}:`, lockError)
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'error',
            error: `Lock error: ${lockError.message}`
          })
          continue
        }

        if (!lockResult) {
          console.log(`[Cron] Schedule ${schedule.id} is already being processed by another instance, skipping`)
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'skipped',
            error: 'Already locked by another instance'
          })
          continue
        }

        lockAcquired = true
        console.log(`[Cron] Acquired lock for schedule ${schedule.id}`)

        // Re-fetch the schedule with agent data (the RPC returns basic data only)
        // We do this AFTER acquiring the lock to ensure we have the latest data
        const { data: scheduleWithAgent, error: agentError } = await supabase
          .from('agent_schedules')
          .select(`
            *,
            agent:ai_agents(id, name, model, system_prompt, is_enabled)
          `)
          .eq('id', schedule.id)
          .single()

        if (agentError || !scheduleWithAgent) {
          console.error(`[Cron] Error fetching schedule ${schedule.id} with agent data:`, agentError)
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'error',
            error: agentError?.message || 'Failed to fetch schedule details'
          })
          continue
        }

        // Skip if agent is disabled
        if (!scheduleWithAgent.agent?.is_enabled) {
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'skipped',
            error: 'Agent is disabled'
          })
          continue
        }

        // Deduplication check: skip if a recent execution already exists for this schedule
        // This prevents duplicate executions if the cron is triggered multiple times
        const { data: recentExec } = await supabase
          .from('agent_schedule_executions')
          .select('id, status')
          .eq('schedule_id', schedule.id)
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .in('status', ['pending', 'pending_approval', 'running'])
          .limit(1)
          .maybeSingle()

        if (recentExec) {
          console.log(`[Cron] Skipping schedule ${schedule.id} - recent execution ${recentExec.id} exists (status: ${recentExec.status})`)
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'skipped',
            error: `Recent execution already exists (${recentExec.status})`
          })
          continue
        }

        // Create execution record
        const executionStatus = schedule.requires_approval ? 'pending_approval' : 'running'

        const { data: execution, error: execError } = await supabase
          .from('agent_schedule_executions')
          .insert({
            schedule_id: schedule.id,
            agent_id: schedule.agent_id,
            scheduled_for: schedule.next_run_at,
            status: executionStatus,
            started_at: schedule.requires_approval ? null : now.toISOString()
          })
          .select()
          .single()

        if (execError) {
          console.error(`Create execution error for schedule ${schedule.id}:`, execError)
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'error',
            error: execError.message
          })
          continue
        }

        // Calculate next run time
        const nextRunAt = getNextRunTime(schedule.cron_expression, schedule.timezone, now)

        // Update schedule with last_run_at and new next_run_at
        await supabase
          .from('agent_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString()
          })
          .eq('id', schedule.id)

        if (schedule.requires_approval) {
          // Just created pending execution, will be processed when approved
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'pending_approval',
            execution_id: execution.id
          })
          
          // Log execution awaiting approval
          await logAuditEvent({
            action: 'schedule_execution_dispatch',
            resourceType: 'agent_schedule_execution',
            resourceId: execution.id,
            workspaceId: schedule.workspace_id as string | undefined,
            agentId: schedule.agent_id,
            actorType: 'cron',
            metadata: {
              schedule_id: schedule.id,
              schedule_name: schedule.name,
              requires_approval: true,
            },
          })
        } else {
          // Dispatch to agent-server for execution (Railway - no timeout limits)
          // Note: We fire-and-forget to avoid Vercel timeout. Agent-server updates the execution status.
          try {
            // Use workspace_id directly from the schedule (stored at schedule creation time)
            // This is more reliable than the previous lookup through agents table
            const resolvedWorkspaceId = schedule.workspace_id as string | undefined

            if (resolvedWorkspaceId) {
              console.log(`[Cron] Using workspace_id ${resolvedWorkspaceId} for schedule "${schedule.name}"`)
            } else {
              console.warn(`[Cron] Schedule "${schedule.name}" has no workspace_id - MCP tools will not be available`)
            }

            // Don't await - let agent-server handle the execution asynchronously
            // This prevents Vercel serverless timeouts for long-running tasks
            dispatchWithRetry(
              execution.id,
              schedule.agent_id,
              schedule.task_prompt,
              resolvedWorkspaceId, // Pass resolved workspace context for MCP tools
              schedule.output_config, // Pass output formatting config
              scheduleWithAgent.created_by, // Pass schedule creator's profile_id for MCP authorization
              3 // maxRetries
            ).then(async (result) => {
              if (!result.success) {
                console.error(`[Cron] Dispatch failed for schedule ${schedule.id} after ${result.attempts} attempts:`, result.error)
                
                // Log execution failed
                await audit.scheduleExecutionFailed({
                  executionId: execution.id,
                  scheduleId: schedule.id,
                  agentId: schedule.agent_id,
                  workspaceId: resolvedWorkspaceId,
                  error: result.error ?? 'Unknown error',
                  errorType: result.retryable ? 'max_retries_exceeded' : 'dispatch_failure',
                  retryAttempt: result.attempts,
                }).catch(e => console.error('[AuditLog] Failed to log execution failure:', e))
                
                // Update execution to failed status after all retries exhausted
                const { error: updateError } = await supabase
                  .from('agent_schedule_executions')
                  .update({
                    status: 'failed',
                    error_message: `Dispatch failed after ${result.attempts} attempts: ${result.error}`,
                    completed_at: new Date().toISOString()
                  })
                  .eq('id', execution.id)
                
                if (updateError) {
                  console.error(`[Cron] Failed to update execution ${execution.id} status:`, updateError)
                }
                
                // Move to Dead Letter Queue for tracking and potential manual intervention
                const dlqId = await moveToDLQWithClassification(
                  execution.id,
                  result.error ?? 'Unknown error',
                  result.statusCode
                )
                
                // Log execution moved to DLQ
                if (dlqId) {
                  await audit.executionMovedToDLQ({
                    executionId: execution.id,
                    dlqId,
                    scheduleId: schedule.id,
                    errorType: 'unknown',
                    requiresManualReview: false,
                  }).catch(e => console.error('[AuditLog] Failed to log DLQ move:', e))
                }
              }
            }).catch(async (err) => {
              console.error(`[Cron] Dispatch error for schedule ${schedule.id}:`, err)
              
              // Log execution failed on exception
              await audit.scheduleExecutionFailed({
                executionId: execution.id,
                scheduleId: schedule.id,
                agentId: schedule.agent_id,
                workspaceId: resolvedWorkspaceId,
                error: err instanceof Error ? err.message : String(err),
                errorType: 'dispatch_failure',
              }).catch(e => console.error('[AuditLog] Failed to log execution failure:', e))
            })

            results.push({
              schedule_id: schedule.id,
              schedule_name: schedule.name,
              status: 'dispatched', // Changed from 'completed' - agent-server will update final status
              execution_id: execution.id
            })
            
            // Log schedule execution dispatched
            await logAuditEvent({
              action: 'schedule_execution_dispatch',
              resourceType: 'agent_schedule_execution',
              resourceId: execution.id,
              workspaceId: resolvedWorkspaceId,
              agentId: schedule.agent_id,
              actorType: 'cron',
              metadata: {
                schedule_id: schedule.id,
                schedule_name: schedule.name,
                requires_approval: false,
              },
            })
          } catch (dispatchError) {
            console.error(`Dispatch error for schedule ${schedule.id}:`, dispatchError)
            results.push({
              schedule_id: schedule.id,
              schedule_name: schedule.name,
              status: 'dispatch_failed',
              execution_id: execution.id,
              error: dispatchError instanceof Error ? dispatchError.message : 'Dispatch failed'
            })
          }
        }

        console.log(`[Cron] Successfully processed schedule ${schedule.id}`)
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.id}:`, scheduleError)
        results.push({
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          status: 'error',
          error: scheduleError instanceof Error ? scheduleError.message : 'Unknown error'
        })
      } finally {
        // Always release the lock, even if processing failed
        if (lockAcquired) {
          try {
            await supabase.rpc('release_schedule_lock', { schedule_id: schedule.id })
            console.log(`[Cron] Released lock for schedule ${schedule.id}`)
          } catch (releaseError) {
            console.error(`[Cron] Error releasing lock for schedule ${schedule.id}:`, releaseError)
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Schedules processed',
      checked_at: now.toISOString(),
      count: dueSchedules.length,
      results
    })
  } catch (err) {
    console.error('Cron check-schedules error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export { GET as POST }
