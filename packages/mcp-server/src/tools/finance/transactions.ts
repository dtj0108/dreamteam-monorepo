import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  paginationSchema,
  dateRangeSchema,
  success,
  error,
  type ToolResult,
  type ErrorCategory,
} from '../../types.js'

// Transfer category UUID (system category)
const TRANSFER_CATEGORY_ID = '00000000-0000-0000-0002-000000000001'

// Tool definitions for transactions
export const transactionTools = {
  transaction_list: {
    description: 'List transactions with optional filters',
    inputSchema: workspaceIdSchema
      .merge(paginationSchema)
      .merge(dateRangeSchema)
      .extend({
        account_id: z.string().uuid().optional().describe('Filter by account'),
        category_id: z.string().uuid().optional().describe('Filter by category'),
        type: z.enum(['income', 'expense']).optional().describe('Filter by transaction type'),
      }),
    handler: transactionList,
  },

  transaction_get: {
    description: 'Get a single transaction by ID',
    inputSchema: workspaceIdSchema.extend({
      transaction_id: z.string().uuid().describe('The transaction ID'),
    }),
    handler: transactionGet,
  },

  transaction_create: {
    description: 'Create a new transaction',
    inputSchema: workspaceIdSchema.extend({
      account_id: z.string().uuid().describe('The account ID'),
      amount: z.number().describe('Transaction amount (negative for expenses, positive for income)'),
      date: z.string().describe('Transaction date (YYYY-MM-DD)'),
      description: z.string().optional().describe('Transaction description'),
      category_id: z.string().uuid().optional().describe('Category ID'),
      notes: z.string().optional().describe('Additional notes'),
    }),
    handler: transactionCreate,
  },

  transaction_update: {
    description: 'Update an existing transaction',
    inputSchema: workspaceIdSchema.extend({
      transaction_id: z.string().uuid().describe('The transaction ID'),
      amount: z.number().optional().describe('New amount'),
      date: z.string().optional().describe('New date'),
      description: z.string().optional().describe('New description'),
      category_id: z.string().uuid().optional().describe('New category'),
      notes: z.string().optional().describe('New notes'),
    }),
    handler: transactionUpdate,
  },

  transaction_delete: {
    description: 'Delete a transaction',
    inputSchema: workspaceIdSchema.extend({
      transaction_id: z.string().uuid().describe('The transaction ID to delete'),
    }),
    handler: transactionDelete,
  },

  transaction_create_transfer: {
    description: 'Create a transfer between two accounts',
    inputSchema: workspaceIdSchema.extend({
      from_account_id: z.string().uuid().describe('Source account ID'),
      to_account_id: z.string().uuid().describe('Destination account ID'),
      amount: z.number().positive().describe('Transfer amount (always positive)'),
      date: z.string().describe('Transfer date (YYYY-MM-DD)'),
      description: z.string().optional().describe('Transfer description'),
    }),
    handler: transactionCreateTransfer,
  },

  transaction_bulk_categorize: {
    description: 'Categorize multiple transactions at once',
    inputSchema: workspaceIdSchema.extend({
      transaction_ids: z.array(z.string().uuid()).min(1).describe('Array of transaction IDs'),
      category_id: z.string().uuid().describe('Category to assign'),
    }),
    handler: transactionBulkCategorize,
  },

  transaction_search: {
    description: 'Search transactions by description',
    inputSchema: workspaceIdSchema.extend({
      query: z.string().min(1).describe('Search query'),
      limit: z.number().int().positive().max(100).optional().default(50).describe('Max results'),
    }),
    handler: transactionSearch,
  },

  transaction_get_by_date_range: {
    description: 'Get all transactions within a date range',
    inputSchema: workspaceIdSchema.extend({
      start_date: z.string().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().describe('End date (YYYY-MM-DD)'),
      account_id: z.string().uuid().optional().describe('Filter by account'),
    }),
    handler: transactionGetByDateRange,
  },

  transaction_get_uncategorized: {
    description: 'List transactions that have no category assigned',
    inputSchema: workspaceIdSchema.extend({
      limit: z.number().int().positive().max(100).optional().default(50).describe('Max results'),
    }),
    handler: transactionGetUncategorized,
  },

  transaction_get_recent: {
    description: 'Get the most recent transactions',
    inputSchema: workspaceIdSchema.extend({
      limit: z.number().int().positive().max(100).optional().default(10).describe('Number of transactions'),
    }),
    handler: transactionGetRecent,
  },

  transaction_get_duplicates: {
    description: 'Find potential duplicate transactions',
    inputSchema: workspaceIdSchema.extend({
      days_window: z.number().int().positive().optional().default(7).describe('Days to look back for duplicates'),
    }),
    handler: transactionGetDuplicates,
  },
}

