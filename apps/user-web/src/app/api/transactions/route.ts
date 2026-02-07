import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { fireWebhooks } from '@/lib/make-webhooks'
import { checkBudgetAlerts } from '@/lib/budget-alerts'
import { parseRequestBody } from '@/lib/api-validation'

const createTransactionSchema = z.object({
  account_id: z.string().min(1, 'account_id is required'),
  category_id: z.string().nullable().optional().transform(v => v ?? null),
  amount: z.number({ error: 'amount is required' }),
  date: z.string().min(1, 'date is required'),
  description: z.string().optional(),
  notes: z.string().nullable().optional().transform(v => v ?? null),
})

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = auth.type === 'api_key' ? null : auth.userId
    const workspaceId = auth.type === 'api_key'
      ? auth.workspaceId
      : await getCurrentWorkspaceId(auth.userId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const categoryId = searchParams.get('categoryId')
    const limit = searchParams.get('limit')

    const supabase = createAdminClient()

    // First get workspace's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ transactions: [] })
    }

    const accountIds = accounts.map((a: any) => a.id)

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .in('account_id', accountIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (accountId && accountId !== 'all') {
      query = query.eq('account_id', accountId)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { transactions: transactions || [] },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[transactions/list] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = auth.type === 'api_key' ? null : auth.userId
    const workspaceId = auth.type === 'api_key'
      ? auth.workspaceId
      : await getCurrentWorkspaceId(auth.userId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    const result = await parseRequestBody(request, createTransactionSchema)
    if ('error' in result) return result.error
    const { account_id, category_id, amount, date, description, notes } = result.data

    const supabase = createAdminClient()

    // Verify account belongs to workspace
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('workspace_id', workspaceId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        account_id,
        category_id: category_id || null,
        amount,
        date,
        description,
        notes,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // Fire webhook for Make.com triggers
    await fireWebhooks('transaction.created', transaction, workspaceId)

    // Check budget alerts
    await checkBudgetAlerts(
      { amount, category_id, date },
      workspaceId
    )

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[transactions/create] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}

