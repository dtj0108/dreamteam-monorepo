import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  dateRangeSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Calendar event colors
const CALENDAR_EVENT_COLORS = {
  income: '#22c55e',
  expense: '#ef4444',
  subscription: '#f97316',
  budget_reset: '#8b5cf6',
}

// Tool definitions for analytics
export const analyticsTools = {
  analytics_get_income_vs_expense: {
    description: 'Get income vs expense summary for a date range',
    inputSchema: workspaceIdSchema.extend({
      start_date: z.string().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().describe('End date (YYYY-MM-DD)'),
      group_by: z.enum(['day', 'week', 'month']).optional().describe('How to group results'),
    }),
    handler: analyticsGetIncomeVsExpense,
  },

  analytics_get_spending_by_category: {
    description: 'Get spending breakdown by category',
    inputSchema: workspaceIdSchema.merge(dateRangeSchema).extend({
      limit: z.number().int().positive().optional().default(10).describe('Number of top categories'),
    }),
    handler: analyticsGetSpendingByCategory,
  },

  analytics_get_net_worth: {
    description: 'Calculate total net worth across all accounts',
    inputSchema: workspaceIdSchema,
    handler: analyticsGetNetWorth,
  },

  analytics_get_cash_flow: {
    description: 'Get cash flow analysis for a date range',
    inputSchema: workspaceIdSchema.extend({
      start_date: z.string().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().describe('End date (YYYY-MM-DD)'),
    }),
    handler: analyticsGetCashFlow,
  },

  analytics_get_trends: {
    description: 'Get spending and income trends over time',
    inputSchema: workspaceIdSchema.extend({
      months: z.number().int().positive().optional().default(6).describe('Number of months to analyze'),
    }),
    handler: analyticsGetTrends,
  },

  analytics_get_profit_loss: {
    description: 'Get profit & loss statement for a date range',
    inputSchema: workspaceIdSchema.extend({
      start_date: z.string().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().describe('End date (YYYY-MM-DD)'),
    }),
    handler: analyticsGetProfitLoss,
  },

  analytics_project_cash_flow: {
    description: 'Project future cash flow based on recurring transactions',
    inputSchema: workspaceIdSchema.extend({
      months_ahead: z.number().int().positive().optional().default(3).describe('Months to project ahead'),
    }),
    handler: analyticsProjectCashFlow,
  },

  analytics_get_calendar_events: {
    description: 'Get financial events (subscriptions, recurring, budget resets) for calendar view',
    inputSchema: workspaceIdSchema.extend({
      start_date: z.string().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().describe('End date (YYYY-MM-DD)'),
    }),
    handler: analyticsGetCalendarEvents,
  },
}

// Handler implementations

