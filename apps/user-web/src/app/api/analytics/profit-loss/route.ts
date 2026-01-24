import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { format } from 'date-fns'

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
    const compareWithPrevious = searchParams.get('compare') === 'true'

    const supabase = createAdminClient()

    // Get workspace's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    if (accountIds.length === 0) {
      return NextResponse.json({
        period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
        summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 },
        incomeByCategory: [],
        expensesByCategory: [],
        comparison: null,
      })
    }

    // Get transactions for the period
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        date,
        category_id,
        categories (
          id,
          name,
          type,
          color
        )
      `)
      .in('account_id', accountIds)
      .order('date', { ascending: true })

    // Apply date filters only if provided
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data: transactions, error } = await query

    if (error) throw error

    // Calculate totals
    let totalIncome = 0
    let totalExpenses = 0
    const incomeByCategory: Record<string, { name: string; amount: number; color: string }> = {}
    const expensesByCategory: Record<string, { name: string; amount: number; color: string }> = {}

    for (const tx of transactions || []) {
      const category = tx.categories as any
      const amount = Math.abs(tx.amount)

      // Determine category info (or use "Uncategorized")
      const catId = category?.id || 'uncategorized'
      const catName = category?.name || 'Uncategorized'
      const catColor = category?.color || '#94a3b8'

      if (category?.type === 'income' || tx.amount > 0) {
        totalIncome += amount
        if (!incomeByCategory[catId]) {
          incomeByCategory[catId] = { name: catName, amount: 0, color: catColor }
        }
        incomeByCategory[catId].amount += amount
      } else {
        totalExpenses += amount
        if (!expensesByCategory[catId]) {
          expensesByCategory[catId] = { name: catName, amount: 0, color: catColor }
        }
        expensesByCategory[catId].amount += amount
      }
    }

    const netProfit = totalIncome - totalExpenses
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

    // Compare with previous period if requested (only if dates are specified)
    let comparison = null
    if (compareWithPrevious && startDate && endDate) {
      const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime()
      const prevStartDate = format(new Date(new Date(startDate).getTime() - periodLength), 'yyyy-MM-dd')
      const prevEndDate = format(new Date(new Date(startDate).getTime() - 1), 'yyyy-MM-dd')

      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('amount, categories (type)')
        .in('account_id', accountIds)
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)

      let prevIncome = 0
      let prevExpenses = 0

      for (const tx of prevTransactions || []) {
        const category = tx.categories as any
        const amount = Math.abs(tx.amount)
        if (category?.type === 'income' || tx.amount > 0) {
          prevIncome += amount
        } else {
          prevExpenses += amount
        }
      }

      const prevNetProfit = prevIncome - prevExpenses

      comparison = {
        income: { previous: prevIncome, change: totalIncome - prevIncome, percentChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0 },
        expenses: { previous: prevExpenses, change: totalExpenses - prevExpenses, percentChange: prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0 },
        netProfit: { previous: prevNetProfit, change: netProfit - prevNetProfit, percentChange: prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0 },
      }
    }

    return NextResponse.json({
      period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
      },
      incomeByCategory: Object.values(incomeByCategory).sort((a, b) => b.amount - a.amount),
      expensesByCategory: Object.values(expensesByCategory).sort((a, b) => b.amount - a.amount),
      comparison,
    })
  } catch (error) {
    console.error('Profit/Loss API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profit/loss data' },
      { status: 500 }
    )
  }
}
