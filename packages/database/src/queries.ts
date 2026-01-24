import { getSupabaseClient } from './client'
import type {
  Account,
  Category,
  Transaction,
  RecurringRule,
  Budget,
  BudgetAlert,
  BudgetWithCategory,
  BudgetWithSpending,
  TransactionWithCategory,
  Subscription,
  SubscriptionWithCategory,
  CreateAccountInput,
  UpdateAccountInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateRecurringRuleInput,
  UpdateRecurringRuleInput,
  CreateBudgetInput,
  UpdateBudgetInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CalendarEvent,
  BudgetPeriod,
} from './types'
import { CALENDAR_EVENT_COLORS } from './types'

// ============================================
// ACCOUNTS
// ============================================

export async function getAccounts(): Promise<Account[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getAccount(id: string): Promise<Account | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createAccount(input: CreateAccountInput, profileId: string): Promise<Account> {
  const supabase = getSupabaseClient()
  
  if (!profileId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      ...input,
      user_id: profileId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<Account> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('accounts')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// TRANSACTIONS
// ============================================

export async function getTransactions(options?: {
  accountId?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  categoryId?: string
}): Promise<TransactionWithCategory[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.accountId) {
    query = query.eq('account_id', options.accountId)
  }

  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId)
  }

  if (options?.startDate) {
    query = query.gte('date', options.startDate)
  }

  if (options?.endDate) {
    query = query.lte('date', options.endDate)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getTransaction(id: string): Promise<TransactionWithCategory | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// CATEGORIES
// ============================================

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getCategory(id: string): Promise<Category | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createCategory(input: CreateCategoryInput, profileId: string): Promise<Category> {
  const supabase = getSupabaseClient()
  
  if (!profileId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...input,
      user_id: profileId,
      is_system: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// RECURRING RULES
// ============================================

export async function getRecurringRules(): Promise<RecurringRule[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_rules')
    .select(`
      *,
      category:categories(*),
      account:accounts(*)
    `)
    .order('next_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getRecurringRule(id: string): Promise<RecurringRule | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_rules')
    .select(`
      *,
      category:categories(*),
      account:accounts(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createRecurringRule(input: CreateRecurringRuleInput): Promise<RecurringRule> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_rules')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRecurringRule(id: string, input: UpdateRecurringRuleInput): Promise<RecurringRule> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_rules')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// TRANSFERS
// ============================================

export async function createTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  date: string,
  description: string
): Promise<{ from: Transaction; to: Transaction }> {
  const supabase = getSupabaseClient()
  
  // Create the "from" transaction (negative amount)
  const { data: fromTx, error: fromError } = await supabase
    .from('transactions')
    .insert({
      account_id: fromAccountId,
      category_id: '00000000-0000-0000-0002-000000000001', // Transfer category
      amount: -Math.abs(amount),
      date,
      description: `Transfer to: ${description}`,
      is_transfer: true,
    })
    .select()
    .single()

  if (fromError) throw fromError

  // Create the "to" transaction (positive amount)
  const { data: toTx, error: toError } = await supabase
    .from('transactions')
    .insert({
      account_id: toAccountId,
      category_id: '00000000-0000-0000-0002-000000000001', // Transfer category
      amount: Math.abs(amount),
      date,
      description: `Transfer from: ${description}`,
      is_transfer: true,
      transfer_pair_id: fromTx.id,
    })
    .select()
    .single()

  if (toError) throw toError

  // Update the from transaction with the pair ID
  await supabase
    .from('transactions')
    .update({ transfer_pair_id: toTx.id })
    .eq('id', fromTx.id)

  return { from: fromTx, to: toTx }
}

// ============================================
// BUDGETS
// ============================================

/**
 * Get the date range for a budget period starting from a given date
 */
function getBudgetPeriodDates(period: string, startDate: string): { start: string; end: string } {
  const now = new Date()
  const budgetStart = new Date(startDate)
  
  // Find the current period start date
  let periodStart = new Date(budgetStart)
  let periodEnd = new Date(budgetStart)
  
  switch (period) {
    case 'weekly':
      // Find the most recent period start (every 7 days from start_date)
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
      // Find current month's period
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

export async function getBudgets(): Promise<BudgetWithCategory[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('budgets')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getBudgetsWithSpending(): Promise<BudgetWithSpending[]> {
  const supabase = getSupabaseClient()
  
  // Get all budgets with categories
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select(`
      *,
      category:categories(*),
      alerts:budget_alerts(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (budgetsError) throw budgetsError
  if (!budgets || budgets.length === 0) return []

  // Calculate spending for each budget
  const budgetsWithSpending: BudgetWithSpending[] = await Promise.all(
    budgets.map(async (budget: any) => {
      const { start, end } = getBudgetPeriodDates(budget.period, budget.start_date)
      
      // Get sum of transactions for this category in the period
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category_id', budget.category_id)
        .gte('date', start)
        .lt('date', end)
        .lt('amount', 0) // Only expenses (negative amounts)

      if (txError) throw txError

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
        alerts: budget.alerts || [],
      }
    })
  )

  return budgetsWithSpending
}

export async function getBudget(id: string): Promise<BudgetWithCategory | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('budgets')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getBudgetWithSpending(id: string): Promise<BudgetWithSpending | null> {
  const supabase = getSupabaseClient()
  
  const { data: budget, error } = await supabase
    .from('budgets')
    .select(`
      *,
      category:categories(*),
      alerts:budget_alerts(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!budget) return null

  const { start, end } = getBudgetPeriodDates(budget.period, budget.start_date)

  // Get sum of transactions for this category in the period
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('category_id', budget.category_id)
    .gte('date', start)
    .lt('date', end)
    .lt('amount', 0)

  if (txError) throw txError

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
    alerts: budget.alerts || [],
  }
}

export async function createBudget(input: CreateBudgetInput, profileId: string): Promise<Budget> {
  const supabase = getSupabaseClient()

  if (!profileId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      profile_id: profileId,
      category_id: input.category_id,
      amount: input.amount,
      period: input.period,
      start_date: input.start_date || new Date().toISOString().split('T')[0],
      rollover: input.rollover || false,
    })
    .select()
    .single()

  if (error) throw error

  // Create default alerts if thresholds provided
  if (input.alert_thresholds && input.alert_thresholds.length > 0) {
    const alerts = input.alert_thresholds.map((threshold) => ({
      budget_id: data.id,
      threshold_percent: threshold,
    }))

    await supabase.from('budget_alerts').insert(alerts)
  }

  return data
}

export async function updateBudget(id: string, input: UpdateBudgetInput): Promise<Budget> {
  const supabase = getSupabaseClient()
  
  const updateData: Record<string, unknown> = {}
  if (input.amount !== undefined) updateData.amount = input.amount
  if (input.period !== undefined) updateData.period = input.period
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.rollover !== undefined) updateData.rollover = input.rollover
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('budgets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBudget(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getBudgetTransactions(
  categoryId: string,
  startDate: string,
  endDate: string
): Promise<TransactionWithCategory[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('category_id', categoryId)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export async function getSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .order('next_renewal_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getAllSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      category:categories(*)
    `)
    .order('next_renewal_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getSubscription(id: string): Promise<SubscriptionWithCategory | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getUpcomingRenewals(daysAhead: number = 7): Promise<SubscriptionWithCategory[]> {
  const supabase = getSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .gte('next_renewal_date', today)
    .lte('next_renewal_date', futureDateStr)
    .order('next_renewal_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createSubscription(
  input: CreateSubscriptionInput,
  profileId: string,
  workspaceId: string
): Promise<Subscription> {
  const supabase = getSupabaseClient()

  if (!profileId) throw new Error('Not authenticated')
  if (!workspaceId) throw new Error('Workspace ID required')

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: profileId,
      workspace_id: workspaceId,
      name: input.name,
      merchant_pattern: input.merchant_pattern,
      amount: input.amount,
      frequency: input.frequency,
      next_renewal_date: input.next_renewal_date,
      last_charge_date: input.last_charge_date || null,
      category_id: input.category_id || null,
      reminder_days_before: input.reminder_days_before || 3,
      is_auto_detected: input.is_auto_detected || false,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput
): Promise<Subscription> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSubscription(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getSubscriptionsSummary(): Promise<{
  totalMonthly: number;
  activeCount: number;
  upcomingThisWeek: number;
}> {
  const supabase = getSupabaseClient()
  
  // Get all active subscriptions
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('amount, frequency, next_renewal_date')
    .eq('is_active', true)

  if (error) throw error

  const today = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  let totalMonthly = 0
  let upcomingThisWeek = 0

  const frequencyToMonthly: Record<string, number> = {
    daily: 30,
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
    yearly: 0.083,
  }

  for (const sub of subscriptions || []) {
    // Calculate monthly equivalent
    totalMonthly += Math.abs(sub.amount) * (frequencyToMonthly[sub.frequency] || 1)
    
    // Check if renewal is within next 7 days
    const renewalDate = new Date(sub.next_renewal_date)
    if (renewalDate >= today && renewalDate <= nextWeek) {
      upcomingThisWeek++
    }
  }

  return {
    totalMonthly,
    activeCount: subscriptions?.length || 0,
    upcomingThisWeek,
  }
}

// ============================================
// CALENDAR EVENTS
// ============================================

/**
 * Calculate budget reset dates within a date range
 */
function getBudgetResetDatesInRange(
  period: BudgetPeriod,
  startDate: string,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = []
  const budgetStart = new Date(startDate)
  let current = new Date(budgetStart)
  
  // Move to first reset after budget start
  while (current < rangeStart) {
    switch (period) {
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
  
  // Collect all reset dates within range
  while (current <= rangeEnd) {
    dates.push(new Date(current))
    switch (period) {
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
  
  return dates
}

/**
 * Get all calendar events within a date range
 */
export async function getCalendarEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient()
  const events: CalendarEvent[] = []
  const rangeStart = new Date(startDate)
  const rangeEnd = new Date(endDate)

  // 1. Get subscriptions (bills) within date range
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .gte('next_renewal_date', startDate)
    .lte('next_renewal_date', endDate)

  if (subError) throw subError

  for (const sub of subscriptions || []) {
    events.push({
      id: `sub-${sub.id}`,
      type: 'subscription',
      date: sub.next_renewal_date,
      title: sub.name,
      amount: Math.abs(sub.amount),
      category: sub.category?.name,
      categoryColor: sub.category?.color,
      color: CALENDAR_EVENT_COLORS.subscription,
    })
  }

  // 2. Get recurring rules within date range (with category for income/expense type)
  const { data: recurringRules, error: rrError } = await supabase
    .from('recurring_rules')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .gte('next_date', startDate)
    .lte('next_date', endDate)

  if (rrError) throw rrError

  for (const rule of recurringRules || []) {
    const isIncome = rule.category?.type === 'income'
    events.push({
      id: `rule-${rule.id}`,
      type: isIncome ? 'income' : 'expense',
      date: rule.next_date,
      title: rule.description,
      amount: Math.abs(rule.amount),
      category: rule.category?.name,
      categoryColor: rule.category?.color,
      color: isIncome ? CALENDAR_EVENT_COLORS.income : CALENDAR_EVENT_COLORS.expense,
    })
  }

  // 3. Get budget reset dates within range
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)

  if (budgetError) throw budgetError

  for (const budget of budgets || []) {
    const resetDates = getBudgetResetDatesInRange(
      budget.period as BudgetPeriod,
      budget.start_date,
      rangeStart,
      rangeEnd
    )
    
    for (const date of resetDates) {
      events.push({
        id: `budget-${budget.id}-${date.toISOString().split('T')[0]}`,
        type: 'budget_reset',
        date: date.toISOString().split('T')[0],
        title: `${budget.category?.name || 'Budget'} resets`,
        amount: budget.amount,
        category: budget.category?.name,
        categoryColor: budget.category?.color,
        color: CALENDAR_EVENT_COLORS.budget_reset,
      })
    }
  }

  // Sort events by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return events
}


