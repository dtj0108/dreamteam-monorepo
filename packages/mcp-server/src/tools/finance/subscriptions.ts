import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  frequencySchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Frequency to monthly multiplier
const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  daily: 30,
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 0.33,
  yearly: 0.083,
}

// Tool definitions for subscriptions
export const subscriptionTools = {
  subscription_list: {
    description: 'List all subscriptions in the workspace',
    inputSchema: workspaceIdSchema.extend({
      is_active: z.boolean().optional().describe('Filter by active status'),
    }),
    handler: subscriptionList,
  },

  subscription_get: {
    description: 'Get a single subscription by ID',
    inputSchema: workspaceIdSchema.extend({
      subscription_id: z.string().uuid().describe('The subscription ID'),
    }),
    handler: subscriptionGet,
  },

  subscription_create: {
    description: 'Create a new subscription',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Subscription name'),
      amount: z.number().describe('Subscription amount'),
      frequency: frequencySchema.describe('Billing frequency'),
      next_renewal_date: z.string().describe('Next renewal date (YYYY-MM-DD)'),
      category_id: z.string().uuid().optional().describe('Category ID'),
      reminder_days_before: z.number().int().min(0).optional().default(3).describe('Days before renewal to remind'),
      notes: z.string().optional().describe('Additional notes'),
    }),
    handler: subscriptionCreate,
  },

  subscription_update: {
    description: 'Update an existing subscription',
    inputSchema: workspaceIdSchema.extend({
      subscription_id: z.string().uuid().describe('The subscription ID'),
      name: z.string().min(1).optional().describe('New name'),
      amount: z.number().optional().describe('New amount'),
      frequency: frequencySchema.optional().describe('New frequency'),
      next_renewal_date: z.string().optional().describe('New renewal date'),
      category_id: z.string().uuid().optional().describe('New category'),
      reminder_days_before: z.number().int().min(0).optional().describe('New reminder days'),
      is_active: z.boolean().optional().describe('Active status'),
      notes: z.string().optional().describe('New notes'),
    }),
    handler: subscriptionUpdate,
  },

  subscription_delete: {
    description: 'Delete a subscription',
    inputSchema: workspaceIdSchema.extend({
      subscription_id: z.string().uuid().describe('The subscription ID to delete'),
    }),
    handler: subscriptionDelete,
  },

  subscription_get_upcoming: {
    description: 'Get subscriptions renewing within a specified number of days',
    inputSchema: workspaceIdSchema.extend({
      days_ahead: z.number().int().positive().optional().default(7).describe('Days to look ahead'),
    }),
    handler: subscriptionGetUpcoming,
  },

  subscription_get_summary: {
    description: 'Get summary of all subscriptions (total monthly cost, count, upcoming)',
    inputSchema: workspaceIdSchema,
    handler: subscriptionGetSummary,
  },

  subscription_detect_from_transactions: {
    description: 'Auto-detect potential subscriptions from recurring transaction patterns',
    inputSchema: workspaceIdSchema,
    handler: subscriptionDetectFromTransactions,
  },

  subscription_mark_canceled: {
    description: 'Mark a subscription as canceled (sets inactive)',
    inputSchema: workspaceIdSchema.extend({
      subscription_id: z.string().uuid().describe('The subscription ID'),
    }),
    handler: subscriptionMarkCanceled,
  },
}

// Handler implementations

