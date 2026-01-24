import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { createLinkToken, createUpdateLinkToken, isPlaidConfigured } from '@/lib/plaid'
import { getAccessToken } from '@/lib/encryption'

export async function POST(request: Request) {
  try {
    // Check if Plaid is configured
    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: 'Plaid is not configured. Please add PLAID_CLIENT_ID and PLAID_SECRET to your environment.' },
        { status: 503 }
      )
    }

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

    const body = await request.json().catch(() => ({}))
    const { plaidItemId } = body // For update mode (fixing broken connections)

    let result
    if (plaidItemId) {
      // Update mode - for fixing broken connections
      // Look up the access token from the database (never accept it from client)
      const supabase = createAdminClient()
      const { data: plaidItem, error: itemError } = await supabase
        .from('plaid_items')
        .select('encrypted_access_token, plaid_access_token')
        .eq('id', plaidItemId)
        .eq('workspace_id', workspaceId)
        .single()

      if (itemError || !plaidItem) {
        return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 })
      }

      // Get the decrypted access token
      const accessToken = getAccessToken(
        plaidItem.encrypted_access_token || plaidItem.plaid_access_token
      )

      result = await createUpdateLinkToken(session.id, accessToken)
    } else {
      // New connection mode
      result = await createLinkToken(session.id)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      linkToken: result.data!.linkToken,
      expiration: result.data!.expiration,
    })
  } catch (error) {
    console.error('Link token error:', error)
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    )
  }
}
