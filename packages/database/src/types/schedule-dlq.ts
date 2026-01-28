// ============================================
// Schedule Execution DLQ Types
// Dead Letter Queue for failed scheduled task executions
// ============================================

// Error type classifications for DLQ entries
export type DLQErrorType = 
  | 'dispatch_failure'      // Failed to dispatch to agent server
  | 'execution_error'       // Agent execution returned an error
  | 'timeout'               // Execution timed out
  | 'max_retries_exceeded'  // All retry attempts exhausted
  | 'validation_error'      // Input validation failed
  | 'network_error'         // Network connectivity issues
  | 'unknown';              // Unclassified error

// Status of a DLQ entry
export type DLQStatus = 
  | 'pending'    // Awaiting retry or manual intervention
  | 'retrying'   // Currently being retried
  | 'resolved'   // Successfully resolved
  | 'discarded'; // Cancelled or marked as discarded

// Resolution actions for resolved entries
export type DLQResolutionAction = 
  | 'manual_retry'    // Manually triggered retry
  | 'auto_retry'      // Automatically retried and succeeded
  | 'cancelled'       // Manually cancelled
  | 'fixed_upstream'  // Fixed at the source (e.g., schedule corrected)
  | 'no_action_needed'; // False positive or acceptable failure

// ============================================
// Database Row Types
// ============================================

/**
 * Dead Letter Queue entry for failed scheduled executions
 * Mirrors the database table agent_schedule_executions_dlq
 */
export interface ScheduleExecutionDLQ {
  id: string;
  execution_id: string;
  schedule_id: string | null;
  agent_id: string | null;
  workspace_id: string | null;
  
  // Failure tracking
  failed_at: string;
  error_message: string | null;
  error_type: DLQErrorType | null;
  
  // Retry tracking
  retry_count: number;
  last_retry_at: string | null;
  next_retry_at: string | null;
  max_retries: number;
  
  // Manual review
  requires_manual_review: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  
  // Resolution
  status: DLQStatus;
  resolved_at: string | null;
  resolution_action: DLQResolutionAction | null;
  
  // Context for debugging
  task_prompt: string | null;
  execution_context: Record<string, unknown> | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * DLQ entry with related data joined
 */
export interface ScheduleExecutionDLQWithDetails extends ScheduleExecutionDLQ {
  // Joined from agent_schedule_executions
  execution?: {
    id: string;
    status: string;
    scheduled_for: string;
    started_at: string | null;
    completed_at: string | null;
    result: Record<string, unknown> | null;
    error_message: string | null;
  };
  
  // Joined from agent_schedules
  schedule?: {
    id: string;
    name: string;
    cron_expression: string;
    is_enabled: boolean;
  };
  
  // Joined from ai_agents
  agent?: {
    id: string;
    name: string;
  };
  
  // Joined from profiles (reviewer)
  reviewed_by_profile?: {
    id: string;
    name: string | null;
    email: string;
  };
}

// ============================================
// Statistics Types
// ============================================

/**
 * DLQ statistics returned by get_dlq_stats function
 */
export interface DLQStats {
  total_pending: number;
  total_retrying: number;
  total_resolved: number;
  total_discarded: number;
  requires_manual_review: number;
  by_error_type: Record<string, number>;
  oldest_failure: string | null;
  newest_failure: string | null;
}

// ============================================
// Input Types for API Operations
// ============================================

/**
 * Input for moving an execution to DLQ
 */
export interface MoveToDLQInput {
  execution_id: string;
  error_message: string;
  error_type: DLQErrorType;
  requires_manual_review?: boolean;
}

/**
 * Input for retrying a DLQ item
 */
export interface RetryDLQItemInput {
  dlq_id: string;
  reviewed_by?: string;
}

/**
 * Input for resolving a DLQ item
 */
export interface ResolveDLQItemInput {
  dlq_id: string;
  resolution_action: DLQResolutionAction;
  reviewed_by: string;
  notes?: string;
}

// ============================================
// Query Options Types
// ============================================

/**
 * Filter options for querying DLQ items
 */
export interface DLQFilterOptions {
  status?: DLQStatus | DLQStatus[];
  error_type?: DLQErrorType | DLQErrorType[];
  requires_manual_review?: boolean;
  workspace_id?: string;
  agent_id?: string;
  schedule_id?: string;
  reviewed_by?: string;
  failed_after?: string; // ISO date string
  failed_before?: string; // ISO date string
}

/**
 * Sort options for DLQ queries
 */
export type DLQSortField = 
  | 'failed_at' 
  | 'created_at' 
  | 'retry_count' 
  | 'status' 
  | 'error_type';

export type DLQSortOrder = 'asc' | 'desc';

export interface DLQSortOptions {
  field: DLQSortField;
  order: DLQSortOrder;
}

/**
 * Pagination options for DLQ queries
 */
export interface DLQPaginationOptions {
  page?: number;
  page_size?: number;
}

/**
 * Complete query options for getDLQItems
 */
export interface DLQQueryOptions {
  filters?: DLQFilterOptions;
  sort?: DLQSortOptions;
  pagination?: DLQPaginationOptions;
}

// ============================================
// Utility Constants
// ============================================

/**
 * Human-readable labels for error types
 */
export const DLQ_ERROR_TYPE_LABELS: Record<DLQErrorType, string> = {
  dispatch_failure: 'Dispatch Failure',
  execution_error: 'Execution Error',
  timeout: 'Timeout',
  max_retries_exceeded: 'Max Retries Exceeded',
  validation_error: 'Validation Error',
  network_error: 'Network Error',
  unknown: 'Unknown Error',
};

/**
 * Human-readable labels for statuses
 */
export const DLQ_STATUS_LABELS: Record<DLQStatus, string> = {
  pending: 'Pending',
  retrying: 'Retrying',
  resolved: 'Resolved',
  discarded: 'Discarded',
};

/**
 * Status colors for UI display
 */
export const DLQ_STATUS_COLORS: Record<DLQStatus, string> = {
  pending: '#f59e0b',    // amber-500
  retrying: '#3b82f6',   // blue-500
  resolved: '#10b981',   // emerald-500
  discarded: '#6b7280',  // gray-500
};

/**
 * Default max retry count
 */
export const DLQ_DEFAULT_MAX_RETRIES = 3;

/**
 * Check if an error type should auto-require manual review
 */
export function requiresManualReview(errorType: DLQErrorType): boolean {
  return ['validation_error', 'max_retries_exceeded'].includes(errorType);
}
