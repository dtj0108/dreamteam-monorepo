import { z } from 'zod'
import { getSupabase, validateWorkspaceAccess } from '../../auth.js'
import { resolveWorkspaceId } from '../../lib/context.js'
import {
  workspaceIdSchema,
  categoryTypeSchema,
  dateRangeSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Tool definitions for categories
export const categoryTools = {
  category_list: {
    description: 'List all categories available in the workspace',
    inputSchema: workspaceIdSchema.extend({
      type: categoryTypeSchema.optional().describe('Filter by category type (income or expense)'),
      include_system: z.boolean().optional().default(true).describe('Include system categories'),
    }),
    handler: categoryList,
  },

  category_get: {
    description: 'Get a single category by ID',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('The category ID'),
    }),
    handler: categoryGet,
  },

  category_create: {
    description: 'Create a new custom category',
    inputSchema: workspaceIdSchema.extend({
      name: z.string().min(1).describe('Category name'),
      type: categoryTypeSchema.describe('Category type (income or expense)'),
      icon: z.string().optional().describe('Icon identifier'),
      color: z.string().optional().describe('Color hex code'),
      parent_id: z.string().uuid().optional().describe('Parent category ID for subcategories'),
    }),
    handler: categoryCreate,
  },

  category_update: {
    description: 'Update an existing category',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('The category ID'),
      name: z.string().min(1).optional().describe('New name'),
      icon: z.string().optional().describe('New icon'),
      color: z.string().optional().describe('New color'),
    }),
    handler: categoryUpdate,
  },

  category_delete: {
    description: 'Delete a custom category',
    inputSchema: workspaceIdSchema.extend({
      category_id: z.string().uuid().describe('The category ID to delete'),
    }),
    handler: categoryDelete,
  },

  category_get_spending: {
    description: 'Get total spending for a specific category',
    inputSchema: workspaceIdSchema.merge(dateRangeSchema).extend({
      category_id: z.string().uuid().describe('The category ID'),
    }),
    handler: categoryGetSpending,
  },

  category_list_with_totals: {
    description: 'List all categories with their spending totals',
    inputSchema: workspaceIdSchema.merge(dateRangeSchema),
    handler: categoryListWithTotals,
  },
}

// Handler implementations

