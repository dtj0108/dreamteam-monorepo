import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { exchangePublicToken, getAccounts, mapPlaidAccountType, isPlaidConfigured, fireSandboxWebhook, getPlaidEnvironment } from '@/lib/plaid'
import { encryptToken } from '@/lib/encryption'
import { logPlaidEvent } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: 'Plaid is not configured' },
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

    const { publicToken, institutionId, institutionName, forceNew, replaceExisting } = await request.json()

    if (!publicToken) {
      return NextResponse.json({ error: 'Public token is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check for existing connection with same institution (duplicate detection)
    if (institutionId && !forceNew && !replaceExisting) {
      const { data: existingItem } = await supabase
        .from('plaid_items')
        .select('id, institution_name, status')
        .eq('workspace_id', workspaceId)
        .eq('plaid_institution_id', institutionId)
        .single()

      if (existingItem) {
        // Get account count for display
        const { count } = await supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true })
          .eq('plaid_item_id', existingItem.id)

        return NextResponse.json({
          duplicateDetected: true,
          existingItem: {
            id: existingItem.id,
            institutionName: existingItem.institution_name,
            accountCount: count || 0,
            status: existingItem.status,
          }
        })
      }
    }

    // Exchange public token for access token
    const exchangeResult = await exchangePublicToken(publicToken)
    if (!exchangeResult.success) {
      return NextResponse.json(
        { error: exchangeResult.error, errorCode: exchangeResult.errorCode },
        { status: 500 }
      )
    }

    const { accessToken, itemId } = exchangeResult.data!

    // Encrypt the access token before storing
    const encryptedAccessToken = encryptToken(accessToken)

    // Handle replaceExisting - update existing connection with new credentials
    if (replaceExisting) {
      const { data: updatedItem, error: updateError } = await supabase
        .from('plaid_items')
        .update({
          plaid_item_id: itemId,
          encrypted_access_token: encryptedAccessToken,
          status: 'good',
          error_code: null,
          error_message: null,
          consent_expiration_time: null,
        })
        .eq('id', replaceExisting)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update Plaid item:', updateError)
        return NextResponse.json(
          { error: 'Failed to update connection' },
          { status: 500 }
        )
      }

      // Audit log: Bank connection credentials refreshed
      await logPlaidEvent(
        'plaid.connected',
        updatedItem.id,
        workspaceId,
        session.id,
        request,
        {
          institution: institutionName,
          credentialsRefreshed: true,
        }
      )

      return NextResponse.json({
        success: true,
        updated: true,
        itemId: updatedItem.id,
      })
    }

    // Proceed with normal creation (forceNew or no duplicate)

    // Store the Plaid Item with encrypted token only (no plaintext)
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .insert({
        workspace_id: workspaceId,
        user_id: session.id,
        plaid_item_id: itemId,
        encrypted_access_token: encryptedAccessToken,
        plaid_institution_id: institutionId || null,
        institution_name: institutionName || 'Unknown Institution',
        status: 'good',
      })
      .select()
      .single()

    if (itemError) {
      console.error('Failed to store Plaid item:', itemError)
      return NextResponse.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      )
    }

    // Initialize sync cursor
    await supabase.from('plaid_sync_cursors').insert({
      plaid_item_id: plaidItem.id,
      cursor: null,
      has_more: true,
    })

    // Fetch accounts from Plaid
    const accountsResult = await getAccounts(accessToken)
    if (!accountsResult.success) {
      return NextResponse.json({
        warning: 'Connection saved but failed to fetch accounts',
        plaidItemId: plaidItem.id,
      })
    }

    // Create local accounts for each Plaid account
    const createdAccounts = []
    for (const plaidAccount of accountsResult.data!) {
      const accountType = mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype)

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          workspace_id: workspaceId,
          user_id: session.id,
          name: plaidAccount.officialName || plaidAccount.name,
          type: accountType,
          balance: plaidAccount.balances.current || 0,
          institution: institutionName || 'Unknown Institution',
          last_four: plaidAccount.mask,
          plaid_account_id: plaidAccount.accountId,
          plaid_item_id: plaidItem.id,
          plaid_mask: plaidAccount.mask,
          plaid_name: plaidAccount.name,
          plaid_official_name: plaidAccount.officialName,
          plaid_subtype: plaidAccount.subtype,
          plaid_available_balance: plaidAccount.balances.available,
          plaid_current_balance: plaidAccount.balances.current,
          plaid_limit: plaidAccount.balances.limit,
          is_plaid_linked: true,
          plaid_last_balance_update: new Date().toISOString(),
        })
        .select()
        .single()

      if (!accountError && account) {
        createdAccounts.push(account)
      } else if (accountError) {
        console.error('Failed to create account:', accountError)
      }
    }

    // In sandbox mode, fire webhook to trigger initial transaction data
    if (getPlaidEnvironment() === 'sandbox') {
      console.log('Sandbox mode: Firing webhook to trigger transaction data...')
      await fireSandboxWebhook(accessToken)
    }

    // Audit log: Bank connected
    await logPlaidEvent(
      'plaid.connected',
      plaidItem.id,
      workspaceId,
      session.id,
      request,
      {
        institution: institutionName,
        accountsCreated: createdAccounts.length,
      }
    )

    return NextResponse.json({
      success: true,
      plaidItemId: plaidItem.id,
      accountsCreated: createdAccounts.length,
      accounts: createdAccounts,
    })
  } catch (error) {
    console.error('Exchange token error:', error)
    return NextResponse.json(
      { error: 'Failed to process connection' },
      { status: 500 }
    )
  }
}
