import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { format, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns'

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
    const groupBy = searchParams.get('groupBy') || 'month' // day, week, month

    const supabase = createAdminClient()

    // Get workspace's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    // Get all transactions first to determine date range
    let query = supabase
      .from('transactions')
      .select('id, amount, date')
      .in('account_id', accountIds)
      .order('date', { ascending: true })

    // Apply date filters only if provided
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data: transactions, error } = await query

    if (error) throw error

    // Calculate effective date range from transactions
    const txDates = (transactions || []).map((t: any) => new Date(t.date))
    const minDate = txDates.length > 0 ? new Date(Math.min(...txDates.map((d: Date) => d.getTime()))) : new Date()
    const maxDate = txDates.length > 0 ? new Date(Math.max(...txDates.map((d: Date) => d.getTime()))) : new Date()
    const effectiveStartDate = startDate ? new Date(startDate) : minDate
    const effectiveEndDate = endDate ? new Date(endDate) : maxDate

    // Initialize periods based on groupBy
    let periods: { key: string; label: string }[] = []

    if (effectiveStartDate <= effectiveEndDate) {
      if (groupBy === 'month') {
        const months = eachMonthOfInterval({ start: effectiveStartDate, end: effectiveEndDate })
        periods = months.map(m => ({
          key: format(m, 'yyyy-MM'),
          label: format(m, 'MMM yyyy'),
        }))
      } else if (groupBy === 'week') {
        const weeks = eachWeekOfInterval({ start: effectiveStartDate, end: effectiveEndDate })
        periods = weeks.map((w, i) => ({
          key: format(w, 'yyyy-MM-dd'),
          label: `Week ${i + 1}`,
        }))
      }
    }

    if (accountIds.length === 0) {
      return NextResponse.json({
        period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time', groupBy },
        summary: { totalInflow: 0, totalOutflow: 0, netCashFlow: 0, avgMonthlyInflow: 0, avgMonthlyOutflow: 0 },
        trend: periods.map(p => ({ period: p.key, label: p.label, inflow: 0, outflow: 0, netFlow: 0, runningBalance: 0 })),
      })
    }

    // Initialize cash flow data
    const cashFlowData: Record<string, { inflow: number; outflow: number }> = {}
    periods.forEach(p => {
      cashFlowData[p.key] = { inflow: 0, outflow: 0 }
    })

    let totalInflow = 0
    let totalOutflow = 0

    for (const tx of transactions || []) {
      const amount = tx.amount
      let periodKey: string

      if (groupBy === 'month') {
        periodKey = format(new Date(tx.date), 'yyyy-MM')
      } else if (groupBy === 'week') {
        // Find the week this date falls into
        const txDate = new Date(tx.date)
        const week = periods.find((p, i) => {
          const weekStart = new Date(p.key)
          const weekEnd = periods[i + 1] ? new Date(periods[i + 1].key) : effectiveEndDate
          return txDate >= weekStart && txDate < weekEnd
        })
        periodKey = week?.key || periods[periods.length - 1].key
      } else {
        periodKey = tx.date
      }

      if (cashFlowData[periodKey]) {
        if (amount > 0) {
          cashFlowData[periodKey].inflow += amount
          totalInflow += amount
        } else {
          cashFlowData[periodKey].outflow += Math.abs(amount)
          totalOutflow += Math.abs(amount)
        }
      }
    }

    // Build trend data with running balance
    let runningBalance = 0
    const trend = periods.map(p => {
      const data = cashFlowData[p.key]
      const netFlow = data.inflow - data.outflow
      runningBalance += netFlow
      return {
        period: p.key,
        label: p.label,
        inflow: data.inflow,
        outflow: data.outflow,
        netFlow,
        runningBalance,
      }
    })

    const netCashFlow = totalInflow - totalOutflow

    return NextResponse.json({
      period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time', groupBy },
      summary: {
        totalInflow,
        totalOutflow,
        netCashFlow,
        avgMonthlyInflow: totalInflow / Math.max(1, periods.length),
        avgMonthlyOutflow: totalOutflow / Math.max(1, periods.length),
      },
      trend,
    })
  } catch (error) {
    console.error('Cash Flow API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cash flow data' },
      { status: 500 }
    )
  }
}
