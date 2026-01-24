import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import type { DetectedSubscription, RecurringFrequency, Transaction } from '@dreamteam/database/types'

interface TransactionGroup {
  pattern: string
  transactions: Transaction[]
  amounts: number[]
}

/**
 * Normalize merchant name for pattern matching
 * - Lowercase
 * - Remove common suffixes (LLC, Inc, etc.)
 * - Remove extra whitespace
 * - Remove transaction IDs and dates from descriptions
 */
function normalizeMerchantName(description: string): string {
  return description
    .toLowerCase()
    .replace(/\s+(llc|inc|corp|ltd|co|company)\.?$/i, '')
    .replace(/\s+#?\d+$/i, '') // Remove trailing numbers (often transaction IDs)
    .replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/i, '') // Remove dates
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate the average interval between transactions in days
 */
function calculateAverageInterval(dates: string[]): number {
  if (dates.length < 2) return 0
  
  const sortedDates = dates
    .map(d => new Date(d).getTime())
    .sort((a, b) => a - b)
  
  let totalInterval = 0
  for (let i = 1; i < sortedDates.length; i++) {
    totalInterval += (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
  }
  
  return totalInterval / (sortedDates.length - 1)
}

/**
 * Determine frequency based on average interval
 */
function determineFrequency(avgInterval: number): RecurringFrequency {
  if (avgInterval <= 2) return 'daily'
  if (avgInterval <= 10) return 'weekly'
  if (avgInterval <= 21) return 'biweekly'
  if (avgInterval <= 45) return 'monthly'
  if (avgInterval <= 120) return 'quarterly'
  return 'yearly'
}

/**
 * Calculate confidence score based on various factors
 */
function calculateConfidence(
  transactionCount: number,
  amountVariance: number,
  intervalConsistency: number
): number {
  // Base score from transaction count (more = better, max 40 points)
  const countScore = Math.min(transactionCount * 10, 40)
  
  // Amount consistency (lower variance = better, max 30 points)
  const amountScore = Math.max(0, 30 - amountVariance * 100)
  
  // Interval consistency (higher = better, max 30 points)
  const intervalScore = intervalConsistency * 30
  
  return Math.round(Math.min(countScore + amountScore + intervalScore, 100))
}

/**
 * Calculate variance of amounts (normalized as percentage)
 */
function calculateAmountVariance(amounts: number[]): number {
  if (amounts.length === 0) return 1
  
  const avg = amounts.reduce((sum, a) => sum + Math.abs(a), 0) / amounts.length
  if (avg === 0) return 1
  
  const variance = amounts.reduce((sum, a) => sum + Math.pow(Math.abs(a) - avg, 2), 0) / amounts.length
  const stdDev = Math.sqrt(variance)
  
  return stdDev / avg // Coefficient of variation
}

/**
 * Calculate interval consistency (0-1, higher is more consistent)
 */
function calculateIntervalConsistency(dates: string[], expectedFrequency: RecurringFrequency): number {
  if (dates.length < 2) return 0
  
  const expectedIntervals: Record<RecurringFrequency, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 91,
    yearly: 365,
  }
  
  const expectedInterval = expectedIntervals[expectedFrequency]
  const sortedDates = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b)
  
  let totalDeviation = 0
  for (let i = 1; i < sortedDates.length; i++) {
    const interval = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
    totalDeviation += Math.abs(interval - expectedInterval) / expectedInterval
  }
  
  const avgDeviation = totalDeviation / (sortedDates.length - 1)
  return Math.max(0, 1 - avgDeviation)
}

/**
 * Calculate next renewal date based on last charge and frequency
 */
function calculateNextRenewal(lastChargeDate: string, frequency: RecurringFrequency): string {
  const date = new Date(lastChargeDate)
  const today = new Date()
  
  const addInterval = () => {
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'biweekly':
        date.setDate(date.getDate() + 14)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
    }
  }
  
  // Keep adding intervals until we're in the future
  while (date <= today) {
    addInterval()
  }
  
  return date.toISOString().split('T')[0]
}

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get all transactions from the last 12 months for accounts in this workspace
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    // First get account IDs for this workspace
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)

    const accountIds = (accounts || []).map((a: { id: string }) => a.id)

    if (accountIds.length === 0) {
      return NextResponse.json({
        detected: [],
        analyzed_transactions: 0,
      })
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds)
      .gte('date', oneYearAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Get existing subscriptions for this workspace to exclude
    const { data: existingSubscriptions } = await supabase
      .from('subscriptions')
      .select('merchant_pattern')
      .eq('workspace_id', workspaceId)

    const existingPatterns = new Set(
      (existingSubscriptions || []).map((s: { merchant_pattern: string }) => s.merchant_pattern.toLowerCase())
    )

    // Group transactions by normalized merchant name (only expenses)
    const groups: Map<string, TransactionGroup> = new Map()
    const txList = transactions || []

    for (const tx of txList) {
      // Only consider expenses (negative amounts)
      if (tx.amount >= 0) continue
      
      const pattern = normalizeMerchantName(tx.description)
      if (!pattern || pattern.length < 3) continue
      
      // Skip if already tracked
      if (existingPatterns.has(pattern)) continue
      
      if (!groups.has(pattern)) {
        groups.set(pattern, {
          pattern,
          transactions: [],
          amounts: [],
        })
      }
      
      const group = groups.get(pattern)!
      group.transactions.push(tx)
      group.amounts.push(tx.amount)
    }

    // Filter and score potential subscriptions
    const detectedSubscriptions: DetectedSubscription[] = []
    
    for (const [pattern, group] of groups) {
      // Need at least 2 transactions to detect a pattern
      if (group.transactions.length < 2) continue
      
      // Check amount variance (within 10% is considered consistent)
      const amountVariance = calculateAmountVariance(group.amounts)
      if (amountVariance > 0.1) continue
      
      // Calculate average amount
      const avgAmount = group.amounts.reduce((sum, a) => sum + a, 0) / group.amounts.length
      
      // Get dates for interval calculation
      const dates = group.transactions.map(t => t.date)
      const avgInterval = calculateAverageInterval(dates)
      
      // Skip if interval is too irregular (more than 400 days)
      if (avgInterval > 400) continue
      
      const frequency = determineFrequency(avgInterval)
      const intervalConsistency = calculateIntervalConsistency(dates, frequency)
      
      // Calculate confidence score
      const confidence = calculateConfidence(
        group.transactions.length,
        amountVariance,
        intervalConsistency
      )
      
      // Only include if confidence is above threshold
      if (confidence < 40) continue
      
      // Sort transactions by date to get the most recent
      const sortedTransactions = [...group.transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      
      const lastChargeDate = sortedTransactions[0].date
      const nextRenewalDate = calculateNextRenewal(lastChargeDate, frequency)
      
      // Generate a display name from the pattern
      const displayName = pattern
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      detectedSubscriptions.push({
        name: displayName,
        merchant_pattern: pattern,
        amount: Math.round(avgAmount * 100) / 100,
        frequency,
        next_renewal_date: nextRenewalDate,
        last_charge_date: lastChargeDate,
        confidence,
        transaction_count: group.transactions.length,
        sample_transactions: sortedTransactions.slice(0, 5),
      })
    }
    
    // Sort by confidence (highest first)
    detectedSubscriptions.sort((a, b) => b.confidence - a.confidence)
    
    return NextResponse.json({
      detected: detectedSubscriptions,
      analyzed_transactions: txList.length,
    })
  } catch (error) {
    console.error('Failed to detect subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to detect subscriptions' },
      { status: 500 }
    )
  }
}

