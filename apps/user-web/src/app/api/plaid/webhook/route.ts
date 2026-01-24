import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { syncTransactions, verifyWebhookSignature } from '@/lib/plaid'
import { getAccessToken } from '@/lib/encryption'

// Plaid webhook types
type PlaidWebhookType =
  | 'TRANSACTIONS'
  | 'ITEM'
  | 'HOLDINGS'
  | 'INVESTMENTS_TRANSACTIONS'
  | 'LIABILITIES'
  | 'AUTH'
  | 'ASSETS'

interface PlaidWebhook {
  webhook_type: PlaidWebhookType
  webhook_code: string
  item_id: string
  error?: {
    error_code: string
    error_message: string
  }
  new_transactions?: number
}

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()
    const body: PlaidWebhook = JSON.parse(rawBody)
    const { webhook_type, webhook_code, item_id, error } = body

    console.log(`Plaid webhook received: ${webhook_type} - ${webhook_code} for item ${item_id}`)

    // Verify webhook signature (skip in development if header not present)
    const plaidVerification = request.headers.get('Plaid-Verification')
    if (plaidVerification || process.env.NODE_ENV === 'production') {
      const verification = await verifyWebhookSignature(rawBody, plaidVerification)
      if (!verification.valid) {
        console.error('Webhook verification failed:', verification.error)
        // Return 401 for invalid signatures
        return NextResponse.json(
          { error: 'Invalid webhook signature', detail: verification.error },
          { status: 401 }
        )
      }
      console.log('Webhook signature verified successfully')
    } else {
      console.log('Skipping webhook verification in development (no signature header)')
    }

    const supabase = createAdminClient()

    // Find the Plaid item (prefer encrypted token, fallback to plaintext during migration)
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('id, encrypted_access_token, plaid_access_token, workspace_id')
      .eq('plaid_item_id', item_id)
      .single()

    if (itemError || !plaidItem) {
      console.error('Plaid item not found for webhook:', item_id)
      // Return 200 to acknowledge receipt even if item not found
      return NextResponse.json({ received: true })
    }

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(webhook_code, plaidItem, supabase)
        break

      case 'ITEM':
        await handleItemWebhook(webhook_code, plaidItem, error, supabase)
        break

      default:
        console.log('Unhandled webhook type:', webhook_type, webhook_code)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Return 200 to prevent Plaid from retrying
    return NextResponse.json({ received: true })
  }
}

interface PlaidItemRecord {
  id: string
  encrypted_access_token: string | null
  plaid_access_token: string
  workspace_id: string
}

async function handleTransactionsWebhook(
  code: string,
  plaidItem: PlaidItemRecord,
  supabase: ReturnType<typeof createAdminClient>
) {
  switch (code) {
    case 'SYNC_UPDATES_AVAILABLE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
    case 'DEFAULT_UPDATE':
      // Trigger transaction sync
      console.log(`Triggering sync for item ${plaidItem.id} due to ${code}`)
      await triggerSync(plaidItem, supabase)
      break

    case 'TRANSACTIONS_REMOVED':
      // Handle removed transactions
      console.log(`Transactions removed for item ${plaidItem.id}`)
      await triggerSync(plaidItem, supabase)
      break

    default:
      console.log('Unhandled transactions webhook code:', code)
  }
}

