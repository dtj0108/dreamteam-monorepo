import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function GET(request: Request) {
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

    const supabase = createAdminClient()

    // Get workspace's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    if (accountIds.length === 0) {
      return NextResponse.json({ transactions: [] }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Get recent transactions (last 10)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        date,
        description,
        account_id,
        category_id,
        accounts (id, name),
        categories (id, name, type, color)
      `)
      .in('account_id', accountIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    // Format transactions for the dashboard
    const formattedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      accountName: (tx.accounts as any)?.name || 'Unknown',
      categoryName: (tx.categories as any)?.name || 'Uncategorized',
      categoryColor: (tx.categories as any)?.color || '#6b7280',
      type: tx.amount > 0 ? 'income' : 'expense',
    }))

    return NextResponse.json({ transactions: formattedTransactions }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Recent transactions API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recent transactions' },
      { status: 500 }
    )
  }
}
