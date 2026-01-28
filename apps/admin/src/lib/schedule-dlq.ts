/**
 * Schedule Dead Letter Queue (DLQ) Utilities
 * 
 * Provides functions for managing failed scheduled task executions
 * that require manual intervention or have exceeded retry limits.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ScheduleExecutionDLQ,
  ScheduleExecutionDLQWithDetails,
  DLQStats,
  MoveToDLQInput,
  ResolveDLQItemInput,
  DLQQueryOptions,
  DLQFilterOptions,
  DLQSortOptions,
  DLQPaginationOptions,
  DLQErrorType,
  DLQStatus,
} from '@dreamteam/database'

// ============================================
// Core DLQ Operations
// ============================================

/**
 * Move a failed execution to the Dead Letter Queue
 * 
 * @param input - The move to DLQ input parameters
 * @returns The ID of the created DLQ entry, or null if failed
 */
export async function moveToDLQ(
  input: MoveToDLQInput
): Promise<string | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.rpc('move_execution_to_dlq', {
    p_execution_id: input.execution_id,
    p_error_message: input.error_message,
    p_error_type: input.error_type,
    p_requires_manual_review: input.requires_manual_review ?? false,
  })
  
  if (error) {
    console.error('[DLQ] Failed to move execution to DLQ:', error)
    return null
  }
  
  if (data) {
    console.log(`[DLQ] Execution ${input.execution_id} moved to DLQ with ID ${data}`)
  }
  
  return data
}

/**
 * Move a failed execution to DLQ with automatic error classification
 * 
 * @param executionId - The execution ID that failed
 * @param errorMessage - The error message
 * @param statusCode - Optional HTTP status code for classification
 * @returns The ID of the created DLQ entry, or null if failed
 */
export async function moveToDLQWithClassification(
  executionId: string,
  errorMessage: string,
  statusCode?: number
): Promise<string | null> {
  const errorType = classifyError(errorMessage, statusCode)
  const requiresManualReview = shouldRequireManualReview(errorType, statusCode)
  
  return moveToDLQ({
    execution_id: executionId,
    error_message: errorMessage,
    error_type: errorType,
    requires_manual_review: requiresManualReview,
  })
}

/**
 * Retry a DLQ item
 * 
 * @param dlqId - The DLQ entry ID to retry
 * @param reviewedBy - Optional UUID of the user initiating the retry
 * @returns True if retry was initiated successfully
 */
export async function retryDLQItem(
  dlqId: string,
  reviewedBy?: string
): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.rpc('retry_dlq_item', {
    p_dlq_id: dlqId,
    p_reviewed_by: reviewedBy ?? null,
  })
  
  if (error) {
    console.error(`[DLQ] Failed to retry DLQ item ${dlqId}:`, error)
    return false
  }
  
  if (data) {
    console.log(`[DLQ] DLQ item ${dlqId} queued for retry`)
  } else {
    console.warn(`[DLQ] DLQ item ${dlqId} could not be retried (may be resolved or max retries exceeded)`)
  }
  
  return data ?? false
}

/**
 * Resolve a DLQ item
 * 
 * @param input - The resolve input parameters
 * @returns True if the item was resolved successfully
 */
export async function resolveDLQItem(
  input: ResolveDLQItemInput
): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.rpc('resolve_dlq_item', {
    p_dlq_id: input.dlq_id,
    p_resolution_action: input.resolution_action,
    p_reviewed_by: input.reviewed_by,
    p_notes: input.notes ?? null,
  })
  
  if (error) {
    console.error(`[DLQ] Failed to resolve DLQ item ${input.dlq_id}:`, error)
    return false
  }
  
  if (data) {
    console.log(`[DLQ] DLQ item ${input.dlq_id} resolved with action ${input.resolution_action}`)
  }
  
  return data ?? false
}

// ============================================
// Query Operations
// ============================================

/**
 * Get DLQ items with filtering, sorting, and pagination
 * 
 * @param options - Query options for filtering, sorting, and pagination
 * @returns Array of DLQ entries with optional details
 */
export async function getDLQItems(
  options: DLQQueryOptions = {}
): Promise<ScheduleExecutionDLQWithDetails[]> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from('agent_schedule_executions_dlq')
    .select(`
      *,
      execution:agent_schedule_executions(
        id, status, scheduled_for, started_at, completed_at, result, error_message
      ),
      schedule:agent_schedules(id, name, cron_expression, is_enabled),
      agent:ai_agents(id, name)
    `)
  
  // Apply filters
  query = applyFilters(query, options.filters)
  
  // Apply sorting
  query = applySorting(query, options.sort)
  
  // Apply pagination
  query = applyPagination(query, options.pagination)
  
  const { data, error } = await query
  
  if (error) {
    console.error('[DLQ] Failed to get DLQ items:', error)
    return []
  }
  
  return (data as ScheduleExecutionDLQWithDetails[]) ?? []
}

