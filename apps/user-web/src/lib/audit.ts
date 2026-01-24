/**
 * Audit logging utility for security compliance (SOC 2).
 *
 * Logs security-relevant events to the audit_logs table.
 * Events are fire-and-forget to avoid blocking the main request.
 *
 * IMPORTANT: Never log sensitive data like passwords, tokens, or PII.
 */

import { createAdminClient } from '@dreamteam/database/server'

// ============================================
// Types
// ============================================

export type AuditAction =
  // Authentication events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.otp_sent'
  | 'auth.otp_verified'
  | 'auth.otp_failed'
  | 'auth.session_expired'
  // Plaid events
  | 'plaid.connected'
  | 'plaid.disconnected'
  | 'plaid.sync'
  | 'plaid.sync_failed'
  | 'plaid.webhook_received'
  | 'plaid.webhook_failed'
  // Nylas events
  | 'nylas.connected'
  | 'nylas.disconnected'
  | 'nylas.sync'
  | 'nylas.sync_failed'
  | 'nylas.webhook_received'
  | 'nylas.webhook_failed'
  // Account events
  | 'account.created'
  | 'account.updated'
  | 'account.deleted'
  // Transaction events
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.deleted'
  | 'transaction.categorized'
  | 'transaction.bulk_categorized'
  // Budget events
  | 'budget.created'
  | 'budget.updated'
  | 'budget.deleted'
  // Category events
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  // Workspace events
  | 'workspace.created'
  | 'workspace.member_added'
  | 'workspace.member_removed'
  | 'workspace.role_changed'
  // API key events
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.used'

export type AuditResourceType =
  | 'user'
  | 'workspace'
  | 'account'
  | 'transaction'
  | 'category'
  | 'budget'
  | 'plaid_item'
  | 'nylas_grant'
  | 'api_key'
  | 'subscription'

export interface AuditEvent {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  workspaceId?: string
  userId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// ============================================
// Logging Function
// ============================================

/**
 * Log an audit event to the database.
 *
 * This is a fire-and-forget operation - errors are logged but don't throw.
 * This ensures audit logging never blocks the main request flow.
 *
 * @param event - The audit event to log
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.from('audit_logs').insert({
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId || null,
      workspace_id: event.workspaceId || null,
      user_id: event.userId || null,
      details: event.details || null,
      ip_address: event.ipAddress || null,
      user_agent: event.userAgent || null,
    })

    if (error) {
      console.error('[Audit] Failed to log event:', error)
    }
  } catch (err) {
    // Never throw - audit logging should never break the app
    console.error('[Audit] Exception logging event:', err)
  }
}

// ============================================
// Request Helpers
// ============================================

/**
 * Extract audit context from a request object.
 *
 * @param request - The incoming request
 * @returns IP address and user agent
 */
export function getAuditContext(request: Request): {
  ipAddress?: string
  userAgent?: string
} {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  }
}

/**
 * Log an audit event with request context.
 *
 * Convenience function that extracts IP and user agent from the request.
 *
 * @param event - The audit event (without IP/UA)
 * @param request - The incoming request
 */
export async function logAuditEventWithRequest(
  event: Omit<AuditEvent, 'ipAddress' | 'userAgent'>,
  request: Request
): Promise<void> {
  const context = getAuditContext(request)
  await logAuditEvent({
    ...event,
    ...context,
  })
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Log an authentication event.
 */
export async function logAuthEvent(
  action: Extract<AuditAction, `auth.${string}`>,
  userId: string | undefined,
  request: Request,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEventWithRequest(
    {
      action,
      resourceType: 'user',
      resourceId: userId,
      userId,
      details,
    },
    request
  )
}

/**
 * Log a Plaid-related event.
 */
export async function logPlaidEvent(
  action: Extract<AuditAction, `plaid.${string}`>,
  plaidItemId: string,
  workspaceId: string,
  userId: string,
  request?: Request,
  details?: Record<string, unknown>
): Promise<void> {
  const context = request ? getAuditContext(request) : {}
  await logAuditEvent({
    action,
    resourceType: 'plaid_item',
    resourceId: plaidItemId,
    workspaceId,
    userId,
    details,
    ...context,
  })
}

/**
 * Log a Nylas-related event.
 */
export async function logNylasEvent(
  action: Extract<AuditAction, `nylas.${string}`>,
  nylasGrantId: string,
  workspaceId: string,
  userId: string,
  request?: Request,
  details?: Record<string, unknown>
): Promise<void> {
  const context = request ? getAuditContext(request) : {}
  await logAuditEvent({
    action,
    resourceType: 'nylas_grant',
    resourceId: nylasGrantId,
    workspaceId,
    userId,
    details,
    ...context,
  })
}

/**
 * Log a resource CRUD event.
 */
export async function logResourceEvent(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string,
  workspaceId: string,
  userId: string,
  request?: Request,
  details?: Record<string, unknown>
): Promise<void> {
  const context = request ? getAuditContext(request) : {}
  await logAuditEvent({
    action,
    resourceType,
    resourceId,
    workspaceId,
    userId,
    details,
    ...context,
  })
}