async function handleItemWebhook(
  code: string,
  plaidItem: PlaidItemRecord,
  error: PlaidWebhook['error'],
  supabase: ReturnType<typeof createAdminClient>
) {
  switch (code) {
    case 'ERROR':
      // Update item status with error
      console.log(`Item error for ${plaidItem.id}:`, error)
      await supabase
        .from('plaid_items')
        .update({
          status: 'error',
          error_code: error?.error_code,
          error_message: error?.error_message,
        })
        .eq('id', plaidItem.id)
      break

    case 'PENDING_EXPIRATION':
      // Item needs user re-authentication soon
      console.log(`Item ${plaidItem.id} pending expiration`)
      await supabase
        .from('plaid_items')
        .update({
          status: 'pending',
          update_type: 'user_present_required',
        })
        .eq('id', plaidItem.id)
      break

    case 'USER_PERMISSION_REVOKED':
      // User revoked access - mark item as inactive
      console.log(`User revoked permission for item ${plaidItem.id}`)
      await supabase
        .from('plaid_items')
        .update({
          status: 'error',
          error_code: 'USER_PERMISSION_REVOKED',
          error_message: 'User revoked access to this institution',
        })
        .eq('id', plaidItem.id)
      break

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      // Webhook URL was updated, no action needed
      console.log(`Webhook update acknowledged for item ${plaidItem.id}`)
      break

    default:
      console.log('Unhandled item webhook code:', code)
  }
}

async function triggerSync(
  plaidItem: PlaidItemRecord,
  supabase: ReturnType<typeof createAdminClient>
) {
  // Get the decrypted access token (handles both encrypted and plaintext during migration)
  const accessToken = getAccessToken(
    plaidItem.encrypted_access_token || plaidItem.plaid_access_token
  )

  // Get current cursor
  const { data: cursorData } = await supabase
    .from('plaid_sync_cursors')
    .select('cursor')
    .eq('plaid_item_id', plaidItem.id)
    .single()

  // Get account mapping
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, plaid_account_id')
    .eq('plaid_item_id', plaidItem.id)

  const accountMap = new Map(
    (accounts || []).map((a: { id: string; plaid_account_id: string }) => [
      a.plaid_account_id,
      a.id,
    ])
  )

  let cursor = cursorData?.cursor || null

  // Sync loop
  do {
    const result = await syncTransactions(accessToken, cursor)

    if (!result.success) {
      console.error(`Sync failed for item ${plaidItem.id}:`, result.error)
      await supabase
        .from('plaid_items')
        .update({
          status: 'error',
          error_code: result.errorCode,
          error_message: result.error,
        })
        .eq('id', plaidItem.id)
      return
    }

    const { added, modified, removed, cursor: newCursor, hasMore } = result.data!

    // Process added transactions
    for (const tx of added) {
      const localAccountId = accountMap.get(tx.accountId)
      if (!localAccountId) continue

      await supabase.from('transactions').upsert(
        {
          account_id: localAccountId,
          amount: -tx.amount,
          date: tx.date,
          description: tx.merchantName || tx.name,
          plaid_transaction_id: tx.transactionId,
          plaid_pending: tx.pending,
          plaid_merchant_name: tx.merchantName,
          plaid_category: tx.category,
          plaid_payment_channel: tx.paymentChannel,
        },
        { onConflict: 'plaid_transaction_id' }
      )
    }

    // Process modified transactions
    for (const tx of modified) {
      await supabase
        .from('transactions')
        .update({
          amount: -tx.amount,
          date: tx.date,
          description: tx.merchantName || tx.name,
          plaid_pending: tx.pending,
        })
        .eq('plaid_transaction_id', tx.transactionId)
    }

    // Process removed transactions
    for (const tx of removed) {
      await supabase
        .from('transactions')
        .delete()
        .eq('plaid_transaction_id', tx.transactionId)
    }

    cursor = newCursor

    // Update cursor
    await supabase.from('plaid_sync_cursors').upsert(
      {
        plaid_item_id: plaidItem.id,
        cursor: newCursor,
        has_more: hasMore,
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: 'plaid_item_id' }
    )

    if (!hasMore) break
  } while (true)

  // Update success status
  await supabase
    .from('plaid_items')
    .update({
      status: 'good',
      error_code: null,
      error_message: null,
      last_successful_update: new Date().toISOString(),
    })
    .eq('id', plaidItem.id)

  console.log(`Sync completed for item ${plaidItem.id}`)
}
