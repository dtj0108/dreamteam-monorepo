import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@dreamteam/database/server'
import { format } from 'date-fns'

interface ReportRequest {
  startDate?: string
  endDate?: string
  accounts?: string[]
  categories?: string[]
  transactionType?: 'all' | 'income' | 'expense'
  minAmount?: number
  maxAmount?: number
  groupBy?: 'day' | 'week' | 'month' | 'category' | 'account'
  includeTransactions?: boolean
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('fb_session')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const profileId = session.id

    const body: ReportRequest = await request.json()
    const { startDate, endDate, accounts, categories, transactionType, minAmount, maxAmount, groupBy, includeTransactions } = body

    const supabase = createAdminClient()

    // Get user's accounts first (for filtering)
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', profileId)
    
    const userAccountIds = userAccounts?.map((a: { id: string }) => a.id) || []

    if (userAccountIds.length === 0) {
      return NextResponse.json({
        period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
        filters: { accounts, categories, transactionType, minAmount, maxAmount },
        summary: { totalIncome: 0, totalExpenses: 0, netAmount: 0, transactionCount: 0 },
        groupedData: [],
        transactions: [],
      })
    }

    // Use provided account filter or default to all user accounts
    const filterAccountIds = accounts && accounts.length > 0 
      ? accounts.filter(id => userAccountIds.includes(id))
      : userAccountIds

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        date,
        description,
        notes,
        account_id,
        category_id,
        accounts (id, name, type),
        categories (id, name, type, color)
      `)
      .in('account_id', filterAccountIds)
      .order('date', { ascending: true })

    // Apply date filters only if provided
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    // Apply filters
    if (categories && categories.length > 0) {
      query = query.in('category_id', categories)
    }

    if (transactionType === 'income') {
      query = query.gt('amount', 0)
    } else if (transactionType === 'expense') {
      query = query.lt('amount', 0)
    }

    if (minAmount !== undefined) {
      query = query.gte('amount', -Math.abs(minAmount)).lte('amount', Math.abs(minAmount))
    }

    if (maxAmount !== undefined) {
      // This is tricky because amounts can be negative (expenses)
      // For now, just filter by absolute value
    }

    const { data: transactions, error } = await query

    if (error) throw error

    // Calculate summary
    let totalIncome = 0
    let totalExpenses = 0
    
    for (const tx of transactions || []) {
      if (tx.amount > 0) {
        totalIncome += tx.amount
      } else {
        totalExpenses += Math.abs(tx.amount)
      }
    }

    // Group data if requested
    let groupedData: any[] = []
    
    if (groupBy) {
      const groups: Record<string, { key: string; label: string; income: number; expenses: number; net: number; count: number }> = {}

      for (const tx of transactions || []) {
        let groupKey: string
        let groupLabel: string

        switch (groupBy) {
          case 'day':
            groupKey = tx.date
            groupLabel = format(new Date(tx.date), 'MMM d, yyyy')
            break
          case 'week':
            const weekStart = new Date(tx.date)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            groupKey = format(weekStart, 'yyyy-MM-dd')
            groupLabel = `Week of ${format(weekStart, 'MMM d')}`
            break
          case 'month':
            groupKey = format(new Date(tx.date), 'yyyy-MM')
            groupLabel = format(new Date(tx.date), 'MMM yyyy')
            break
          case 'category':
            const cat = tx.categories as any
            groupKey = cat?.id || 'uncategorized'
            groupLabel = cat?.name || 'Uncategorized'
            break
          case 'account':
            const acc = tx.accounts as any
            groupKey = acc?.id || 'unknown'
            groupLabel = acc?.name || 'Unknown Account'
            break
          default:
            groupKey = 'all'
            groupLabel = 'All'
        }

        if (!groups[groupKey]) {
          groups[groupKey] = { key: groupKey, label: groupLabel, income: 0, expenses: 0, net: 0, count: 0 }
        }

        if (tx.amount > 0) {
          groups[groupKey].income += tx.amount
        } else {
          groups[groupKey].expenses += Math.abs(tx.amount)
        }
        groups[groupKey].net += tx.amount
        groups[groupKey].count += 1
      }

      groupedData = Object.values(groups).sort((a, b) => {
        if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
          return a.key.localeCompare(b.key)
        }
        return b.expenses - a.expenses || b.income - a.income
      })
    }

    // Format transactions for response
    const formattedTransactions = includeTransactions ? (transactions || []).map((tx: any) => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      notes: tx.notes,
      amount: tx.amount,
      accountName: (tx.accounts as any)?.name || 'Unknown',
      categoryName: (tx.categories as any)?.name || 'Uncategorized',
      categoryColor: (tx.categories as any)?.color || '#6b7280',
      type: tx.amount > 0 ? 'income' : 'expense',
    })) : []

    return NextResponse.json({
      period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
      filters: { accounts, categories, transactionType, minAmount, maxAmount },
      summary: {
        totalIncome,
        totalExpenses,
        netAmount: totalIncome - totalExpenses,
        transactionCount: transactions?.length || 0,
      },
      groupedData,
      transactions: formattedTransactions,
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    )
  }
}
