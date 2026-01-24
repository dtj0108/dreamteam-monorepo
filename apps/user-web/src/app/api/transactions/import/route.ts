import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import {
  checkSingleDuplicate,
  type ExistingTransaction,
} from '@/lib/duplicate-detector'

interface ImportTransaction {
  date: string
  amount: number
  description: string
  notes: string | null
  category_id?: string | null
}

interface ImportRequest {
  account_id: string
  transactions: ImportTransaction[]
  skip_duplicates?: boolean
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

    const body: ImportRequest = await request.json()

    if (!body.account_id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    if (!body.transactions || !Array.isArray(body.transactions) || body.transactions.length === 0) {
      return NextResponse.json(
        { error: 'At least one transaction is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify the account exists AND belongs to this workspace
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', body.account_id)
      .eq('workspace_id', workspaceId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Server-side duplicate checking if enabled (default: true)
    const skipDuplicates = body.skip_duplicates !== false
    let transactionsToInsert = body.transactions
    let skippedDuplicates = 0

    if (skipDuplicates) {
      const dates = body.transactions.map(t => new Date(t.date).getTime()).filter(d => !isNaN(d))

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates))
        minDate.setDate(minDate.getDate() - 1)
        const maxDate = new Date(Math.max(...dates))
        maxDate.setDate(maxDate.getDate() + 1)

        const { data: existingTransactions } = await supabase
          .from('transactions')
          .select('id, date, amount, description')
          .eq('account_id', body.account_id)
          .gte('date', minDate.toISOString().split('T')[0])
          .lte('date', maxDate.toISOString().split('T')[0])

        const existing: ExistingTransaction[] = (existingTransactions || []).map((t: { id: string; date: string; amount: number; description: string | null }) => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          description: t.description || '',
        }))

        transactionsToInsert = body.transactions.filter(t => {
          const result = checkSingleDuplicate(
            { date: t.date, amount: t.amount, description: t.description },
            existing
          )
          if (result.isDuplicate) {
            skippedDuplicates++
            return false
          }
          return true
        })
      }
    }

    // Prepare transactions for insert
    const formattedTransactions = transactionsToInsert.map((t) => ({
      account_id: body.account_id,
      date: t.date,
      amount: t.amount,
      description: t.description,
      notes: t.notes || null,
      category_id: t.category_id || null,
      is_transfer: false,
    }))

    // Insert transactions in batches
    const BATCH_SIZE = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < formattedTransactions.length; i += BATCH_SIZE) {
      const batch = formattedTransactions.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('transactions')
        .insert(batch)
        .select()

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        insertedCount += data?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      imported: insertedCount,
      total: body.transactions.length,
      failed: body.transactions.length - insertedCount - skippedDuplicates,
      skipped_duplicates: skippedDuplicates,
      errors: errors.length > 0 ? errors : undefined,
      account: account.name,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