// Handler implementations

async function transactionList(params: {
  workspace_id?: string
  account_id?: string
  category_id?: string
  type?: 'income' | 'expense'
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // First get accounts for this workspace to filter transactions
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []
    if (accountIds.length === 0) {
      return success({ transactions: [], count: 0 })
    }

    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .in('account_id', accountIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (params.account_id) {
      query = query.eq('account_id', params.account_id)
    }

    if (params.category_id) {
      query = query.eq('category_id', params.category_id)
    }

    if (params.type === 'income') {
      query = query.gt('amount', 0)
    } else if (params.type === 'expense') {
      query = query.lt('amount', 0)
    }

    if (params.start_date) {
      query = query.gte('date', params.start_date)
    }

    if (params.end_date) {
      query = query.lte('date', params.end_date)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      transactions: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionGet(params: {
  workspace_id?: string
  transaction_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts(*)
      `)
      .eq('id', params.transaction_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Transaction not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Verify the transaction belongs to this workspace
    if (data.account?.workspace_id !== workspace_id) {
      return error('Transaction not found', 'not_found')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get transaction: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionCreate(params: {
  workspace_id?: string
  account_id: string
  amount: number
  date: string
  description?: string
  category_id?: string
  notes?: string
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
      return error('Account not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('transactions')
      .insert({
        account_id: params.account_id,
        amount: params.amount,
        date: params.date,
        description: params.description || null,
        category_id: params.category_id || null,
        notes: params.notes || null,
        is_transfer: false,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (dbError) {
      return error(`Failed to create transaction: ${dbError.message}`)
    }

    return success({
      message: 'Transaction created successfully',
      transaction: data,
    })
  } catch (err) {
    return error(`Failed to create transaction: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionUpdate(params: {
  workspace_id?: string
  transaction_id: string
  amount?: number
  date?: string
  description?: string
  category_id?: string
  notes?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (params.amount !== undefined) updateData.amount = params.amount
    if (params.date !== undefined) updateData.date = params.date
    if (params.description !== undefined) updateData.description = params.description
    if (params.category_id !== undefined) updateData.category_id = params.category_id
    if (params.notes !== undefined) updateData.notes = params.notes

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    // Get the transaction with account to verify workspace
    const { data: existing, error: getError } = await supabase
      .from('transactions')
      .select('id, account:accounts(workspace_id)')
      .eq('id', params.transaction_id)
      .single()

    if (getError || !existing) {
      return error('Transaction not found', 'not_found')
    }

    const txAccount = existing.account as unknown as { workspace_id: string } | null
    if (txAccount?.workspace_id !== workspace_id) {
      return error('Transaction not found', 'not_found')
    }

    const { data, error: dbError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', params.transaction_id)
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (dbError) {
      return error(`Failed to update transaction: ${dbError.message}`)
    }

    return success({
      message: 'Transaction updated successfully',
      transaction: data,
    })
  } catch (err) {
    return error(`Failed to update transaction: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionDelete(params: {
  workspace_id?: string
  transaction_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify the transaction belongs to this workspace
    const { data: existing, error: getError } = await supabase
      .from('transactions')
      .select('id, is_transfer, transfer_pair_id, account:accounts(workspace_id)')
      .eq('id', params.transaction_id)
      .single()

    if (getError || !existing) {
      return success({
        message: 'No transaction found with this ID',
        deleted: false,
      })
    }

    const delTxAccount = existing.account as unknown as { workspace_id: string } | null
    if (delTxAccount?.workspace_id !== workspace_id) {
      return success({
        message: 'No transaction found with this ID in this workspace',
        deleted: false,
      })
    }

    // If it's a transfer, delete the paired transaction too
    if (existing.is_transfer && existing.transfer_pair_id) {
      await supabase.from('transactions').delete().eq('id', existing.transfer_pair_id)
    }

    const { error: dbError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', params.transaction_id)

    if (dbError) {
      return error(`Failed to delete transaction: ${dbError.message}`)
    }

    return success({
      message: 'Transaction deleted successfully',
      transaction_id: params.transaction_id,
    })
  } catch (err) {
    return error(`Failed to delete transaction: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionCreateTransfer(params: {
  workspace_id?: string
  from_account_id: string
  to_account_id: string
  amount: number
  date: string
  description?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify both accounts belong to this workspace
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('workspace_id', workspace_id)
      .in('id', [params.from_account_id, params.to_account_id])

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    if (!accounts || accounts.length !== 2) {
      return error('One or both accounts not found', 'not_found')
    }

    const fromAccount = accounts.find((a) => a.id === params.from_account_id)
    const toAccount = accounts.find((a) => a.id === params.to_account_id)

    // Create the "from" transaction (negative amount)
    const { data: fromTx, error: fromError } = await supabase
      .from('transactions')
      .insert({
        account_id: params.from_account_id,
        category_id: TRANSFER_CATEGORY_ID,
        amount: -Math.abs(params.amount),
        date: params.date,
        description: params.description || `Transfer to ${toAccount?.name}`,
        is_transfer: true,
      })
      .select()
      .single()

    if (fromError) {
      return error(`Failed to create transfer: ${fromError.message}`)
    }

    // Create the "to" transaction (positive amount)
    const { data: toTx, error: toError } = await supabase
      .from('transactions')
      .insert({
        account_id: params.to_account_id,
        category_id: TRANSFER_CATEGORY_ID,
        amount: Math.abs(params.amount),
        date: params.date,
        description: params.description || `Transfer from ${fromAccount?.name}`,
        is_transfer: true,
        transfer_pair_id: fromTx.id,
      })
      .select()
      .single()

    if (toError) {
      // Rollback the from transaction
      await supabase.from('transactions').delete().eq('id', fromTx.id)
      return error(`Failed to create transfer: ${toError.message}`)
    }

    // Update the from transaction with the pair ID
    await supabase
      .from('transactions')
      .update({ transfer_pair_id: toTx.id })
      .eq('id', fromTx.id)

    return success({
      message: 'Transfer created successfully',
      from_transaction: fromTx,
      to_transaction: toTx,
    })
  } catch (err) {
    return error(`Failed to create transfer: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionBulkCategorize(params: {
  workspace_id?: string
  transaction_ids: string[]
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get workspace accounts to validate transactions
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspace_id)

    if (accError) {
      return error(`Database error: ${accError.message}`, 'database')
    }

    const accountIds = accounts?.map((a) => a.id) || []

    // Update all matching transactions
    const { data, error: dbError } = await supabase
      .from('transactions')
      .update({ category_id: params.category_id })
      .in('id', params.transaction_ids)
      .in('account_id', accountIds)
      .select('id')

    if (dbError) {
      return error(`Failed to categorize transactions: ${dbError.message}`)
    }

    return success({
      message: `Successfully categorized ${data?.length || 0} transactions`,
      updated_count: data?.length || 0,
      transaction_ids: data?.map((t) => t.id) || [],
    })
  } catch (err) {
    return error(`Failed to categorize transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionSearch(params: {
  workspace_id?: string
  query: string
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
      return success({ transactions: [], count: 0 })
    }

    const { data, error: dbError } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .in('account_id', accountIds)
      .ilike('description', `%${params.query}%`)
      .order('date', { ascending: false })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      query: params.query,
      transactions: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to search transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionGetByDateRange(params: {
  workspace_id?: string
  start_date: string
  end_date: string
  account_id?: string
}): Promise<ToolResult> {
  const workspace_id = resolveWorkspaceId(params)
  return transactionList({
    workspace_id,
    start_date: params.start_date,
    end_date: params.end_date,
    account_id: params.account_id,
    limit: 1000, // Higher limit for date range queries
  })
}

async function transactionGetUncategorized(params: {
  workspace_id?: string
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
      return success({ transactions: [], count: 0 })
    }

    const { data, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .is('category_id', null)
      .order('date', { ascending: false })
      .limit(params.limit || 50)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      transactions: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to get uncategorized transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function transactionGetRecent(params: {
  workspace_id?: string
  limit?: number
}): Promise<ToolResult> {
  const workspace_id = resolveWorkspaceId(params)
  return transactionList({
    workspace_id,
    limit: params.limit || 10,
  })
}

async function transactionGetDuplicates(params: {
  workspace_id?: string
  days_window?: number
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
      return success({ potential_duplicates: [], count: 0 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (params.days_window || 7))

    const { data, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('amount')
      .order('date')

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Find potential duplicates (same amount, same date, same account)
    const duplicates: Array<{ original: unknown; duplicate: unknown }> = []
    const transactions = data || []

    for (let i = 0; i < transactions.length - 1; i++) {
      const current = transactions[i]
      const next = transactions[i + 1]

      if (
        current.amount === next.amount &&
        current.date === next.date &&
        current.account_id === next.account_id &&
        current.id !== next.id
      ) {
        duplicates.push({
          original: current,
          duplicate: next,
        })
      }
    }

    return success({
      potential_duplicates: duplicates,
      count: duplicates.length,
      days_window: params.days_window || 7,
    })
  } catch (err) {
    return error(`Failed to find duplicates: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
