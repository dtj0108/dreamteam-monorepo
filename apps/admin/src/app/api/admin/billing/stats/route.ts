import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getBillingStats,
  getPlanDistribution,
  getSubscriptionMetrics30d,
} from '@/lib/stripe-analytics'

/**
 * GET /api/admin/billing/stats
 * Get comprehensive billing statistics
 */
export async function GET() {
  const { error } = await requireSuperadmin()
  if (error) return error

  try {
    // Fetch Stripe stats and DB stats in parallel
    const [stripeStats, planDistribution, subscriptionMetrics, dbStats] = await Promise.all([
      getBillingStats(),
      getPlanDistribution(),
      getSubscriptionMetrics30d(),
      getDBBillingStats(),
    ])

    return NextResponse.json({
      stats: stripeStats,
      planDistribution,
      subscriptionMetrics,
      alerts: dbStats.alerts,
      recentEvents: dbStats.recentEvents,
    })
  } catch (err) {
    console.error('[billing/stats] Error fetching billing stats:', err)
    return NextResponse.json(
      { error: 'Failed to fetch billing statistics' },
      { status: 500 }
    )
  }
}

/**
 * Get billing stats from the database (alerts, events)
 */
async function getDBBillingStats() {
  const supabase = createAdminClient()

  const [alertsResult, eventsResult] = await Promise.all([
    // Count unresolved alerts
    supabase
      .from('billing_alerts')
      .select('id, alert_type, severity', { count: 'exact' })
      .in('status', ['new', 'acknowledged']),
    // Get recent events
    supabase
      .from('billing_events')
      .select(`
        id,
        event_type,
        event_category,
        amount_cents,
        currency,
        created_at,
        workspace:workspaces(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    alerts: {
      total: alertsResult.count || 0,
      byType: groupAlertsByType(alertsResult.data || []),
      bySeverity: groupAlertsBySeverity(alertsResult.data || []),
    },
    recentEvents: eventsResult.data || [],
  }
}

function groupAlertsByType(alerts: { alert_type: string }[]) {
  const groups: Record<string, number> = {}
  for (const alert of alerts) {
    groups[alert.alert_type] = (groups[alert.alert_type] || 0) + 1
  }
  return groups
}

function groupAlertsBySeverity(alerts: { severity: string }[]) {
  const groups: Record<string, number> = {}
  for (const alert of alerts) {
    groups[alert.severity] = (groups[alert.severity] || 0) + 1
  }
  return groups
}
