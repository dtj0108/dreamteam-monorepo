import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { format, eachMonthOfInterval } from 'date-fns'

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

    if (accountIds.length === 0) {
      return NextResponse.json({
        period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
        summary: { totalExpenses: 0, transactionCount: 0, categoryCount: 0, avgDaily: 0, avgMonthly: 0 },
        byCategory: [],
        topCategories: [],
        monthlyTrend: [],
      })
    }

    // Get expense transactions
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        date,
        description,
        category_id,
        categories (
          id,
          name,
          type,
          color
        )
      `)
      .in('account_id', accountIds)
      .lt('amount', 0) // Expenses are negative
      .order('date', { ascending: true })

    // Apply date filters only if provided
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data: transactions, error } = await query

    if (error) throw error

    // Calculate totals by category
    const byCategory: Record<string, { id: string; name: string; amount: number; color: string; count: number }> = {}
    let totalExpenses = 0

    // Monthly trend data - calculate from transactions if no dates specified
    const txDates = (transactions || []).map((t: any) => new Date(t.date))
    const minDate = txDates.length > 0 ? new Date(Math.min(...txDates.map((d: Date) => d.getTime()))) : new Date()
    const maxDate = txDates.length > 0 ? new Date(Math.max(...txDates.map((d: Date) => d.getTime()))) : new Date()
    const effectiveStartDate = startDate ? new Date(startDate) : minDate
    const effectiveEndDate = endDate ? new Date(endDate) : maxDate

    const months = effectiveStartDate <= effectiveEndDate
      ? eachMonthOfInterval({ start: effectiveStartDate, end: effectiveEndDate })
      : []
    const monthlyData: Record<string, number> = {}
    months.forEach(m => {
      monthlyData[format(m, 'yyyy-MM')] = 0
    })

    for (const tx of transactions || []) {
      const category = tx.categories as any
      const amount = Math.abs(tx.amount)
      totalExpenses += amount

      // By category
      const catId = category?.id || 'uncategorized'
      if (!byCategory[catId]) {
        byCategory[catId] = {
          id: catId,
          name: category?.name || 'Uncategorized',
          amount: 0,
          color: category?.color || '#6b7280',
          count: 0,
        }
      }
      byCategory[catId].amount += amount
      byCategory[catId].count += 1

      // Monthly trend
      const monthKey = format(new Date(tx.date), 'yyyy-MM')
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += amount
      }
    }

    // Calculate averages
    const dayCount = Math.max(1, Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)))
    const avgDaily = totalExpenses / dayCount
    const avgMonthly = totalExpenses / Math.max(1, months.length)

    // Top categories
    const topCategories = Object.values(byCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // Prepare monthly trend for chart
    const monthlyTrend = Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      label: format(new Date(month + '-01'), 'MMM yyyy'),
      amount,
    }))

    return NextResponse.json({
      period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
      summary: {
        totalExpenses,
        transactionCount: transactions?.length || 0,
        categoryCount: Object.keys(byCategory).length,
        avgDaily,
        avgMonthly,
      },
      byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
      topCategories,
      monthlyTrend,
    })
  } catch (error) {
    console.error('Expenses API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch expense data' },
      { status: 500 }
    )
  }
}
