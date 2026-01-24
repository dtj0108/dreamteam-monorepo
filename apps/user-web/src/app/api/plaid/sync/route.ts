import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { syncTransactions, fireSandboxWebhook, getPlaidEnvironment } from '@/lib/plaid'
import { getAccessToken } from '@/lib/encryption'
import { logPlaidEvent } from '@/lib/audit'

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

    const { plaidItemId } = await request.json()

    if (!plaidItemId) {
      return NextResponse.json({ error: 'Plaid item ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the Plaid item (prefer encrypted token, fallback to plaintext during migration)
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('id, encrypted_access_token, plaid_access_token, workspace_id')
      .eq('id', plaidItemId)
      .eq('workspace_id', workspaceId)
      .single()

    if (itemError || !plaidItem) {
      return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 })
    }

    // Get the decrypted access token (handles both encrypted and plaintext during migration)
    const accessToken = getAccessToken(
      plaidItem.encrypted_access_token || plaidItem.plaid_access_token
    )

    // Get current sync cursor
    const { data: cursorData } = await supabase
      .from('plaid_sync_cursors')
      .select('cursor')
      .eq('plaid_item_id', plaidItem.id)
      .single()

    // Get account mapping (plaid_account_id -> local account id)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, plaid_account_id')
      .eq('plaid_item_id', plaidItem.id)

    const accountMap = new Map(
      (accounts || []).map((a: { id: string; plaid_account_id: string }) => [a.plaid_account_id, a.id])
    )

    console.log(`Account mapping: ${accounts?.length || 0} accounts found for plaid_item_id ${plaidItem.id}`)
    console.log('Account map entries:', Array.from(accountMap.entries()))

    let totalAdded = 0
    let totalModified = 0
    let totalRemoved = 0
    let cursor = cursorData?.cursor || null

    // In sandbox mode, reset cursor and fire webhook to ensure transactions are available
    const isSandbox = getPlaidEnvironment() === 'sandbox'
    if (isSandbox) {
      console.log('Sandbox mode: Resetting cursor and firing webhook to trigger transaction data...')
      // Reset cursor for sandbox to get fresh data
      await supabase
        .from('plaid_sync_cursors')
        .update({ cursor: null })
        .eq('plaid_item_id', plaidItem.id)
      cursor = null

      // Fire webhook to trigger transaction generation
      await fireSandboxWebhook(accessToken)
      // Delay to let Plaid process
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Sync loop (handle pagination)
    do {
      const result = await syncTransactions(accessToken, cursor)

      if (!result.success) {
        // Update item status on error
        await supabase
          .from('plaid_items')
          .update({
            status: 'error',
            error_code: result.errorCode,
            error_message: result.error,
          })
          .eq('id', plaidItem.id)

        return NextResponse.json(
          { error: result.error, errorCode: result.errorCode },
          { status: 500 }
        )
      }

      const { added, modified, removed, cursor: newCursor, hasMore } = result.data!

      console.log(`Plaid sync response: ${added.length} added, ${modified.length} modified, ${removed.length} removed, hasMore: ${hasMore}`)

      // Process added transactions
      for (const tx of added) {
        const localAccountId = accountMap.get(tx.accountId)
        if (!localAccountId) {
          console.log(`Skipping transaction - no local account for plaid_account_id: ${tx.accountId}`)
          continue
        }

        // Plaid: positive amount = money leaving account (debit)
        // Our system: negative amount = expense, positive = income
        // So we negate to match our convention

        // Check if transaction already exists
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('plaid_transaction_id', tx.transactionId)
          .single()

        if (existing) {
          // Update existing transaction
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              amount: -tx.amount,
              date: tx.date,
              description: tx.merchantName || tx.name,
              plaid_pending: tx.pending,
              plaid_merchant_name: tx.merchantName,
              plaid_category: tx.category,
              plaid_payment_channel: tx.paymentChannel,
            })
            .eq('id', existing.id)

          if (!updateError) {
            totalModified++
            console.log(`Updated transaction: ${tx.merchantName || tx.name} - $${tx.amount}`)
          }
        } else {
          // Insert new transaction
          const { error: insertError } = await supabase.from('transactions').insert({
            account_id: localAccountId,
            amount: -tx.amount,
            date: tx.date,
            description: tx.merchantName || tx.name,
            plaid_transaction_id: tx.transactionId,
            plaid_pending: tx.pending,
            plaid_merchant_name: tx.merchantName,
            plaid_category: tx.category,
            plaid_payment_channel: tx.paymentChannel,
          })

          if (!insertError) {
            totalAdded++
            console.log(`Inserted transaction: ${tx.merchantName || tx.name} - $${tx.amount}`)
          } else {
            console.error(`Failed to insert transaction: ${insertError.message}`, insertError)
          }
        }
      }

      // Process modified transactions
      for (const tx of modified) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            amount: -tx.amount,
            date: tx.date,
            description: tx.merchantName || tx.name,
            plaid_pending: tx.pending,
            plaid_merchant_name: tx.merchantName,
            plaid_category: tx.category,
          })
          .eq('plaid_transaction_id', tx.transactionId)

        if (!updateError) totalModified++
      }

      // Process removed transactions
      for (const tx of removed) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('plaid_transaction_id', tx.transactionId)

        if (!deleteError) totalRemoved++
      }

      cursor = newCursor

      // Update cursor
      await supabase
        .from('plaid_sync_cursors')
        .upsert({
          plaid_item_id: plaidItem.id,
          cursor: newCursor,
          has_more: hasMore,
          last_sync_at: new Date().toISOString(),
        }, { onConflict: 'plaid_item_id' })

      if (!hasMore) break
    } while (true)

    // Update item status to success
    await supabase
      .from('plaid_items')
      .update({
        status: 'good',
        error_code: null,
        error_message: null,
        last_successful_update: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)

    // Audit log: Sync completed
    await logPlaidEvent(
      'plaid.sync',
      plaidItem.id,
      workspaceId,
      userId!,
      request,
      { added: totalAdded, modified: totalModified, removed: totalRemoved }
    )

    return NextResponse.json({
      success: true,
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}
