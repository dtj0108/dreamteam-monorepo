import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  budgetPeriodSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for budgets
export const budgetTools = {
  budget_list: {
    description: 'List all budgets in the workspace',
    inputSchema: workspaceIdSchema.extend({
      is_active: z.boolean().optional().describe('Filter by active status'),
    }),
    handler: budgetList,
  },

  budget_get: {
    description: 'Get a single budget with current spending',
    inputSchema: workspaceIdSchema.extend({
      budget_id: z.string().uuid().describe('The budget ID'),
    }),
    handler: budgetGet,
  },

  budget_create: {
    description: 'Create a new budget for a category',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('Category to budget'),
      amount: z.number().positive().describe('Budget amount'),
      period: budgetPeriodSchema.describe('Budget period'),
      start_date: z.string().optional().describe('Budget start date (YYYY-MM-DD), defaults to today'),
      rollover: z.boolean().optional().default(false).describe('Rollover unused amount to next period'),
    }),
    handler: budgetCreate,
  },

  budget_update: {
    description: 'Update an existing budget',
    inputSchema: workspaceIdSchema.extend({
      budget_id: z.string().uuid().describe('The budget ID'),
      amount: z.number().positive().optional().describe('New budget amount'),
      period: budgetPeriodSchema.optional().describe('New period'),
      rollover: z.boolean().optional().describe('Rollover setting'),
      is_active: z.boolean().optional().describe('Active status'),
    }),
    handler: budgetUpdate,
  },

  budget_delete: {
    description: 'Delete a budget',
    inputSchema: workspaceIdSchema.extend({
      budget_id: z.string().uuid().describe('The budget ID to delete'),
    }),
    handler: budgetDelete,
  },

  budget_get_status: {
    description: 'Get budget status (on track, over, etc.)',
    inputSchema: workspaceIdSchema.extend({
      budget_id: z.string().uuid().describe('The budget ID'),
    }),
    handler: budgetGetStatus,
  },

  budget_list_over_limit: {
    description: 'List all budgets that are over their limit',
    inputSchema: workspaceIdSchema,
    handler: budgetListOverLimit,
  },

  budget_list_with_spending: {
    description: 'List all budgets with their current spending amounts',
    inputSchema: workspaceIdSchema,
    handler: budgetListWithSpending,
  },

  budget_add_alert: {
    description: 'Add an alert threshold to a budget',
    inputSchema: workspaceIdSchema.extend({
      budget_id: z.string().uuid().describe('The budget ID'),
      threshold_percent: z.number().min(1).max(200).describe('Alert threshold as percentage (e.g., 80 for 80%)'),
    }),
    handler: budgetAddAlert,
  },

  budget_remove_alert: {
    description: 'Remove an alert threshold from a budget',
    inputSchema: workspaceIdSchema.extend({
      budget_id: z.string().uuid().describe('The budget ID'),
      threshold_percent: z.number().describe('Threshold to remove'),
    }),
    handler: budgetRemoveAlert,
  },

  budget_get_alerts_triggered: {
    description: 'Get all triggered budget alerts',
    inputSchema: workspaceIdSchema,
    handler: budgetGetAlertsTriggered,
  },
}

// Helper function to get current period dates
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

// Calculate spending for a budget
async function calculateBudgetSpending(
  supabase: ReturnType<typeof getSupabase>,
  budget: { category_id: string; period: string; start_date: string; amount: number },
  accountIds: string[]
): Promise<{ spent: number; remaining: number; percentUsed: number; periodStart: string; periodEnd: string }> {
  const { start, end } = getBudgetPeriodDates(budget.period, budget.start_date)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .in('account_id', accountIds)
    .eq('category_id', budget.category_id)
    .gte('date', start)
    .lt('date', end)
    .lt('amount', 0) // Only expenses

  const spent = Math.abs(transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0)
  const remaining = Math.max(0, budget.amount - spent)
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

  return { spent, remaining, percentUsed, periodStart: start, periodEnd: end }
}

// Handler implementations