async function analyticsGetIncomeVsExpense(params: {
  workspace_id?: string
  start_date: string
  end_date: string
  group_by?: 'day' | 'week' | 'month'
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get workspace accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []
    if (accountIds.length === 0) {
      return success({
        income: 0,
        expenses: 0,
        net: 0,
        period: { start: params.start_date, end: params.end_date },
      })
    }

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, date')
      .in('account_id', accountIds)
      .gte('date', params.start_date)
      .lte('date', params.end_date)

    if (txError) {
      return error(`Database error: ${txError.message}`, 'database')
    }

    let totalIncome = 0
    let totalExpenses = 0

    // If grouping, organize by period
    const grouped: Record<string, { income: number; expenses: number }> = {}

    for (const tx of transactions || []) {
      if (tx.amount > 0) {
        totalIncome += tx.amount
      } else {
        totalExpenses += Math.abs(tx.amount)
      }

      if (params.group_by) {
        const date = new Date(tx.date)
        let key: string

        switch (params.group_by) {
          case 'day':
            key = tx.date
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = weekStart.toISOString().split('T')[0]
            break
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
        }

        if (!grouped[key]) {
          grouped[key] = { income: 0, expenses: 0 }
        }
        if (tx.amount > 0) {
          grouped[key].income += tx.amount
        } else {
          grouped[key].expenses += Math.abs(tx.amount)
        }
      }
    }

    const result: Record<string, unknown> = {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      period: { start: params.start_date, end: params.end_date },
    }

    if (params.group_by) {
      result.grouped = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data]) => ({
          period,
          income: Math.round(data.income * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          net: Math.round((data.income - data.expenses) * 100) / 100,
        }))
      result.group_by = params.group_by
    }

    return success(result)
  } catch (err) {
    return error(`Failed to get income vs expense: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsGetSpendingByCategory(params: {
  workspace_id?: string
  start_date?: string
  end_date?: string
  limit?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get workspace accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []
    if (accountIds.length === 0) {
      return success({ categories: [], total_spending: 0 })
    }

    let query = supabase
      .from('transactions')
      .select('amount, category:categories(id, name, color, icon)')
      .in('account_id', accountIds)
      .lt('amount', 0) // Only expenses
      .not('category_id', 'is', null)

    if (params.start_date) {
      query = query.gte('date', params.start_date)
    }
    if (params.end_date) {
      query = query.lte('date', params.end_date)
    }

    const { data: transactions, error: txError } = await query

    if (txError) {
      return error(`Database error: ${txError.message}`, 'database')
    }

    // Aggregate by category
    const categoryTotals: Record<
      string,
      { name: string; color: string | null; icon: string | null; total: number; count: number }
    > = {}

    let totalSpending = 0

    for (const tx of transactions || []) {
      const cat = tx.category as unknown as { id: string; name: string; color: string | null; icon: string | null } | null
      if (!cat) continue

      const catId = cat.id
      if (!categoryTotals[catId]) {
        categoryTotals[catId] = {
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          total: 0,
          count: 0,
        }
      }

      const amount = Math.abs(tx.amount)
      categoryTotals[catId].total += amount
      categoryTotals[catId].count += 1
      totalSpending += amount
    }

    // Sort and limit
    const categories = Object.entries(categoryTotals)
      .map(([id, data]) => ({
        category_id: id,
        ...data,
        total: Math.round(data.total * 100) / 100,
        percentage: totalSpending > 0 ? Math.round((data.total / totalSpending) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, params.limit || 10)

    return success({
      categories,
      total_spending: Math.round(totalSpending * 100) / 100,
      date_range: {
        start: params.start_date || 'all time',
        end: params.end_date || 'present',
      },
    })
  } catch (err) {
    return error(`Failed to get spending by category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsGetNetWorth(params: { workspace_id?: string }): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data: accounts, error: dbError } = await supabase
      .from('accounts')
      .select('id, name, type, balance, currency, is_active')
      .eq('workspace_id', workspace_id)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const activeAccounts = accounts?.filter((a) => a.is_active) || []

    // Calculate by type
    const byType: Record<string, { total: number; count: number; accounts: string[] }> = {}
    let totalAssets = 0
    let totalLiabilities = 0

    for (const account of activeAccounts) {
      if (!byType[account.type]) {
        byType[account.type] = { total: 0, count: 0, accounts: [] }
      }

      byType[account.type].total += account.balance
      byType[account.type].count += 1
      byType[account.type].accounts.push(account.name)

      // Credit and loan are liabilities
      if (account.type === 'credit' || account.type === 'loan') {
        totalLiabilities += Math.abs(account.balance)
      } else {
        totalAssets += account.balance
      }
    }

    return success({
      net_worth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
      total_assets: Math.round(totalAssets * 100) / 100,
      total_liabilities: Math.round(totalLiabilities * 100) / 100,
      by_account_type: Object.entries(byType).map(([type, data]) => ({
        type,
        total: Math.round(data.total * 100) / 100,
        account_count: data.count,
      })),
      account_count: activeAccounts.length,
    })
  } catch (err) {
    return error(`Failed to calculate net worth: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsGetCashFlow(params: {
  workspace_id?: string
  start_date: string
  end_date: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const result = await analyticsGetIncomeVsExpense({
      workspace_id,
      start_date: params.start_date,
      end_date: params.end_date,
      group_by: 'day',
    })

    if (result.isError) return result

    const data = JSON.parse(result.content[0].text)

    // Add cumulative totals
    let cumulative = 0
    const dailyCashFlow = (data.grouped || []).map((day: { period: string; net: number }) => {
      cumulative += day.net
      return {
        ...day,
        cumulative: Math.round(cumulative * 100) / 100,
      }
    })

    // Calculate key metrics
    const positiveFlowDays = dailyCashFlow.filter((d: { net: number }) => d.net > 0).length
    const negativeFlowDays = dailyCashFlow.filter((d: { net: number }) => d.net < 0).length
    const avgDailyNet = data.net / Math.max(dailyCashFlow.length, 1)

    return success({
      summary: {
        income: data.income,
        expenses: data.expenses,
        net: data.net,
        period: data.period,
      },
      metrics: {
        average_daily_net: Math.round(avgDailyNet * 100) / 100,
        positive_flow_days: positiveFlowDays,
        negative_flow_days: negativeFlowDays,
        total_days: dailyCashFlow.length,
      },
      daily_cash_flow: dailyCashFlow,
    })
  } catch (err) {
    return error(`Failed to get cash flow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsGetTrends(params: {
  workspace_id?: string
  months?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const numMonths = params.months || 6

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - numMonths)

    const result = await analyticsGetIncomeVsExpense({
      workspace_id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      group_by: 'month',
    })

    if (result.isError) return result

    const data = JSON.parse(result.content[0].text)
    const monthlyData = data.grouped || []

    // Calculate trends
    if (monthlyData.length < 2) {
      return success({
        monthly_data: monthlyData,
        trends: { income: 'insufficient_data', expenses: 'insufficient_data', net: 'insufficient_data' },
        period: { months: numMonths },
      })
    }

    // Simple trend calculation (compare first half to second half)
    const halfPoint = Math.floor(monthlyData.length / 2)
    const firstHalf = monthlyData.slice(0, halfPoint)
    const secondHalf = monthlyData.slice(halfPoint)

    const avgFirstIncome = firstHalf.reduce((s: number, m: { income: number }) => s + m.income, 0) / halfPoint
    const avgSecondIncome = secondHalf.reduce((s: number, m: { income: number }) => s + m.income, 0) / (monthlyData.length - halfPoint)
    const avgFirstExpense = firstHalf.reduce((s: number, m: { expenses: number }) => s + m.expenses, 0) / halfPoint
    const avgSecondExpense = secondHalf.reduce((s: number, m: { expenses: number }) => s + m.expenses, 0) / (monthlyData.length - halfPoint)

    const incomeTrend = avgSecondIncome > avgFirstIncome * 1.05 ? 'increasing' : avgSecondIncome < avgFirstIncome * 0.95 ? 'decreasing' : 'stable'
    const expenseTrend = avgSecondExpense > avgFirstExpense * 1.05 ? 'increasing' : avgSecondExpense < avgFirstExpense * 0.95 ? 'decreasing' : 'stable'

    return success({
      monthly_data: monthlyData,
      trends: {
        income: incomeTrend,
        expenses: expenseTrend,
        income_change_percent: Math.round(((avgSecondIncome - avgFirstIncome) / Math.max(avgFirstIncome, 1)) * 10000) / 100,
        expenses_change_percent: Math.round(((avgSecondExpense - avgFirstExpense) / Math.max(avgFirstExpense, 1)) * 10000) / 100,
      },
      averages: {
        monthly_income: Math.round((data.income / numMonths) * 100) / 100,
        monthly_expenses: Math.round((data.expenses / numMonths) * 100) / 100,
        monthly_net: Math.round((data.net / numMonths) * 100) / 100,
      },
      totals: {
        income: data.income,
        expenses: data.expenses,
        net: data.net,
      },
      period: { months: numMonths },
    })
  } catch (err) {
    return error(`Failed to get trends: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsGetProfitLoss(params: {
  workspace_id?: string
  start_date: string
  end_date: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get workspace accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []
    if (accountIds.length === 0) {
      return success({
        income: { total: 0, categories: [] },
        expenses: { total: 0, categories: [] },
        net_profit: 0,
        period: { start: params.start_date, end: params.end_date },
      })
    }

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, category:categories(id, name, type)')
      .in('account_id', accountIds)
      .gte('date', params.start_date)
      .lte('date', params.end_date)
      .not('category_id', 'is', null)

    if (txError) {
      return error(`Database error: ${txError.message}`, 'database')
    }

    // Separate income and expenses by category
    const incomeCategories: Record<string, { name: string; total: number }> = {}
    const expenseCategories: Record<string, { name: string; total: number }> = {}

    let totalIncome = 0
    let totalExpenses = 0

    for (const tx of transactions || []) {
      const cat = tx.category as unknown as { id: string; name: string; type: string } | null
      if (!cat) continue

      if (tx.amount > 0 || cat.type === 'income') {
        if (!incomeCategories[cat.id]) {
          incomeCategories[cat.id] = { name: cat.name, total: 0 }
        }
        incomeCategories[cat.id].total += Math.abs(tx.amount)
        totalIncome += Math.abs(tx.amount)
      } else {
        if (!expenseCategories[cat.id]) {
          expenseCategories[cat.id] = { name: cat.name, total: 0 }
        }
        expenseCategories[cat.id].total += Math.abs(tx.amount)
        totalExpenses += Math.abs(tx.amount)
      }
    }

    return success({
      income: {
        total: Math.round(totalIncome * 100) / 100,
        categories: Object.values(incomeCategories)
          .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
          .sort((a, b) => b.total - a.total),
      },
      expenses: {
        total: Math.round(totalExpenses * 100) / 100,
        categories: Object.values(expenseCategories)
          .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
          .sort((a, b) => b.total - a.total),
      },
      net_profit: Math.round((totalIncome - totalExpenses) * 100) / 100,
      profit_margin:
        totalIncome > 0
          ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 10000) / 100
          : 0,
      period: { start: params.start_date, end: params.end_date },
    })
  } catch (err) {
    return error(`Failed to get P&L: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsProjectCashFlow(params: {
  workspace_id?: string
  months_ahead?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get current net worth
    const netWorthResult = await analyticsGetNetWorth({ workspace_id })
    if (netWorthResult.isError) return netWorthResult

    const netWorthData = JSON.parse(netWorthResult.content[0].text)
    let currentBalance = netWorthData.net_worth

    // Get workspace accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []

    // Get active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('name, amount, frequency, next_renewal_date')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    if (subError) {
      return error(`Database error: ${subError.message}`, 'database')
    }

    // Get recurring rules
    const { data: recurringRules, error: rrError } = await supabase
      .from('recurring_rules')
      .select('description, amount, frequency, next_date')
      .in('account_id', accountIds)
      .eq('is_active', true)

    if (rrError) {
      return error(`Database error: ${rrError.message}`, 'database')
    }

    // Project each month
    const monthsAhead = params.months_ahead || 3
    const projections: Array<{
      month: string
      starting_balance: number
      projected_income: number
      projected_expenses: number
      ending_balance: number
    }> = []

    const now = new Date()

    for (let i = 0; i < monthsAhead; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)

      let projectedIncome = 0
      let projectedExpenses = 0

      // Add recurring rules
      for (const rule of recurringRules || []) {
        const nextDate = new Date(rule.next_date)
        if (nextDate >= monthStart && nextDate <= monthEnd) {
          if (rule.amount > 0) {
            projectedIncome += rule.amount
          } else {
            projectedExpenses += Math.abs(rule.amount)
          }
        }
      }

      // Add subscriptions
      for (const sub of subscriptions || []) {
        const nextDate = new Date(sub.next_renewal_date)
        if (nextDate >= monthStart && nextDate <= monthEnd) {
          projectedExpenses += Math.abs(sub.amount)
        }
      }

      const startingBalance = currentBalance
      currentBalance = currentBalance + projectedIncome - projectedExpenses

      projections.push({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        starting_balance: Math.round(startingBalance * 100) / 100,
        projected_income: Math.round(projectedIncome * 100) / 100,
        projected_expenses: Math.round(projectedExpenses * 100) / 100,
        ending_balance: Math.round(currentBalance * 100) / 100,
      })
    }

    return success({
      current_net_worth: netWorthData.net_worth,
      projections,
      months_projected: monthsAhead,
      disclaimer: 'Projections based on active subscriptions and recurring rules only',
    })
  } catch (err) {
    return error(`Failed to project cash flow: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function analyticsGetCalendarEvents(params: {
  workspace_id?: string
  start_date: string
  end_date: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const events: Array<{
      id: string
      type: string
      date: string
      title: string
      amount: number
      category?: string
      color: string
    }> = []

    // Get subscriptions in range
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, name, amount, next_renewal_date, category:categories(name)')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .gte('next_renewal_date', params.start_date)
      .lte('next_renewal_date', params.end_date)

    if (subError) {
      return error(`Database error: ${subError.message}`, 'database')
    }

    for (const sub of subscriptions || []) {
      const cat = sub.category as unknown as { name: string } | null
      events.push({
        id: `sub-${sub.id}`,
        type: 'subscription',
        date: sub.next_renewal_date,
        title: sub.name,
        amount: Math.abs(sub.amount),
        category: cat?.name,
        color: CALENDAR_EVENT_COLORS.subscription,
      })
    }

    // Get workspace accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []

    // Get recurring rules in range
    if (accountIds.length > 0) {
      const { data: recurringRules, error: rrError } = await supabase
        .from('recurring_rules')
        .select('id, description, amount, next_date, category:categories(name, type)')
        .in('account_id', accountIds)
        .eq('is_active', true)
        .gte('next_date', params.start_date)
        .lte('next_date', params.end_date)

      if (rrError) {
        return error(`Database error: ${rrError.message}`, 'database')
      }

      for (const rule of recurringRules || []) {
        const cat = rule.category as unknown as { name: string; type: string } | null
        const isIncome = cat?.type === 'income' || rule.amount > 0
        events.push({
          id: `rule-${rule.id}`,
          type: isIncome ? 'income' : 'expense',
          date: rule.next_date,
          title: rule.description,
          amount: Math.abs(rule.amount),
          category: cat?.name,
          color: isIncome ? CALENDAR_EVENT_COLORS.income : CALENDAR_EVENT_COLORS.expense,
        })
      }
    }

    // Get budget reset dates
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('id, amount, period, start_date, category:categories(name)')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    if (budgetError) {
      return error(`Database error: ${budgetError.message}`, 'database')
    }

    const rangeStart = new Date(params.start_date)
    const rangeEnd = new Date(params.end_date)

    for (const budget of budgets || []) {
      const cat = budget.category as unknown as { name: string } | null
      // Calculate reset dates in range
      let current = new Date(budget.start_date)

      while (current <= rangeEnd) {
        if (current >= rangeStart) {
          events.push({
            id: `budget-${budget.id}-${current.toISOString().split('T')[0]}`,
            type: 'budget_reset',
            date: current.toISOString().split('T')[0],
            title: `${cat?.name || 'Budget'} resets`,
            amount: budget.amount,
            category: cat?.name,
            color: CALENDAR_EVENT_COLORS.budget_reset,
          })
        }

        // Move to next period
        switch (budget.period) {
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
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return success({
      events,
      count: events.length,
      date_range: { start: params.start_date, end: params.end_date },
    })
  } catch (err) {
    return error(`Failed to get calendar events: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
