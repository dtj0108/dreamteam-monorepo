import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = auth.type === 'api_key' ? null : auth.userId
    const workspaceId = auth.type === 'api_key'
      ? auth.workspaceId
      : await getCurrentWorkspaceId(auth.userId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    const supabase = createAdminClient()

    // Get all budgets with categories and alerts
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(*),
        alerts:budget_alerts(*)
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (budgetsError) {
      console.error('Failed to fetch budgets:', budgetsError)
      return NextResponse.json(
        { error: 'Failed to fetch budgets' },
        { status: 500 }
      )
    }

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(
      (budgets || []).map(async (budget: any) => {
        const { start, end } = getBudgetPeriodDates(budget.period, budget.start_date)

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', budget.category_id)
          .gte('date', start)
          .lt('date', end)
          .lt('amount', 0)

        const spent = Math.abs(
          transactions?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
        )
        const remaining = Math.max(0, budget.amount - spent)
        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

        return {
          ...budget,
          spent,
          remaining,
          percentUsed,
          periodStart: start,
          periodEnd: end,
        }
      })
    )

    return NextResponse.json({ budgets: budgetsWithSpending }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Budgets API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = auth.type === 'api_key' ? null : auth.userId
    const workspaceId = auth.type === 'api_key'
      ? auth.workspaceId
      : await getCurrentWorkspaceId(auth.userId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    const body = await request.json()

    if (!body.category_id || !body.amount || !body.period) {
      return NextResponse.json(
        { error: 'category_id, amount, and period are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Create the budget
    const { data: budget, error } = await supabase
      .from('budgets')
      .insert({
        profile_id: userId!,
        workspace_id: workspaceId,
        category_id: body.category_id,
        amount: body.amount,
        period: body.period,
        start_date: body.start_date || new Date().toISOString().split('T')[0],
        rollover: body.rollover || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create budget:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create budget' },
        { status: 500 }
      )
    }

    // Create alerts if thresholds provided
    if (body.alert_thresholds && Array.isArray(body.alert_thresholds)) {
      const alerts = body.alert_thresholds.map((threshold: number) => ({
        budget_id: budget.id,
        threshold_percent: threshold,
      }))

      await supabase.from('budget_alerts').insert(alerts)
    }

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Create budget error:', error)
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    )
  }
}

// Helper function to get period dates
function getBudgetPeriodDates(period: string, startDate: string): { start: string; end: string } {
  const now = new Date()
  const budgetStart = new Date(startDate)

  let periodStart = new Date(budgetStart)
  let periodEnd = new Date(budgetStart)

  switch (period) {
    case 'weekly':
      while (periodEnd <= now) {
        periodStart = new Date(periodEnd)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodEnd.getDate() + 7)
      }
      break
    case 'biweekly':
      while (periodEnd <= now) {
        periodStart = new Date(periodEnd)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodEnd.getDate() + 14)
      }
      break
    case 'monthly':
      periodStart = new Date(now.getFullYear(), now.getMonth(), budgetStart.getDate())
      if (periodStart > now) {
        periodStart.setMonth(periodStart.getMonth() - 1)
      }
      periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      break
    case 'yearly':
      periodStart = new Date(now.getFullYear(), budgetStart.getMonth(), budgetStart.getDate())
      if (periodStart > now) {
        periodStart.setFullYear(periodStart.getFullYear() - 1)
      }
      periodEnd = new Date(periodStart)
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      break
  }

  return {
    start: periodStart.toISOString().split('T')[0],
    end: periodEnd.toISOString().split('T')[0],
  }
}

