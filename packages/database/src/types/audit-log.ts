/**
 * Audit Log Types for Scheduled Tasks and System Operations
 */

export type AuditAction = 
  | 'schedule_execution_started'
  | 'schedule_execution_completed'
  | 'schedule_execution_failed'
  | 'schedule_execution_dispatch'
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_deleted'
  | 'schedule_enabled'
  | 'schedule_disabled'
  | 'execution_approved'
  | 'execution_rejected'
  | 'execution_retry_attempted'
  | 'execution_moved_to_dlq'
  | 'workflow_scheduled_action_created'
  | 'workflow_scheduled_action_completed'
  | 'workflow_scheduled_action_failed'
  | 'cron_job_triggered'

export type AuditResourceType = 
  | 'agent_schedule'
  | 'agent_schedule_execution'
  | 'workflow_scheduled_action'
  | 'workflow_execution'
  | 'cron_job'

export interface AuditLogEntry {
  id: string
  action: AuditAction
  resource_type: AuditResourceType
  resource_id: string
  workspace_id?: string
  agent_id?: string
  
  // Actor information
  actor_type: 'system' | 'user' | 'cron' | 'agent'
  actor_id?: string
  actor_email?: string
  
  // Request context
  ip_address?: string
  user_agent?: string
  request_id?: string
  
  // Change details
  metadata: Record<string, unknown>
  
  // Timestamps
  created_at: string
}

export interface AuditLogQueryOptions {
  workspace_id?: string
  resource_type?: AuditResourceType
  resource_id?: string
  action?: AuditAction
  actor_id?: string
  actor_type?: 'system' | 'user' | 'cron' | 'agent'
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}