async function budgetList(params: {
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
      .from('budgets')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      budgets: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list budgets: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetGet(params: {
  workspace_id?: string
  budget_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data: budget, error: dbError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(*),
        alerts:budget_alerts(*)
      `)
      .eq('id', params.budget_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No budget found with this ID',
          budget: null,
        })
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Get workspace accounts for spending calculation
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    const accountIds = accounts?.map((a) => a.id) || []
    const spending = await calculateBudgetSpending(supabase, budget, accountIds)

    return success({
      ...budget,
      ...spending,
    })
  } catch (err) {
    return error(`Failed to get budget: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetCreate(params: {
  workspace_id?: string
  category_id: string
  amount: number
  period: string
  start_date?: string
  rollover?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('budgets')
      .insert({
        workspace_id: workspace_id,
        category_id: params.category_id,
        amount: params.amount,
        period: params.period,
        start_date: params.start_date || new Date().toISOString().split('T')[0],
        rollover: params.rollover || false,
        is_active: true,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create budget: ${dbError.message}`)
    }

    return success({
      message: 'Budget created successfully',
      budget: data,
    })
  } catch (err) {
    return error(`Failed to create budget: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetUpdate(params: {
  workspace_id?: string
  budget_id: string
  amount?: number
  period?: string
  rollover?: boolean
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    const updateData: Record<string, unknown> = {}
    if (params.amount !== undefined) updateData.amount = params.amount
    if (params.period !== undefined) updateData.period = params.period
    if (params.rollover !== undefined) updateData.rollover = params.rollover
    if (params.is_active !== undefined) updateData.is_active = params.is_active

    if (Object.keys(updateData).length === 0) {
      return success({
        message: 'No fields provided to update',
        budget: null,
        updated: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', params.budget_id)
      .eq('workspace_id', workspace_id)
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No budget found with this ID',
          budget: null,
          updated: false,
        })
      }
      return error(`Failed to update budget: ${dbError.message}`)
    }

    return success({
      message: 'Budget updated successfully',
      budget: data,
    })
  } catch (err) {
    return error(`Failed to update budget: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetDelete(params: {
  workspace_id?: string
  budget_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { error: dbError } = await supabase
      .from('budgets')
      .delete()
      .eq('id', params.budget_id)
      .eq('workspace_id', workspace_id)

    if (dbError) {
      return error(`Failed to delete budget: ${dbError.message}`)
    }

    return success({
      message: 'Budget deleted successfully',
      budget_id: params.budget_id,
    })
  } catch (err) {
    return error(`Failed to delete budget: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetGetStatus(params: {
  workspace_id?: string
  budget_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const result = await budgetGet({ workspace_id, budget_id: params.budget_id })
    if (result.isError) return result

    const budget = JSON.parse(result.content[0].text)
    const percentUsed = budget.percentUsed || 0

    let status: string
    if (percentUsed >= 100) {
      status = 'over_budget'
    } else if (percentUsed >= 90) {
      status = 'critical'
    } else if (percentUsed >= 75) {
      status = 'warning'
    } else {
      status = 'on_track'
    }

    return success({
      budget_id: params.budget_id,
      status,
      percent_used: Math.round(percentUsed * 100) / 100,
      amount: budget.amount,
      spent: budget.spent,
      remaining: budget.remaining,
      period_start: budget.periodStart,
      period_end: budget.periodEnd,
    })
  } catch (err) {
    return error(`Failed to get budget status: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetListOverLimit(params: { workspace_id?: string }): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const result = await budgetListWithSpending({ workspace_id })
    if (result.isError) return result

    const data = JSON.parse(result.content[0].text)
    const overBudget = data.budgets.filter((b: { percentUsed: number }) => b.percentUsed >= 100)

    return success({
      budgets: overBudget,
      count: overBudget.length,
    })
  } catch (err) {
    return error(`Failed to list over-budget: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetListWithSpending(params: { workspace_id?: string }): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get budgets
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(*),
        alerts:budget_alerts(*)
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    if (budgetError) {
      return error(`Database error: ${budgetError.message}`, 'database')
    }

    // Get workspace accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    const accountIds = accounts?.map((a) => a.id) || []

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(
      (budgets || []).map(async (budget) => {
        const spending = await calculateBudgetSpending(supabase, budget, accountIds)
        return { ...budget, ...spending }
      })
    )

    return success({
      budgets: budgetsWithSpending,
      count: budgetsWithSpending.length,
    })
  } catch (err) {
    return error(`Failed to list budgets: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetAddAlert(params: {
  workspace_id?: string
  budget_id: string
  threshold_percent: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify budget belongs to workspace
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('id')
      .eq('id', params.budget_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (budgetError || !budget) {
      return success({
        message: 'No budget found with this ID in this workspace',
        budget: null,
        alert_added: false,
      })
    }

    const { data, error: dbError } = await supabase
      .from('budget_alerts')
      .insert({
        budget_id: params.budget_id,
        threshold_percent: params.threshold_percent,
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return error('Alert threshold already exists for this budget', 'validation')
      }
      return error(`Failed to add alert: ${dbError.message}`)
    }

    return success({
      message: 'Alert added successfully',
      alert: data,
    })
  } catch (err) {
    return error(`Failed to add alert: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetRemoveAlert(params: {
  workspace_id?: string
  budget_id: string
  threshold_percent: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify budget belongs to workspace
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('id', params.budget_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!budget) {
      return success({
        message: 'No budget found with this ID in this workspace',
        budget: null,
        alert_removed: false,
      })
    }

    const { error: dbError } = await supabase
      .from('budget_alerts')
      .delete()
      .eq('budget_id', params.budget_id)
      .eq('threshold_percent', params.threshold_percent)

    if (dbError) {
      return error(`Failed to remove alert: ${dbError.message}`)
    }

    return success({
      message: 'Alert removed successfully',
      budget_id: params.budget_id,
      threshold_percent: params.threshold_percent,
    })
  } catch (err) {
    return error(`Failed to remove alert: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function budgetGetAlertsTriggered(params: { workspace_id?: string }): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const result = await budgetListWithSpending({ workspace_id })
    if (result.isError) return result

    const data = JSON.parse(result.content[0].text)
    const triggeredAlerts: Array<{
      budget_id: string
      category_name: string
      threshold_percent: number
      current_percent: number
      amount: number
      spent: number
    }> = []

    for (const budget of data.budgets) {
      for (const alert of budget.alerts || []) {
        if (budget.percentUsed >= alert.threshold_percent) {
          triggeredAlerts.push({
            budget_id: budget.id,
            category_name: budget.category?.name || 'Unknown',
            threshold_percent: alert.threshold_percent,
            current_percent: Math.round(budget.percentUsed * 100) / 100,
            amount: budget.amount,
            spent: budget.spent,
          })
        }
      }
    }

    return success({
      triggered_alerts: triggeredAlerts,
      count: triggeredAlerts.length,
    })
  } catch (err) {
    return error(`Failed to get triggered alerts: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
