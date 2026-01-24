import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { removeItem } from '@/lib/plaid'
import { getAccessToken } from '@/lib/encryption'
import { logPlaidEvent } from '@/lib/audit'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const supabase = createAdminClient()

    // Get the Plaid item (prefer encrypted token, fallback to plaintext during migration)
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('id, encrypted_access_token, plaid_access_token')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (itemError || !plaidItem) {
      return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 })
    }

    // Get the decrypted access token (handles both encrypted and plaintext during migration)
    const accessToken = getAccessToken(
      plaidItem.encrypted_access_token || plaidItem.plaid_access_token
    )

    // Remove from Plaid (best effort - don't fail if this errors)
    const removeResult = await removeItem(accessToken)
    if (!removeResult.success) {
      console.warn('Failed to remove item from Plaid:', removeResult.error)
      // Continue anyway - we still want to clean up locally
    }

    // Unlink accounts (don't delete, just remove Plaid reference)
    await supabase
      .from('accounts')
      .update({
        plaid_item_id: null,
        plaid_account_id: null,
        is_plaid_linked: false,
      })
      .eq('plaid_item_id', plaidItem.id)

    // Delete sync cursor (will cascade due to foreign key)
    await supabase
      .from('plaid_sync_cursors')
      .delete()
      .eq('plaid_item_id', plaidItem.id)

    // Delete the Plaid item
    const { error: deleteError } = await supabase
      .from('plaid_items')
      .delete()
      .eq('id', plaidItem.id)

    if (deleteError) {
      console.error('Failed to delete Plaid item:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    // Audit log: Bank disconnected
    await logPlaidEvent(
      'plaid.disconnected',
      id,
      workspaceId,
      session.id,
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete Plaid item error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
