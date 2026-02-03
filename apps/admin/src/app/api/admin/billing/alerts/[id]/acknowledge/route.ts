import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/billing/alerts/[id]/acknowledge
 * Acknowledge or resolve a billing alert
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id: alertId } = await params
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const action = body.action as 'acknowledge' | 'resolve' | 'dismiss'

    if (!['acknowledge', 'resolve', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be acknowledge, resolve, or dismiss' },
        { status: 400 }
      )
    }

    // Get current alert
    const { data: alert, error: fetchError } = await supabase
      .from('billing_alerts')
      .select('*')
      .eq('id', alertId)
      .single()

    if (fetchError || !alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Update based on action
    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'acknowledge':
        if (alert.status !== 'new') {
          return NextResponse.json(
            { error: 'Alert is not in new status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        }
        break
      case 'resolve':
        if (!['new', 'acknowledged'].includes(alert.status)) {
          return NextResponse.json(
            { error: 'Alert cannot be resolved from current status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        }
        break
      case 'dismiss':
        updateData = {
          status: 'dismissed',
        }
        break
    }

    const { data: updatedAlert, error: updateError } = await supabase
      .from('billing_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single()

    if (updateError) {
      console.error('[billing/alerts/acknowledge] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    return NextResponse.json({ alert: updatedAlert })
  } catch (err) {
    console.error('[billing/alerts/acknowledge] Error:', err)
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    )
  }
}