/**
 * Get a single DLQ item by ID
 * 
 * @param dlqId - The DLQ entry ID
 * @returns The DLQ entry with details, or null if not found
 */
export async function getDLQItemById(
  dlqId: string
): Promise<ScheduleExecutionDLQWithDetails | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('agent_schedule_executions_dlq')
    .select(`
      *,
      execution:agent_schedule_executions(
        id, status, scheduled_for, started_at, completed_at, result, error_message
      ),
      schedule:agent_schedules(id, name, cron_expression, is_enabled),
      agent:ai_agents(id, name),
      reviewed_by_profile:profiles(id, name, email)
    `)
    .eq('id', dlqId)
    .single()
  
  if (error) {
    console.error(`[DLQ] Failed to get DLQ item ${dlqId}:`, error)
    return null
  }
  
  return data as ScheduleExecutionDLQWithDetails
}

/**
 * Get DLQ items that require manual review
 * 
 * @param workspaceId - Optional workspace ID to filter by
 * @returns Array of DLQ entries requiring manual review
 */
export async function getDLQItemsRequiringReview(
  workspaceId?: string
): Promise<ScheduleExecutionDLQWithDetails[]> {
  return getDLQItems({
    filters: {
      requires_manual_review: true,
      status: ['pending', 'retrying'],
      workspace_id: workspaceId,
    },
    sort: { field: 'failed_at', order: 'asc' },
  })
}

/**
 * Get DLQ statistics
 * 
 * @param workspaceId - Optional workspace ID to filter stats by
 * @returns DLQ statistics object
 */
export async function getDLQStats(
  workspaceId?: string
): Promise<DLQStats> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.rpc('get_dlq_stats', {
    p_workspace_id: workspaceId ?? null,
  })
  
  if (error) {
    console.error('[DLQ] Failed to get DLQ stats:', error)
    return {
      total_pending: 0,
      total_retrying: 0,
      total_resolved: 0,
      total_discarded: 0,
      requires_manual_review: 0,
      by_error_type: {},
      oldest_failure: null,
      newest_failure: null,
    }
  }
  
  return data as DLQStats
}

/**
 * Get DLQ items by execution ID
 * 
 * @param executionId - The execution ID to look up
 * @returns The DLQ entry for this execution, or null if not found
 */
export async function getDLQItemByExecutionId(
  executionId: string
): Promise<ScheduleExecutionDLQ | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('agent_schedule_executions_dlq')
    .select('*')
    .eq('execution_id', executionId)
    .maybeSingle()
  
  if (error) {
    console.error(`[DLQ] Failed to get DLQ item by execution ${executionId}:`, error)
    return null
  }
  
  return data as ScheduleExecutionDLQ | null
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Retry multiple DLQ items at once
 * 
 * @param dlqIds - Array of DLQ entry IDs to retry
 * @param reviewedBy - Optional UUID of the user initiating the retries
 * @returns Object with counts of successful and failed retries
 */
export async function bulkRetryDLQItems(
  dlqIds: string[],
  reviewedBy?: string
): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.all(
    dlqIds.map(id => retryDLQItem(id, reviewedBy))
  )
  
  const succeeded = results.filter(r => r).length
  const failed = results.filter(r => !r).length
  
  console.log(`[DLQ] Bulk retry completed: ${succeeded} succeeded, ${failed} failed`)
  
  return { succeeded, failed }
}

/**
 * Resolve multiple DLQ items at once
 * 
 * @param dlqIds - Array of DLQ entry IDs to resolve
 * @param resolutionAction - The resolution action to apply
 * @param reviewedBy - UUID of the user resolving the items
 * @param notes - Optional notes to add
 * @returns Object with counts of successful and failed resolutions
 */
export async function bulkResolveDLQItems(
  dlqIds: string[],
  resolutionAction: ResolveDLQItemInput['resolution_action'],
  reviewedBy: string,
  notes?: string
): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.all(
    dlqIds.map(id =>
      resolveDLQItem({
        dlq_id: id,
        resolution_action: resolutionAction,
        reviewed_by: reviewedBy,
        notes,
      })
    )
  )
  
  const succeeded = results.filter(r => r).length
  const failed = results.filter(r => !r).length
  
  console.log(`[DLQ] Bulk resolve completed: ${succeeded} succeeded, ${failed} failed`)
  
  return { succeeded, failed }
}

