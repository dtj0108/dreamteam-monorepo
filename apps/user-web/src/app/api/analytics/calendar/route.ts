import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

type CalendarEventType = 'subscription' | 'income' | 'expense' | 'budget_reset'
type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

interface CalendarEvent {
  id: string
  type: CalendarEventType
  date: string
  title: string
  amount?: number
  category?: string
  categoryColor?: string
  color: string
}

const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  subscription: '#f43f5e', // rose-500
  income: '#10b981', // emerald-500
  expense: '#f59e0b', // amber-500
  budget_reset: '#3b82f6', // blue-500
}

function getBudgetResetDatesInRange(
  period: BudgetPeriod,
  startDate: string,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = []
  const budgetStart = new Date(startDate)
  const current = new Date(budgetStart)

  // Move to first reset after budget start
  while (current < rangeStart) {
    switch (period) {
      case 'weekly':
        current.setDate(current.getDate() + 7)
        break
      case 'biweekly':
        current.setDate(current.getDate() + 14)
        break
      case 'monthly':
        current.setMonth(current.getMonth() + 1)
        break
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1)
        break
    }
  }

  // Collect all reset dates within range
  while (current <= rangeEnd) {
    dates.push(new Date(current))
    switch (period) {
      case 'weekly':
        current.setDate(current.getDate() + 7)
        break
      case 'biweekly':
        current.setDate(current.getDate() + 14)
        break
      case 'monthly':
        current.setMonth(current.getMonth() + 1)
        break
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1)
        break
    }
  }

  return dates
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const events: CalendarEvent[] = []
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    // 1. Get subscriptions (bills) within date range for this workspace
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .gte('next_renewal_date', startDate)
      .lte('next_renewal_date', endDate)

    if (subError) throw subError

    for (const sub of subscriptions || []) {
      events.push({
        id: `sub-${sub.id}`,
        type: 'subscription',
        date: sub.next_renewal_date,
        title: sub.name,
        amount: Math.abs(sub.amount),
        category: (sub.category as any)?.name,
        categoryColor: (sub.category as any)?.color,
        color: CALENDAR_EVENT_COLORS.subscription,
      })
    }

    // 2. Get recurring rules within date range for this workspace
    const { data: recurringRules, error: rrError } = await supabase
      .from('recurring_rules')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .gte('next_date', startDate)
      .lte('next_date', endDate)

    if (rrError) throw rrError

    for (const rule of recurringRules || []) {
      const isIncome = (rule.category as any)?.type === 'income'
      events.push({
        id: `rule-${rule.id}`,
        type: isIncome ? 'income' : 'expense',
        date: rule.next_date,
        title: rule.description,
        amount: Math.abs(rule.amount),
        category: (rule.category as any)?.name,
        categoryColor: (rule.category as any)?.color,
        color: isIncome ? CALENDAR_EVENT_COLORS.income : CALENDAR_EVENT_COLORS.expense,
      })
    }

    // 3. Get budget reset dates within range for this workspace
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    if (budgetError) throw budgetError

    for (const budget of budgets || []) {
      const resetDates = getBudgetResetDatesInRange(
        budget.period as BudgetPeriod,
        budget.start_date,
        rangeStart,
        rangeEnd
      )

      for (const date of resetDates) {
        events.push({
          id: `budget-${budget.id}-${date.toISOString().split('T')[0]}`,
          type: 'budget_reset',
          date: date.toISOString().split('T')[0],
          title: `${(budget.category as any)?.name || 'Budget'} resets`,
          amount: budget.amount,
          category: (budget.category as any)?.name,
          categoryColor: (budget.category as any)?.color,
          color: CALENDAR_EVENT_COLORS.budget_reset,
        })
      }
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
