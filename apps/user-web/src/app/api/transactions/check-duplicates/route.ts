import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import {
  checkForDuplicates,
  getDateRange,
  type TransactionForComparison,
  type ExistingTransaction,
  type DuplicateCheckResult,
} from '@/lib/duplicate-detector'

interface CheckDuplicatesRequest {
  account_id: string
  transactions: TransactionForComparison[]
}

export interface DuplicateCheckResponse {
  results: DuplicateCheckResult[]
  duplicateCount: number
  totalChecked: number
}

export async function POST(request: Request) {
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

    const body: CheckDuplicatesRequest = await request.json()

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
      .select('id')
      .eq('id', body.account_id)
      .eq('workspace_id', workspaceId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get date range from incoming transactions
    const dateRange = getDateRange(body.transactions)

    if (!dateRange) {
      const emptyResults: DuplicateCheckResult[] = body.transactions.map(() => ({
        isDuplicate: false,
        similarity: 0,
        matchedTransaction: null,
      }))

      return NextResponse.json({
        results: emptyResults,
        duplicateCount: 0,
        totalChecked: body.transactions.length,
      })
    }

    // Fetch existing transactions within the date range (with buffer)
    const minDate = new Date(dateRange.minDate)
    minDate.setDate(minDate.getDate() - 1)
    const maxDate = new Date(dateRange.maxDate)
    maxDate.setDate(maxDate.getDate() + 1)

    const { data: existingTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, date, amount, description')
      .eq('account_id', body.account_id)
      .gte('date', minDate.toISOString().split('T')[0])
      .lte('date', maxDate.toISOString().split('T')[0])

    if (txError) {
      console.error('Error fetching existing transactions:', txError)
      return NextResponse.json(
        { error: 'Failed to check for duplicates' },
        { status: 500 }
      )
    }

    const existing: ExistingTransaction[] = (existingTransactions || []).map((t: { id: string; date: string; amount: number; description: string | null }) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      description: t.description || '',
    }))

    const results = checkForDuplicates(body.transactions, existing)
    const duplicateCount = results.filter(r => r.isDuplicate).length

    const response: DuplicateCheckResponse = {
      results,
      duplicateCount,
      totalChecked: body.transactions.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Duplicate check error:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    )
  }
}
