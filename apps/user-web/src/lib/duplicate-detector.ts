/**
 * Duplicate Detection Utility for CSV Import
 * 
 * Uses fuzzy matching based on:
 * - Exact date match
 * - Exact amount match
 * - Description similarity >= 80% (Levenshtein distance)
 */

export interface TransactionForComparison {
  date: string
  amount: number
  description: string
}

export interface ExistingTransaction extends TransactionForComparison {
  id: string
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarity: number
  matchedTransaction: ExistingTransaction | null
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  
  const m = s1.length
  const n = s2.length
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))
  
  // Initialize first column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
  }
  
  // Initialize first row
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        )
      }
    }
  }
  
  return dp[m][n]
}

/**
 * Calculate similarity percentage between two strings
 * Returns a value between 0 and 100
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 100
  if (!str1 || !str2) return 0
  
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 100
  
  const distance = levenshteinDistance(str1, str2)
  return Math.round((1 - distance / maxLen) * 100)
}

/**
 * Normalize a date string to YYYY-MM-DD format for comparison
 */
function normalizeDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

/**
 * Check if a single transaction is a duplicate of any existing transaction
 */
export function checkSingleDuplicate(
  transaction: TransactionForComparison,
  existingTransactions: ExistingTransaction[],
  similarityThreshold: number = 80
): DuplicateCheckResult {
  const normalizedDate = normalizeDate(transaction.date)
  
  // Filter to transactions with same date and amount
  const candidates = existingTransactions.filter(existing => {
    const existingDate = normalizeDate(existing.date)
    return existingDate === normalizedDate && 
           Math.abs(existing.amount - transaction.amount) < 0.01 // Allow for floating point imprecision
  })
  
  // Check description similarity for each candidate
  for (const candidate of candidates) {
    const similarity = calculateSimilarity(
      transaction.description,
      candidate.description
    )
    
    if (similarity >= similarityThreshold) {
      return {
        isDuplicate: true,
        similarity,
        matchedTransaction: candidate,
      }
    }
  }
  
  return {
    isDuplicate: false,
    similarity: 0,
    matchedTransaction: null,
  }
}

/**
 * Check multiple transactions for duplicates
 */
export function checkForDuplicates(
  newTransactions: TransactionForComparison[],
  existingTransactions: ExistingTransaction[],
  similarityThreshold: number = 80
): DuplicateCheckResult[] {
  return newTransactions.map(transaction => 
    checkSingleDuplicate(transaction, existingTransactions, similarityThreshold)
  )
}

/**
 * Get the date range from an array of transactions
 */
export function getDateRange(transactions: TransactionForComparison[]): { 
  minDate: string
  maxDate: string 
} | null {
  if (transactions.length === 0) return null
  
  const dates = transactions
    .map(t => new Date(t.date).getTime())
    .filter(d => !isNaN(d))
  
  if (dates.length === 0) return null
  
  const minTime = Math.min(...dates)
  const maxTime = Math.max(...dates)
  
  return {
    minDate: new Date(minTime).toISOString().split('T')[0],
    maxDate: new Date(maxTime).toISOString().split('T')[0],
  }
}

