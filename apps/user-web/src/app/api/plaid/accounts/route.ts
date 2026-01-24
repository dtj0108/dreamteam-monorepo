import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Get all Plaid items for the workspace
    const { data: plaidItems, error } = await supabase
      .from('plaid_items')
      .select(`
        id,
        plaid_item_id,
        institution_name,
        status,
        error_code,
        error_message,
        last_successful_update,
        created_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get linked accounts for each item
    const itemsWithAccounts = await Promise.all(
      (plaidItems || []).map(async (item: { id: string; plaid_item_id: string; institution_name: string; status: string; error_code: string | null; error_message: string | null; last_successful_update: string | null; created_at: string }) => {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, name, type, balance, last_four, is_plaid_linked')
          .eq('plaid_item_id', item.id)

        return {
          ...item,
          accounts: accounts || [],
        }
      })
    )

    return NextResponse.json({ items: itemsWithAccounts })
  } catch (error) {
    console.error('Get Plaid accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}