async function categoryList(params: {
  workspace_id?: string
  type?: 'income' | 'expense'
  include_system?: boolean
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Categories are either system-wide (is_system=true) or workspace-specific
    let query = supabase
      .from('categories')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (params.type) {
      query = query.eq('type', params.type)
    }

    // Filter: include system categories OR workspace-specific
    if (params.include_system !== false) {
      query = query.or(`is_system.eq.true,workspace_id.eq.${workspace_id}`)
    } else {
      query = query.eq('workspace_id', workspace_id)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`, 'database')
    }

    return success({
      categories: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list categories: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryGet(params: {
  workspace_id?: string
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', params.category_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Category not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`, 'database')
    }

    // Verify access (system categories are accessible to all)
    if (!data.is_system && data.workspace_id !== workspace_id) {
      return error('Category not found in this workspace', 'not_found')
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryCreate(params: {
  workspace_id?: string
  name: string
  type: 'income' | 'expense'
  icon?: string
  color?: string
  parent_id?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()
    const { data, error: dbError } = await supabase
      .from('categories')
      .insert({
        workspace_id: workspace_id,
        name: params.name,
        type: params.type,
        icon: params.icon || null,
        color: params.color || null,
        parent_id: params.parent_id || null,
        is_system: false,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create category: ${dbError.message}`)
    }

    return success({
      message: 'Category created successfully',
      category: data,
    })
  } catch (err) {
    return error(`Failed to create category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryUpdate(params: {
  workspace_id?: string
  category_id: string
  name?: string
  icon?: string
  color?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify it's not a system category and belongs to workspace
    const { data: existing, error: getError } = await supabase
      .from('categories')
      .select('id, is_system, workspace_id')
      .eq('id', params.category_id)
      .single()

    if (getError || !existing) {
      return error('Category not found', 'not_found')
    }

    if (existing.is_system) {
      return error('Cannot modify system categories', 'access_denied')
    }

    if (existing.workspace_id !== workspace_id) {
      return error('Category not found in this workspace', 'not_found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.color !== undefined) updateData.color = params.color

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 'validation')
    }

    const { data, error: dbError } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', params.category_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update category: ${dbError.message}`)
    }

    return success({
      message: 'Category updated successfully',
      category: data,
    })
  } catch (err) {
    return error(`Failed to update category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryDelete(params: {
  workspace_id?: string
  category_id: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Verify it's not a system category
    const { data: existing, error: getError } = await supabase
      .from('categories')
      .select('id, is_system, workspace_id')
      .eq('id', params.category_id)
      .single()

    if (getError || !existing) {
      return error('Category not found', 'not_found')
    }

    if (existing.is_system) {
      return error('Cannot delete system categories', 'access_denied')
    }

    if (existing.workspace_id !== workspace_id) {
      return error('Category not found in this workspace', 'not_found')
    }

    const { error: dbError } = await supabase
      .from('categories')
      .delete()
      .eq('id', params.category_id)

    if (dbError) {
      return error(`Failed to delete category: ${dbError.message}`)
    }

    return success({
      message: 'Category deleted successfully',
      category_id: params.category_id,
    })
  } catch (err) {
    return error(`Failed to delete category: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryGetSpending(params: {
  workspace_id?: string
  category_id: string
  start_date?: string
  end_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get the category first
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('id', params.category_id)
      .single()

    if (catError || !category) {
      return error('Category not found', 'not_found')
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
    if (accountIds.length === 0) {
      return success({
        category_id: params.category_id,
        category_name: category.name,
        total: 0,
        transaction_count: 0,
      })
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select('amount')
      .in('account_id', accountIds)
      .eq('category_id', params.category_id)

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

    const total = transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0

    return success({
      category_id: params.category_id,
      category_name: category.name,
      category_type: category.type,
      total,
      transaction_count: transactions?.length || 0,
      date_range: {
        start: params.start_date || 'all time',
        end: params.end_date || 'present',
      },
    })
  } catch (err) {
    return error(`Failed to get category spending: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function categoryListWithTotals(params: {
  workspace_id?: string
  start_date?: string
  end_date?: string
}): Promise<ToolResult> {
  try {
    const workspace_id = resolveWorkspaceId(params)
    const member = await validateWorkspaceAccess(workspace_id)
    if (!member) {
      return error('Access denied to workspace', 'access_denied')
    }

    const supabase = getSupabase()

    // Get all categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .or(`is_system.eq.true,workspace_id.eq.${workspace_id}`)
      .order('type')
      .order('name')

    if (catError) {
      return error(`Database error: ${catError.message}`, 'database')
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

    if (accountIds.length === 0) {
      return success({
        categories: categories?.map((c) => ({ ...c, total: 0, transaction_count: 0 })) || [],
      })
    }

    // Get all transactions in date range
    let txQuery = supabase
      .from('transactions')
      .select('category_id, amount')
      .in('account_id', accountIds)
      .not('category_id', 'is', null)

    if (params.start_date) {
      txQuery = txQuery.gte('date', params.start_date)
    }

    if (params.end_date) {
      txQuery = txQuery.lte('date', params.end_date)
    }

    const { data: transactions, error: txError } = await txQuery

    if (txError) {
      return error(`Database error: ${txError.message}`, 'database')
    }

    // Calculate totals per category
    const totals: Record<string, { total: number; count: number }> = {}
    for (const tx of transactions || []) {
      if (!totals[tx.category_id]) {
        totals[tx.category_id] = { total: 0, count: 0 }
      }
      totals[tx.category_id].total += Math.abs(tx.amount)
      totals[tx.category_id].count += 1
    }

    // Merge with categories
    const categoriesWithTotals = categories?.map((cat) => ({
      ...cat,
      total: totals[cat.id]?.total || 0,
      transaction_count: totals[cat.id]?.count || 0,
    }))

    // Sort by total descending
    categoriesWithTotals?.sort((a, b) => b.total - a.total)

    return success({
      categories: categoriesWithTotals || [],
      date_range: {
        start: params.start_date || 'all time',
        end: params.end_date || 'present',
      },
    })
  } catch (err) {
    return error(`Failed to list categories: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
