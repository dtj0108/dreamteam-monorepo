import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns'

interface JoinedCategory { type: string }

export async function GET() {
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

    const supabase = createAdminClient()

    // Get workspace's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, type, balance')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    // Current month
    const now = new Date()
    const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    // Last month
    const lastMonth = subMonths(now, 1)
    const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
    const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd')

    // Last 6 months for trend
    const sixMonthsAgo = subMonths(now, 5)
    const trendStart = format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd')

    if (accountIds.length === 0) {
      const months = eachMonthOfInterval({ start: new Date(trendStart), end: new Date(currentMonthEnd) })
      return NextResponse.json({
        currentMonth: { income: 0, expenses: 0, profit: 0 },
        lastMonth: { income: 0, expenses: 0, profit: 0 },
        allTime: { income: 0, expenses: 0, profit: 0 },
        changes: { income: 0, expenses: 0, profit: 0 },
        totalBalance: 0,
        accountCount: 0,
        trend: months.map(m => ({ month: format(m, 'yyyy-MM'), label: format(m, 'MMM'), income: 0, expenses: 0, profit: 0 })),
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Get ALL transactions (for all-time totals)
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount, date, categories (type)')
      .in('account_id', accountIds)

    // Get current month transactions
    const { data: currentTransactions } = await supabase
      .from('transactions')
      .select('amount, categories (type)')
      .in('account_id', accountIds)
      .gte('date', currentMonthStart)
      .lte('date', currentMonthEnd)

    // Get last month transactions
    const { data: lastTransactions } = await supabase
      .from('transactions')
      .select('amount, categories (type)')
      .in('account_id', accountIds)
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd)

    // Get 6-month trend
    const { data: trendTransactions } = await supabase
      .from('transactions')
      .select('amount, date, categories (type)')
      .in('account_id', accountIds)
      .gte('date', trendStart)
      .lte('date', currentMonthEnd)
      .order('date', { ascending: true })

    // Calculate ALL-TIME totals
    let allTimeIncome = 0
    let allTimeExpenses = 0
    for (const tx of allTransactions || []) {
      const category = tx.categories as JoinedCategory | null
      if (category?.type === 'income' || tx.amount > 0) {
        allTimeIncome += Math.abs(tx.amount)
      } else {
        allTimeExpenses += Math.abs(tx.amount)
      }
    }

    // Calculate current month totals
    let currentIncome = 0
    let currentExpenses = 0
    for (const tx of currentTransactions || []) {
      const category = tx.categories as JoinedCategory | null
      if (category?.type === 'income' || tx.amount > 0) {
        currentIncome += Math.abs(tx.amount)
      } else {
        currentExpenses += Math.abs(tx.amount)
      }
    }

    // Calculate last month totals
    let lastIncome = 0
    let lastExpenses = 0
    for (const tx of lastTransactions || []) {
      const category = tx.categories as JoinedCategory | null
      if (category?.type === 'income' || tx.amount > 0) {
        lastIncome += Math.abs(tx.amount)
      } else {
        lastExpenses += Math.abs(tx.amount)
      }
    }

    // Build 6-month trend
    const months = eachMonthOfInterval({ start: new Date(trendStart), end: new Date(currentMonthEnd) })
    const monthlyData: Record<string, { income: number; expenses: number }> = {}
    months.forEach(m => {
      monthlyData[format(m, 'yyyy-MM')] = { income: 0, expenses: 0 }
    })

    for (const tx of trendTransactions || []) {
      const monthKey = format(new Date(tx.date), 'yyyy-MM')
      const category = tx.categories as JoinedCategory | null
      if (monthlyData[monthKey]) {
        if (category?.type === 'income' || tx.amount > 0) {
          monthlyData[monthKey].income += Math.abs(tx.amount)
        } else {
          monthlyData[monthKey].expenses += Math.abs(tx.amount)
        }
      }
    }

    const trend = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      label: format(new Date(month + '-01'), 'MMM'),
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }))

    // Calculate total balance
    const totalBalance = (accounts || []).reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0)

    // Calculate changes
    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0
    const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0
    const currentProfit = currentIncome - currentExpenses
    const lastProfit = lastIncome - lastExpenses
    const profitChange = lastProfit !== 0 ? ((currentProfit - lastProfit) / Math.abs(lastProfit)) * 100 : 0

    return NextResponse.json({
      currentMonth: {
        income: currentIncome,
        expenses: currentExpenses,
        profit: currentProfit,
      },
      lastMonth: {
        income: lastIncome,
        expenses: lastExpenses,
        profit: lastProfit,
      },
      allTime: {
        income: allTimeIncome,
        expenses: allTimeExpenses,
        profit: allTimeIncome - allTimeExpenses,
      },
      changes: {
        income: incomeChange,
        expenses: expensesChange,
        profit: profitChange,
      },
      totalBalance,
      accountCount: accounts?.length || 0,
      trend,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Overview API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch overview data' },
      { status: 500 }
    )
  }
}
