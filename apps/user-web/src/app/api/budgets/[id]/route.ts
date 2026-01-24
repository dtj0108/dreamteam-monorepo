import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const supabase = createAdminClient()

    const { data: budget, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(*),
        alerts:budget_alerts(*)
      `)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Calculate spending - get transactions from workspace accounts
    const { start, end } = getBudgetPeriodDates(budget.period, budget.start_date)

    // Get account IDs for this workspace
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    let transactions: any[] = []
    if (accountIds.length > 0) {
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .in('account_id', accountIds)
        .eq('category_id', budget.category_id)
        .gte('date', start)
        .lt('date', end)
        .lt('amount', 0)
        .order('date', { ascending: false })

      transactions = txData || []
    }

    const spent = Math.abs(
      transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0)
    )
    const remaining = Math.max(0, budget.amount - spent)
    const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

    return NextResponse.json({
      budget: {
        ...budget,
        spent,
        remaining,
        percentUsed,
        periodStart: start,
        periodEnd: end,
      },
      transactions,
    })
  } catch (error) {
    console.error('Get budget error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    // Verify ownership via workspace
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Update budget
    const updateData: Record<string, unknown> = {}
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.period !== undefined) updateData.period = body.period
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.rollover !== undefined) updateData.rollover = body.rollover
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: budget, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update budget' },
        { status: 500 }
      )
    }

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Update budget error:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const supabase = createAdminClient()

    // Verify ownership via workspace and delete
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete budget' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete budget error:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}

// Helper function
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
