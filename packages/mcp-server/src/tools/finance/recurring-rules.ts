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

// Tool definitions for recurring rules
export const recurringRuleTools = {
  recurring_rule_list: {
    description: 'List all recurring income/expense rules in the workspace',
    inputSchema: workspaceIdSchema.extend({
      is_active: z.boolean().optional().describe('Filter by active status'),
    }),
    handler: recurringRuleList,
  },

  recurring_rule_get: {
    description: 'Get a single recurring rule by ID',
    inputSchema: workspaceIdSchema.extend({
      rule_id: z.string().uuid().describe('The recurring rule ID'),
    }),
    handler: recurringRuleGet,
  },

  recurring_rule_create: {
    description: 'Create a new recurring income/expense rule',
    inputSchema: workspaceIdSchema.extend({
      account_id: z.string().uuid().describe('Account ID for the recurring transaction'),
      amount: z.number().describe('Transaction amount (negative for expense, positive for income)'),
      description: z.string().min(1).describe('Description'),
      frequency: frequencySchema.describe('Recurrence frequency'),
      next_date: z.string().describe('Next occurrence date (YYYY-MM-DD)'),
      category_id: z.string().uuid().optional().describe('Category ID'),
      end_date: z.string().optional().describe('End date for recurrence (YYYY-MM-DD)'),
    }),
    handler: recurringRuleCreate,
  },

  recurring_rule_update: {
    description: 'Update an existing recurring rule',
    inputSchema: workspaceIdSchema.extend({
      rule_id: z.string().uuid().describe('The recurring rule ID'),
      amount: z.number().optional().describe('New amount'),
      description: z.string().optional().describe('New description'),
      frequency: frequencySchema.optional().describe('New frequency'),
      next_date: z.string().optional().describe('New next date'),
      category_id: z.string().uuid().optional().describe('New category'),
      end_date: z.string().optional().describe('New end date'),
      is_active: z.boolean().optional().describe('Active status'),
    }),
    handler: recurringRuleUpdate,
  },

  recurring_rule_delete: {
    description: 'Delete a recurring rule',
    inputSchema: workspaceIdSchema.extend({
      rule_id: z.string().uuid().describe('The recurring rule ID to delete'),
    }),
    handler: recurringRuleDelete,
  },

  recurring_rule_skip_next: {
    description: 'Skip the next occurrence of a recurring rule',
    inputSchema: workspaceIdSchema.extend({
      rule_id: z.string().uuid().describe('The recurring rule ID'),
    }),
    handler: recurringRuleSkipNext,
  },

  recurring_rule_generate_transactions: {
    description: 'Generate pending transactions from recurring rules up to a specific date',
    inputSchema: workspaceIdSchema.extend({
      up_to_date: z.string().describe('Generate transactions up to this date (YYYY-MM-DD)'),
    }),
    handler: recurringRuleGenerateTransactions,
  },
}

// Helper to calculate next date based on frequency
function calculateNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate)

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }

  return date.toISOString().split('T')[0]
}

// Handler implementations

