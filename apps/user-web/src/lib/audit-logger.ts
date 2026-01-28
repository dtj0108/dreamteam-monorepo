import { createAdminClient } from "@dreamteam/database/server"
import type { AuditAction, AuditResourceType, AuditLogEntry } from "@dreamteam/database"

interface AuditLogOptions {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId: string
  workspaceId?: string
  agentId?: string
  actorType: "system" | "user" | "cron" | "agent"
  actorId?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an audit event for scheduled task operations
 */
export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.from("audit_logs").insert({
      action: options.action,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      workspace_id: options.workspaceId,
      agent_id: options.agentId,
      actor_type: options.actorType,
      actor_id: options.actorId,
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      request_id: options.requestId,
      metadata: options.metadata || {},
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[AuditLog] Failed to log audit event:", error)
    }
  } catch (error) {
    // Never throw from audit logging - don't break business logic
    console.error("[AuditLog] Exception logging audit event:", error)
  }
}

/**
 * Create an audit logger bound to a request context
 * Useful for logging multiple events with shared context
 */
export function createRequestAuditLogger(context: {
  ipAddress?: string
  userAgent?: string
  requestId?: string
  actorType: "system" | "user" | "cron" | "agent"
  actorId?: string
}) {
  return {
    log: (
      options: Omit<
        AuditLogOptions,
        "ipAddress" | "userAgent" | "requestId" | "actorType" | "actorId"
      >
    ) =>
      logAuditEvent({
        ...options,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        actorType: context.actorType,
        actorId: context.actorId,
      }),
  }
}

// Convenience functions for common audit events
export const audit = {
  scheduleExecutionStarted: (data: {
    executionId: string
    scheduleId: string
    agentId: string
    workspaceId?: string
    context?: { ipAddress?: string; userAgent?: string; requestId?: string }
  }) =>
    logAuditEvent({
      action: "schedule_execution_started",
      resourceType: "agent_schedule_execution",
      resourceId: data.executionId,
      workspaceId: data.workspaceId,
      agentId: data.agentId,
      actorType: "cron",
      ipAddress: data.context?.ipAddress,
      userAgent: data.context?.userAgent,
      requestId: data.context?.requestId,
      metadata: { schedule_id: data.scheduleId },
    }),

  scheduleExecutionCompleted: (data: {
    executionId: string
    scheduleId: string
    agentId: string
    workspaceId?: string
    durationMs?: number
    toolCalls?: number
  }) =>
    logAuditEvent({
      action: "schedule_execution_completed",
      resourceType: "agent_schedule_execution",
      resourceId: data.executionId,
      workspaceId: data.workspaceId,
      agentId: data.agentId,
      actorType: "system",
      metadata: {
        schedule_id: data.scheduleId,
        duration_ms: data.durationMs,
        tool_calls: data.toolCalls,
      },
    }),

  scheduleExecutionFailed: (data: {
    executionId: string
    scheduleId: string
    agentId: string
    workspaceId?: string
    error: string
    errorType?: string
    retryAttempt?: number
  }) =>
    logAuditEvent({
      action: "schedule_execution_failed",
      resourceType: "agent_schedule_execution",
      resourceId: data.executionId,
      workspaceId: data.workspaceId,
      agentId: data.agentId,
      actorType: "system",
      metadata: {
        schedule_id: data.scheduleId,
        error: data.error,
        error_type: data.errorType,
        retry_attempt: data.retryAttempt,
      },
    }),

  executionMovedToDLQ: (data: {
    executionId: string
    dlqId: string
    scheduleId: string
    errorType: string
    requiresManualReview: boolean
  }) =>
    logAuditEvent({
      action: "execution_moved_to_dlq",
      resourceType: "agent_schedule_execution",
      resourceId: data.executionId,
      actorType: "system",
      metadata: {
        dlq_id: data.dlqId,
        schedule_id: data.scheduleId,
        error_type: data.errorType,
        requires_manual_review: data.requiresManualReview,
      },
    }),

  cronJobTriggered: (data: {
    cronPath: string
    schedulesChecked: number
    executionsProcessed: number
    ipAddress?: string
    userAgent?: string
  }) =>
    logAuditEvent({
      action: "cron_job_triggered",
      resourceType: "cron_job",
      resourceId: data.cronPath,
      actorType: "cron",
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        schedules_checked: data.schedulesChecked,
        executions_processed: data.executionsProcessed,
      },
    }),
}
