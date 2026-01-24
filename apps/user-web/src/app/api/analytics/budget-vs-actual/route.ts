import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function GET(request: Request) {
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
    const startDate = searchParams.get('startDate') || null
    const endDate = searchParams.get('endDate') || null

    const supabase = createAdminClient()

    // Get workspace's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    // Get budgets for workspace
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select(`
        id,
        amount,
        period,
        category_id,
        categories (
          id,
          name,
          type,
          color
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    if (budgetsError) throw budgetsError

    if (accountIds.length === 0 || !budgets?.length) {
      return NextResponse.json({
        period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
        summary: { totalBudgeted: 0, totalActual: 0, totalVariance: 0, variancePercent: 0, budgetCount: 0, overBudgetCount: 0, underBudgetCount: 0 },
        comparison: [],
      })
    }

    // Get transactions for the period
    let query = supabase
      .from('transactions')
      .select('amount, category_id')
      .in('account_id', accountIds)

    // Apply date filters only if provided
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data: transactions, error: txError } = await query

    if (txError) throw txError

    // Calculate actual spending by category
    const actualByCategory: Record<string, number> = {}
    for (const tx of transactions || []) {
      if (tx.category_id && tx.amount < 0) { // Only expenses
        actualByCategory[tx.category_id] = (actualByCategory[tx.category_id] || 0) + Math.abs(tx.amount)
      }
    }

    // Build comparison data
    const comparison = (budgets || []).map((budget: any) => {
      const category = budget.categories as any
      const budgetAmount = budget.amount
      const actualAmount = actualByCategory[budget.category_id] || 0
      const variance = budgetAmount - actualAmount
      const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0
      const utilizationPercent = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0

      return {
        budgetId: budget.id,
        categoryId: budget.category_id,
        categoryName: category?.name || 'Unknown',
        categoryColor: category?.color || '#6b7280',
        budgetAmount,
        actualAmount,
        variance,
        variancePercent,
        utilizationPercent,
        status: actualAmount > budgetAmount ? 'over' : actualAmount >= budgetAmount * 0.8 ? 'warning' : 'under',
      }
    })

    // Summary stats
    const totalBudgeted = comparison.reduce((sum: number, c: any) => sum + c.budgetAmount, 0)
    const totalActual = comparison.reduce((sum: number, c: any) => sum + c.actualAmount, 0)
    const totalVariance = totalBudgeted - totalActual
    const overBudgetCount = comparison.filter((c: any) => c.status === 'over').length
    const underBudgetCount = comparison.filter((c: any) => c.status === 'under').length

    return NextResponse.json({
      period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance,
        variancePercent: totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0,
        budgetCount: comparison.length,
        overBudgetCount,
        underBudgetCount,
      },
      comparison: comparison.sort((a: any, b: any) => b.actualAmount - a.actualAmount),
    })
  } catch (error) {
    console.error('Budget vs Actual API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch budget comparison' },
      { status: 500 }
    )
  }
}
