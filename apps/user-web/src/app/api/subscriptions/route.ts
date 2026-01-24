import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import {
  getSubscriptions,
  getAllSubscriptions,
  getSubscriptionsSummary,
} from '@dreamteam/database/queries'
import type { CreateSubscriptionInput } from '@dreamteam/database/types'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const summaryOnly = searchParams.get('summary') === 'true'

    const supabase = createAdminClient()

    if (summaryOnly) {
      // Get summary for this workspace
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('amount, frequency, next_renewal_date')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)

      if (error) throw error

      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const frequencyToMonthly: Record<string, number> = {
        daily: 30,
        weekly: 4.33,
        biweekly: 2.17,
        monthly: 1,
        quarterly: 0.33,
        yearly: 0.083,
      }

      let totalMonthly = 0
      let upcomingThisWeek = 0

      for (const sub of subscriptions || []) {
        const multiplier = frequencyToMonthly[sub.frequency] || 1
        totalMonthly += Math.abs(sub.amount) * multiplier

        const renewalDate = new Date(sub.next_renewal_date)
        if (renewalDate >= today && renewalDate <= nextWeek) {
          upcomingThisWeek++
        }
      }

      return NextResponse.json({
        totalMonthly,
        activeCount: subscriptions?.length || 0,
        upcomingThisWeek,
      })
    }

    // Get subscriptions for this workspace
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspaceId)
      .order('next_renewal_date', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: subscriptions, error } = await query

    if (error) throw error

    return NextResponse.json(subscriptions || [])
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const body: CreateSubscriptionInput = await request.json()

    // Validate required fields
    if (!body.name || !body.merchant_pattern || !body.amount || !body.frequency || !body.next_renewal_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, merchant_pattern, amount, frequency, next_renewal_date' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: session.id,
        workspace_id: workspaceId,
        name: body.name,
        merchant_pattern: body.merchant_pattern,
        amount: body.amount,
        frequency: body.frequency,
        next_renewal_date: body.next_renewal_date,
        last_charge_date: body.last_charge_date || null,
        category_id: body.category_id || null,
        reminder_days_before: body.reminder_days_before || 3,
        is_auto_detected: body.is_auto_detected || false,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint)
      throw error
    }

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Failed to create subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

