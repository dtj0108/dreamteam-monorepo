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

    // Validate workspace membership (skip for API key auth - already scoped)
    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    const supabase = createAdminClient()

    // Get all workspace accounts
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, type, institution, balance, currency, last_four, plaid_limit, plaid_available_balance, is_plaid_linked, is_active')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })

    if (error) throw error

    // Calculate totals by type
    const totals = {
      assets: 0,
      liabilities: 0,
      netWorth: 0,
    }

    const assetTypes = ['checking', 'savings', 'investment', 'cash']
    const liabilityTypes = ['credit_card', 'loan']

    for (const account of accounts || []) {
      const balance = account.balance || 0
      if (assetTypes.includes(account.type)) {
        totals.assets += balance
      } else if (liabilityTypes.includes(account.type)) {
        totals.liabilities += Math.abs(balance)
      }
    }

    totals.netWorth = totals.assets - totals.liabilities

    return NextResponse.json({
      accounts: accounts || [],
      totals,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Accounts API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

