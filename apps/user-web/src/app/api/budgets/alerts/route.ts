import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

// GET /api/budgets/alerts?threshold=80
// Returns budgets where percentUsed >= threshold
export async function GET(request: NextRequest) {
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

    // Get threshold from query params (default 80%)
    const { searchParams } = new URL(request.url)
    const threshold = parseInt(searchParams.get('threshold') || '80', 10)

    const supabase = createAdminClient()

    // Get all active budgets with categories
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(id, name, icon)
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

    // Calculate spending for each budget and filter to those at/above threshold
    const alertBudgets = await Promise.all(
      (budgets || []).map(async (budget: any) => {
        const { start, end } = getBudgetPeriodDates(budget.period, budget.start_date)

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', budget.category_id)
          .gte('date', start)
          .lt('date', end)
          .lt('amount', 0) // Only expenses

        const spent = Math.abs(
          transactions?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
        )
        const remaining = Math.max(0, budget.amount - spent)
        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

        // Determine status
        let status: 'on_track' | 'warning' | 'exceeded' = 'on_track'
        if (percentUsed >= 100) {
          status = 'exceeded'
        } else if (percentUsed >= 80) {
          status = 'warning'
        }

        return {
          id: budget.id,
          category: budget.category,
          amount: budget.amount,
          spent: Math.round(spent * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          percentUsed: Math.round(percentUsed * 10) / 10,
          status,
          period: budget.period,
          periodStart: start,
          periodEnd: end,
        }
      })
    )

    // Filter to only budgets at or above threshold and sort by severity
    const filteredAlerts = alertBudgets
      .filter(budget => budget.percentUsed >= threshold)
      .sort((a, b) => {
        // Exceeded first, then by percentUsed descending
        if (a.status === 'exceeded' && b.status !== 'exceeded') return -1
        if (b.status === 'exceeded' && a.status !== 'exceeded') return 1
        return b.percentUsed - a.percentUsed
      })

    return NextResponse.json(filteredAlerts, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Budget alerts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget alerts' },
      { status: 500 }
    )
  }
}

// Helper function to get period dates (same as in /api/budgets/route.ts)
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