// ============================================
// Cleanup Operations
// ============================================

/**
 * Clean up old resolved DLQ entries
 * 
 * @param daysOld - Age in days of entries to clean up (default: 30)
 * @returns Number of entries deleted
 */
export async function cleanupOldDLQEntries(
  daysOld: number = 30
): Promise<number> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.rpc('cleanup_old_dlq_entries', {
    p_days_old: daysOld,
  })
  
  if (error) {
    console.error('[DLQ] Failed to cleanup old DLQ entries:', error)
    return 0
  }
  
  console.log(`[DLQ] Cleaned up ${data} old DLQ entries`)
  return data ?? 0
}

// ============================================
// Helper Functions
// ============================================

/**
 * Classify an error into a DLQ error type
 * 
 * @param errorMessage - The error message
 * @param statusCode - Optional HTTP status code
 * @returns The classified error type
 */
function classifyError(errorMessage: string, statusCode?: number): DLQErrorType {
  const error = errorMessage.toLowerCase()
  
  // Check for specific error patterns
  if (statusCode === 429 || error.includes('rate limit')) {
    return 'dispatch_failure'
  }
  
  if (statusCode && statusCode >= 500) {
    return 'dispatch_failure'
  }
  
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return 'validation_error'
  }
  
  if (
    error.includes('timeout') ||
    error.includes('etimedout') ||
    error.includes('deadline exceeded')
  ) {
    return 'timeout'
  }
  
  if (
    error.includes('network') ||
    error.includes('econnreset') ||
    error.includes('econnrefused') ||
    error.includes('enotfound') ||
    error.includes('socket hang up') ||
    error.includes('fetch failed')
  ) {
    return 'network_error'
  }
  
  if (
    error.includes('max retries') ||
    error.includes('retry attempts exhausted')
  ) {
    return 'max_retries_exceeded'
  }
  
  if (
    error.includes('execution failed') ||
    error.includes('agent error')
  ) {
    return 'execution_error'
  }
  
  return 'unknown'
}

/**
 * Determine if an error should require manual review
 * 
 * @param errorType - The classified error type
 * @param statusCode - Optional HTTP status code
 * @returns True if manual review is recommended
 */
function shouldRequireManualReview(
  errorType: DLQErrorType,
  statusCode?: number
): boolean {
  // Validation errors typically need manual intervention
  if (errorType === 'validation_error') {
    return true
  }
  
  // Max retries exceeded needs investigation
  if (errorType === 'max_retries_exceeded') {
    return true
  }
  
  // 4xx client errors (except rate limit) may need configuration changes
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return true
  }
  
  return false
}

// ============================================
// Query Builder Helpers
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(
  query: any,
  filters?: DLQFilterOptions
): any {
  if (!filters) return query
  
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }
  
  if (filters.error_type) {
    if (Array.isArray(filters.error_type)) {
      query = query.in('error_type', filters.error_type)
    } else {
      query = query.eq('error_type', filters.error_type)
    }
  }
  
  if (filters.requires_manual_review !== undefined) {
    query = query.eq('requires_manual_review', filters.requires_manual_review)
  }
  
  if (filters.workspace_id) {
    query = query.eq('workspace_id', filters.workspace_id)
  }
  
  if (filters.agent_id) {
    query = query.eq('agent_id', filters.agent_id)
  }
  
  if (filters.schedule_id) {
    query = query.eq('schedule_id', filters.schedule_id)
  }
  
  if (filters.reviewed_by) {
    query = query.eq('reviewed_by', filters.reviewed_by)
  }
  
  if (filters.failed_after) {
    query = query.gte('failed_at', filters.failed_after)
  }
  
  if (filters.failed_before) {
    query = query.lte('failed_at', filters.failed_before)
  }
  
  return query
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySorting(
  query: any,
  sort?: DLQSortOptions
): any {
  if (!sort) {
    // Default sort by failed_at desc
    return query.order('failed_at', { ascending: false })
  }
  
  return query.order(sort.field, { ascending: sort.order === 'asc' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPagination(
  query: any,
  pagination?: DLQPaginationOptions
): any {
  if (!pagination) return query
  
  const page = pagination.page ?? 1
  const pageSize = pagination.page_size ?? 50
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1
  
  return query.range(start, end)
}

// ============================================
// Exports
// ============================================

export {
  classifyError,
  shouldRequireManualReview,
}