async function subscriptionList(params: {
  workspace_id?: string
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspace_id)
      .order('next_renewal_date', { ascending: true })

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Add monthly equivalent to each subscription
    const subscriptionsWithMonthly = (data || []).map((sub) => ({
      ...sub,
      monthly_equivalent: Math.abs(sub.amount) * (FREQUENCY_TO_MONTHLY[sub.frequency] || 1),
    }))

    return success({
      subscriptions: subscriptionsWithMonthly,
      count: subscriptionsWithMonthly.length,
    })
  } catch (err) {
    return error(`Failed to list subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionGet(params: {
  workspace_id?: string
  subscription_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('id', params.subscription_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Subscription not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      ...data,
      monthly_equivalent: Math.abs(data.amount) * (FREQUENCY_TO_MONTHLY[data.frequency] || 1),
    })
  } catch (err) {
    return error(`Failed to get subscription: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionCreate(params: {
  workspace_id?: string
  name: string
  amount: number
  frequency: string
  next_renewal_date: string
  category_id?: string
  reminder_days_before?: number
  notes?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        amount: params.amount,
        frequency: params.frequency,
        next_renewal_date: params.next_renewal_date,
        category_id: params.category_id || null,
        reminder_days_before: params.reminder_days_before || 3,
        notes: params.notes || null,
        is_active: true,
        is_auto_detected: false,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create subscription: ${dbError.message}`)
    }

    return success({
      message: 'Subscription created successfully',
      subscription: {
        ...data,
        monthly_equivalent: Math.abs(data.amount) * (FREQUENCY_TO_MONTHLY[data.frequency] || 1),
      },
    })
  } catch (err) {
    return error(`Failed to create subscription: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionUpdate(params: {
  workspace_id?: string
  subscription_id: string
  name?: string
  amount?: number
  frequency?: string
  next_renewal_date?: string
  category_id?: string
  reminder_days_before?: number
  is_active?: boolean
  notes?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.amount !== undefined) updateData.amount = params.amount
    if (params.frequency !== undefined) updateData.frequency = params.frequency
    if (params.next_renewal_date !== undefined) updateData.next_renewal_date = params.next_renewal_date
    if (params.category_id !== undefined) updateData.category_id = params.category_id
    if (params.reminder_days_before !== undefined) updateData.reminder_days_before = params.reminder_days_before
    if (params.is_active !== undefined) updateData.is_active = params.is_active
    if (params.notes !== undefined) updateData.notes = params.notes

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', params.subscription_id)
      .eq('workspace_id', workspace_id)
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Subscription not found', 'not_found')
      }
      return error(`Failed to update subscription: ${dbError.message}`)
    }

    return success({
      message: 'Subscription updated successfully',
      subscription: {
        ...data,
        monthly_equivalent: Math.abs(data.amount) * (FREQUENCY_TO_MONTHLY[data.frequency] || 1),
      },
    })
  } catch (err) {
    return error(`Failed to update subscription: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionDelete(params: {
  workspace_id?: string
  subscription_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { error: dbError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', params.subscription_id)
      .eq('workspace_id', workspace_id)

    if (dbError) {
      return error(`Failed to delete subscription: ${dbError.message}`)
    }

    return success({
      message: 'Subscription deleted successfully',
      subscription_id: params.subscription_id,
    })
  } catch (err) {
    return error(`Failed to delete subscription: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionGetUpcoming(params: {
  workspace_id?: string
  days_ahead?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + (params.days_ahead || 7))
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error: dbError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .gte('next_renewal_date', today)
      .lte('next_renewal_date', futureDateStr)
      .order('next_renewal_date', { ascending: true })

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const subscriptionsWithMonthly = (data || []).map((sub) => ({
      ...sub,
      monthly_equivalent: Math.abs(sub.amount) * (FREQUENCY_TO_MONTHLY[sub.frequency] || 1),
      days_until_renewal: Math.ceil(
        (new Date(sub.next_renewal_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return success({
      subscriptions: subscriptionsWithMonthly,
      count: subscriptionsWithMonthly.length,
      days_ahead: params.days_ahead || 7,
    })
  } catch (err) {
    return error(`Failed to get upcoming subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionGetSummary(params: { workspace_id?: string }): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const { data: subscriptions, error: dbError } = await supabase
      .from('subscriptions')
      .select('amount, frequency, next_renewal_date')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    let totalMonthly = 0
    let totalYearly = 0
    let upcomingThisWeek = 0

    for (const sub of subscriptions || []) {
      const monthlyAmount = Math.abs(sub.amount) * (FREQUENCY_TO_MONTHLY[sub.frequency] || 1)
      totalMonthly += monthlyAmount
      totalYearly += monthlyAmount * 12

      const renewalDate = new Date(sub.next_renewal_date)
      if (renewalDate >= today && renewalDate <= nextWeek) {
        upcomingThisWeek++
      }
    }

    return success({
      total_monthly: Math.round(totalMonthly * 100) / 100,
      total_yearly: Math.round(totalYearly * 100) / 100,
      active_count: subscriptions?.length || 0,
      upcoming_this_week: upcomingThisWeek,
    })
  } catch (err) {
    return error(`Failed to get subscription summary: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionDetectFromTransactions(params: { workspace_id?: string }): Promise<ToolResult> {
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
      return success({ potential_subscriptions: [], count: 0 })
    }

    // Get last 90 days of transactions
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('description, amount, date')
      .in('account_id', accountIds)
      .lt('amount', 0) // Only expenses
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (txError) {
      return error(`Database error: ${txError.message}`, 'database')
    }

    // Group by description and amount to find patterns
    const patterns: Record<string, { count: number; dates: string[]; amount: number }> = {}

    for (const tx of transactions || []) {
      const key = `${tx.description?.toLowerCase() || 'unknown'}|${tx.amount}`
      if (!patterns[key]) {
        patterns[key] = { count: 0, dates: [], amount: Math.abs(tx.amount) }
      }
      patterns[key].count++
      patterns[key].dates.push(tx.date)
    }

    // Find transactions that occur 2+ times (potential subscriptions)
    const potentialSubscriptions = Object.entries(patterns)
      .filter(([, p]) => p.count >= 2)
      .map(([key, p]) => {
        const [description] = key.split('|')

        // Calculate average days between occurrences
        const sortedDates = p.dates.sort()
        let totalDays = 0
        for (let i = 1; i < sortedDates.length; i++) {
          const diff =
            (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) /
            (1000 * 60 * 60 * 24)
          totalDays += diff
        }
        const avgDays = totalDays / (sortedDates.length - 1)

        // Determine likely frequency
        let frequency: string
        if (avgDays <= 8) frequency = 'weekly'
        else if (avgDays <= 16) frequency = 'biweekly'
        else if (avgDays <= 35) frequency = 'monthly'
        else if (avgDays <= 100) frequency = 'quarterly'
        else frequency = 'yearly'

        return {
          name: description,
          amount: p.amount,
          occurrence_count: p.count,
          likely_frequency: frequency,
          average_days_between: Math.round(avgDays),
          last_seen: sortedDates[sortedDates.length - 1],
        }
      })
      .sort((a, b) => b.occurrence_count - a.occurrence_count)

    return success({
      potential_subscriptions: potentialSubscriptions,
      count: potentialSubscriptions.length,
      analysis_period_days: 90,
    })
  } catch (err) {
    return error(`Failed to detect subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function subscriptionMarkCanceled(params: {
  workspace_id?: string
  subscription_id: string
}): Promise<ToolResult> {
  const workspace_id = resolveWorkspaceId(params)
  return subscriptionUpdate({
    workspace_id,
    subscription_id: params.subscription_id,
    is_active: false,
  })
}
