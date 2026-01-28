import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  accountTypeSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for accounts
export const accountTools = {
  account_list: {
    description: 'List all financial accounts in a workspace',
    inputSchema: workspaceIdSchema.extend({
      type: accountTypeSchema.optional().describe('Filter by account type'),
      is_active: z.boolean().optional().describe('Filter by active status'),
    }),
    handler: accountList,
  },

  account_get: {
    description: 'Get a single account by ID',
    inputSchema: workspaceIdSchema.extend({
      account_id: z.string().uuid().describe('The account ID'),
    }),
    handler: accountGet,
  },

  account_create: {
    description: 'Create a new financial account',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Account name'),
      type: accountTypeSchema.describe('Account type'),
      balance: z.number().optional().default(0).describe('Initial balance'),
      institution: z.string().optional().describe('Financial institution name'),
      currency: z.string().optional().default('USD').describe('Currency code'),
    }),
    handler: accountCreate,
  },

  account_update: {
    description: 'Update an existing account',
    inputSchema: workspaceIdSchema.extend({
      account_id: z.string().uuid().describe('The account ID'),
      name: z.string().min(1).optional().describe('New account name'),
      type: accountTypeSchema.optional().describe('New account type'),
      institution: z.string().optional().describe('New institution name'),
      is_active: z.boolean().optional().describe('Active status'),
    }),
    handler: accountUpdate,
  },

  account_delete: {
    description: 'Delete an account',
    inputSchema: workspaceIdSchema.extend({
      account_id: z.string().uuid().describe('The account ID to delete'),
    }),
    handler: accountDelete,
  },

  account_get_balance: {
    description: 'Get the current balance for an account',
    inputSchema: workspaceIdSchema.extend({
      account_id: z.string().uuid().describe('The account ID'),
    }),
    handler: accountGetBalance,
  },

  account_list_by_type: {
    description: 'List all accounts of a specific type',
    inputSchema: workspaceIdSchema.extend({
      type: accountTypeSchema.describe('Account type to filter by'),
    }),
    handler: accountListByType,
  },

  account_get_totals: {
    description: 'Get total balances across all accounts, optionally grouped',
    inputSchema: workspaceIdSchema.extend({
      group_by: z
        .enum(['type', 'institution'])
        .optional()
        .describe('How to group the totals'),
    }),
    handler: accountGetTotals,
  },
}

// Handler implementations

async function accountList(params: {
  workspace_id?: string
  type?: string
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
      .from('accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: true })

    if (params.type) {
      query = query.eq('type', params.type)
    }

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      accounts: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list accounts: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function accountGet(params: {
  workspace_id?: string
  account_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', params.account_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Account not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get account: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function accountCreate(params: {
  workspace_id?: string
  name: string
  type: string
  balance?: number
  institution?: string
  currency?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('accounts')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        type: params.type,
        balance: params.balance || 0,
        institution: params.institution || null,
        currency: params.currency || 'USD',
        is_active: true,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create account: ${dbError.message}`)
    }

    return success({
      message: 'Account created successfully',
      account: data,
    })
  } catch (err) {
    return error(`Failed to create account: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function accountUpdate(params: {
  workspace_id?: string
  account_id: string
  name?: string
  type?: string
  institution?: string
  is_active?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.type !== undefined) updateData.type = params.type
    if (params.institution !== undefined) updateData.institution = params.institution
    if (params.is_active !== undefined) updateData.is_active = params.is_active

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', params.account_id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Account not found', 'not_found')
      }
      return error(`Failed to update account: ${dbError.message}`)
    }

    return success({
      message: 'Account updated successfully',
      account: data,
    })
  } catch (err) {
    return error(`Failed to update account: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function accountDelete(params: {
  workspace_id?: string
  account_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { error: dbError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', params.account_id)
      .eq('workspace_id', workspace_id)

    if (dbError) {
      return error(`Failed to delete account: ${dbError.message}`)
    }

    return success({
      message: 'Account deleted successfully',
      account_id: params.account_id,
    })
  } catch (err) {
    return error(`Failed to delete account: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function accountGetBalance(params: {
  workspace_id?: string
  account_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('accounts')
      .select('id, name, balance, currency')
      .eq('id', params.account_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Account not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      account_id: data.id,
      name: data.name,
      balance: data.balance,
      currency: data.currency,
    })
  } catch (err) {
    return error(`Failed to get balance: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function accountListByType(params: {
  workspace_id?: string
  type: string
}): Promise<ToolResult> {
  const workspace_id = resolveWorkspaceId(params)
  return accountList({ workspace_id, type: params.type, is_active: true })
}

async function accountGetTotals(params: {
  workspace_id?: string
  group_by?: 'type' | 'institution'
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('accounts')
      .select('type, institution, balance, currency')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    const accounts = data || []
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

    if (!params.group_by) {
      return success({
        total_balance: totalBalance,
        account_count: accounts.length,
      })
    }

    // Group by the specified field
    const grouped: Record<string, { total: number; count: number }> = {}
    for (const account of accounts) {
      const key = account[params.group_by] || 'Unknown'
      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0 }
      }
      grouped[key].total += account.balance || 0
      grouped[key].count += 1
    }

    return success({
      total_balance: totalBalance,
      account_count: accounts.length,
      grouped_by: params.group_by,
      groups: grouped,
    })
  } catch (err) {
    return error(`Failed to get totals: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