async function recurringRuleList(params: {
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
      return success({ recurring_rules: [], count: 0 })
    }

    let query = supabase
      .from('recurring_rules')
      .select(`
        *,
        category:categories(*),
        account:accounts(id, name)
      `)
      .in('account_id', accountIds)
      .order('next_date', { ascending: true })

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      recurring_rules: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list recurring rules: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function recurringRuleGet(params: {
  workspace_id?: string
  rule_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('recurring_rules')
      .select(`
        *,
        category:categories(*),
        account:accounts(id, name, workspace_id)
      `)
      .eq('id', params.rule_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Recurring rule not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Verify the rule belongs to this workspace
    if (data.account?.workspace_id !== workspace_id) {
      return error('Recurring rule not found in this workspace', 'not_found')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get recurring rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function recurringRuleCreate(params: {
  workspace_id?: string
  account_id: string
  amount: number
  description: string
  frequency: string
  next_date: string
  category_id?: string
  end_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the account belongs to this workspace
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', params.account_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (accError || !account) {
      return error('Account not found in this workspace', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('recurring_rules')
      .insert({
        account_id: params.account_id,
        amount: params.amount,
        description: params.description,
        frequency: params.frequency,
        next_date: params.next_date,
        category_id: params.category_id || null,
        end_date: params.end_date || null,
        is_active: true,
      })
      .select(`
        *,
        category:categories(*),
        account:accounts(id, name)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create recurring rule: ${dbError.message}`)
    }

    return success({
      message: 'Recurring rule created successfully',
      recurring_rule: data,
    })
  } catch (err) {
    return error(`Failed to create recurring rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function recurringRuleUpdate(params: {
  workspace_id?: string
  rule_id: string
  amount?: number
  description?: string
  frequency?: string
  next_date?: string
  category_id?: string
  end_date?: string
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the rule belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('recurring_rules')
      .select('id, account:accounts(workspace_id)')
      .eq('id', params.rule_id)
      .single()

    if (getError || !existing) {
      return error('Recurring rule not found', 'not_found')
    }

    const account = existing.account as unknown as { workspace_id: string } | null
    if (account?.workspace_id !== workspace_id) {
      return error('Recurring rule not found in this workspace', 'not_found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.amount !== undefined) updateData.amount = params.amount
    if (params.description !== undefined) updateData.description = params.description
    if (params.frequency !== undefined) updateData.frequency = params.frequency
    if (params.next_date !== undefined) updateData.next_date = params.next_date
    if (params.category_id !== undefined) updateData.category_id = params.category_id
    if (params.end_date !== undefined) updateData.end_date = params.end_date
    if (params.is_active !== undefined) updateData.is_active = params.is_active

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('recurring_rules')
      .update(updateData)
      .eq('id', params.rule_id)
      .select(`
        *,
        category:categories(*),
        account:accounts(id, name)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update recurring rule: ${dbError.message}`)
    }

    return success({
      message: 'Recurring rule updated successfully',
      recurring_rule: data,
    })
  } catch (err) {
    return error(`Failed to update recurring rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function recurringRuleDelete(params: {
  workspace_id?: string
  rule_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the rule belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('recurring_rules')
      .select('id, account:accounts(workspace_id)')
      .eq('id', params.rule_id)
      .single()

    if (getError || !existing) {
      return error('Recurring rule not found', 'not_found')
    }

    const account = existing.account as unknown as { workspace_id: string } | null
    if (account?.workspace_id !== workspace_id) {
      return error('Recurring rule not found in this workspace', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('recurring_rules')
      .delete()
      .eq('id', params.rule_id)

    if (dbError) {
      return error(`Failed to delete recurring rule: ${dbError.message}`)
    }

    return success({
      message: 'Recurring rule deleted successfully',
      rule_id: params.rule_id,
    })
  } catch (err) {
    return error(`Failed to delete recurring rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function recurringRuleSkipNext(params: {
  workspace_id?: string
  rule_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get the current rule
    const { data: rule, error: getError } = await supabase
      .from('recurring_rules')
      .select('id, next_date, frequency, account:accounts(workspace_id)')
      .eq('id', params.rule_id)
      .single()

    if (getError || !rule) {
      return error('Recurring rule not found', 'not_found')
    }

    const ruleAccount = rule.account as unknown as { workspace_id: string } | null
    if (ruleAccount?.workspace_id !== workspace_id) {
      return error('Recurring rule not found in this workspace', 'not_found')
    }

    // Calculate the next date after skipping
    const newNextDate = calculateNextDate(rule.next_date, rule.frequency)

    const { data, error: dbError } = await supabase
      .from('recurring_rules')
      .update({ next_date: newNextDate })
      .eq('id', params.rule_id)
      .select(`
        *,
        category:categories(*),
        account:accounts(id, name)
      `)
      .single()

    if (dbError) {
      return error(`Failed to skip occurrence: ${dbError.message}`)
    }

    return success({
      message: 'Next occurrence skipped successfully',
      skipped_date: rule.next_date,
      new_next_date: newNextDate,
      recurring_rule: data,
    })
  } catch (err) {
    return error(`Failed to skip occurrence: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function recurringRuleGenerateTransactions(params: {
  workspace_id?: string
  up_to_date: string
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
      return success({ generated: [], count: 0 })
    }

    // Get active recurring rules that are due
    const { data: rules, error: ruleError } = await supabase
      .from('recurring_rules')
      .select('*')
      .in('account_id', accountIds)
      .eq('is_active', true)
      .lte('next_date', params.up_to_date)

    if (ruleError) {
      return error(`Database error: ${ruleError.message}`, 'database')
    }

    const generated: Array<{
      rule_id: string
      transaction_id: string
      date: string
      amount: number
      description: string
    }> = []

    const upToDate = new Date(params.up_to_date)

    for (const rule of rules || []) {
      let currentDate = rule.next_date

      // Generate transactions for each due occurrence
      while (new Date(currentDate) <= upToDate) {
        // Check if already at or past end_date
        if (rule.end_date && new Date(currentDate) > new Date(rule.end_date)) {
          break
        }

        // Create the transaction
        const { data: tx, error: txError } = await supabase
          .from('transactions')
          .insert({
            account_id: rule.account_id,
            category_id: rule.category_id,
            amount: rule.amount,
            date: currentDate,
            description: rule.description,
            recurring_rule_id: rule.id,
          })
          .select('id')
          .single()

        if (!txError && tx) {
          generated.push({
            rule_id: rule.id,
            transaction_id: tx.id,
            date: currentDate,
            amount: rule.amount,
            description: rule.description,
          })
        }

        currentDate = calculateNextDate(currentDate, rule.frequency)
      }

      // Update the rule's next_date
      await supabase
        .from('recurring_rules')
        .update({ next_date: currentDate })
        .eq('id', rule.id)
    }

    return success({
      message: `Generated ${generated.length} transactions from recurring rules`,
      generated,
      count: generated.length,
      up_to_date: params.up_to_date,
    })
  } catch (err) {
    return error(`Failed to generate transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
