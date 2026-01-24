import { createAdminClient } from './supabase-server'
import { resumeWorkflow, type WorkflowContext, type ExecutionResult } from './workflow-executor'
import type { WorkflowAction } from '@/types/workflow'

interface ScheduledAction {
  id: string
  execution_id: string
  workflow_id: string
  user_id: string
  action_index: number
  remaining_actions: WorkflowAction[]
  workflow_context: WorkflowContext
  scheduled_for: string
  status: string
}

interface ProcessResult {
  processed: number
  succeeded: number
  failed: number
  errors: string[]
}

/**
 * Process all pending scheduled workflow actions that are due
 * This should be called by a cron job (e.g., every minute)
 */
export async function processScheduledWorkflows(): Promise<ProcessResult> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  // Find all pending scheduled actions that are due
  const { data: pendingActions, error: fetchError } = await supabase
    .from('workflow_scheduled_actions')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(100) // Process in batches to avoid timeouts

  if (fetchError) {
    console.error('[Scheduled Workflows] Error fetching pending actions:', fetchError)
    result.errors.push(`Fetch error: ${fetchError.message}`)
    return result
  }

  if (!pendingActions || pendingActions.length === 0) {
    console.log('[Scheduled Workflows] No pending actions to process')
    return result
  }

  console.log(`[Scheduled Workflows] Processing ${pendingActions.length} scheduled action(s)`)

  for (const scheduledAction of pendingActions as ScheduledAction[]) {
    result.processed++

    try {
      // Mark as processing
      await supabase
        .from('workflow_scheduled_actions')
        .update({ status: 'processing', processed_at: new Date().toISOString() })
        .eq('id', scheduledAction.id)

      // Fetch previous results from the execution record
      const { data: execution } = await supabase
        .from('workflow_executions')
        .select('action_results')
        .eq('id', scheduledAction.execution_id)
        .single()

      const previousResults = (execution?.action_results || []) as ExecutionResult[]

      // Resume the workflow
      const results = await resumeWorkflow(
        scheduledAction.execution_id,
        scheduledAction.workflow_id,
        scheduledAction.remaining_actions,
        scheduledAction.workflow_context,
        previousResults
      )

      const allSucceeded = results.every((r) => r.success)

      // Mark scheduled action as completed
      await supabase
        .from('workflow_scheduled_actions')
        .update({ status: allSucceeded ? 'completed' : 'failed' })
        .eq('id', scheduledAction.id)

      if (allSucceeded) {
        result.succeeded++
      } else {
        result.failed++
        const failedActions = results.filter((r) => !r.success)
        result.errors.push(
          `Workflow ${scheduledAction.workflow_id}: ${failedActions.length} action(s) failed`
        )
      }

      console.log(
        `[Scheduled Workflows] Processed scheduled action ${scheduledAction.id} for workflow ${scheduledAction.workflow_id} - ${allSucceeded ? 'success' : 'partial failure'}`
      )
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Scheduled action ${scheduledAction.id}: ${errorMessage}`)

      // Mark as failed
      await supabase
        .from('workflow_scheduled_actions')
        .update({ status: 'failed' })
        .eq('id', scheduledAction.id)

      console.error(
        `[Scheduled Workflows] Error processing scheduled action ${scheduledAction.id}:`,
        error
      )
    }
  }

  console.log(
    `[Scheduled Workflows] Finished processing. Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`
  )

  return result
}

/**
 * Get statistics about scheduled workflow actions
 */
export async function getScheduledWorkflowStats(): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
}> {
  const supabase = createAdminClient()

  const { data: stats } = await supabase
    .from('workflow_scheduled_actions')
    .select('status')

  if (!stats) {
    return { pending: 0, processing: 0, completed: 0, failed: 0 }
  }

  return {
    pending: stats.filter((s: { status: string }) => s.status === 'pending').length,
    processing: stats.filter((s: { status: string }) => s.status === 'processing').length,
    completed: stats.filter((s: { status: string }) => s.status === 'completed').length,
    failed: stats.filter((s: { status: string }) => s.status === 'failed').length,
  }
}
