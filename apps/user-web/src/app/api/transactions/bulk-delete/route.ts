import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

interface BulkDeleteRequest {
  transaction_ids: string[]
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

    const body: BulkDeleteRequest = await request.json()

    if (!body.transaction_ids || !Array.isArray(body.transaction_ids) || body.transaction_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one transaction ID is required' },
        { status: 400 }
      )
    }

    if (body.transaction_ids.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 transactions can be deleted at once' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get account IDs for this workspace
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: { id: string }) => a.id) || []

    if (accountIds.length === 0) {
      return NextResponse.json({ error: 'No accounts found' }, { status: 400 })
    }

    // Delete transactions (only those belonging to workspace's accounts)
    const { error, count } = await supabase
      .from('transactions')
      .delete()
      .in('id', body.transaction_ids)
      .in('account_id', accountIds)

    if (error) {
      console.error('Bulk delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: count || body.transaction_ids.length,
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    )
  }
}
