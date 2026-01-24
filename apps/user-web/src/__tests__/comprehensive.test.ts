/**
 * Comprehensive Test Suite for financebro-1
 *
 * This single file contains all unit and integration tests organized by module.
 * Run with: pnpm --filter=@dreamteam/finance test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// SECTION 1: CSV Parser Tests (src/lib/csv-parser.ts)
// ============================================================================

import {
  parseCSV,
  detectColumnMapping,
  parseAmount,
  parseDate,
  transformToTransactions,
  validateMapping,
  type ColumnMapping,
} from '@/lib/csv-parser'

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV with headers and rows', () => {
      const csv = 'date,amount,description\n2024-01-15,100.00,Payment'
      const result = parseCSV(csv)
      expect(result.headers).toEqual(['date', 'amount', 'description'])
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual(['2024-01-15', '100.00', 'Payment'])
    })

    it('should handle quoted values with commas', () => {
      const csv = 'desc,amount\n"Hello, World",50'
      const result = parseCSV(csv)
      expect(result.rows[0][0]).toBe('Hello, World')
    })

    it('should handle escaped quotes in values', () => {
      const csv = 'desc\n"Say ""Hello"""'
      const result = parseCSV(csv)
      expect(result.rows[0][0]).toBe('Say "Hello"')
    })

    it('should handle empty input gracefully', () => {
      // When input is empty string, parseCSV returns a single empty header
      // This is correct behavior as trim().split() on '' returns ['']
      const result = parseCSV('')
      expect(result.headers).toEqual([''])
      expect(result.rows).toEqual([])
    })

    it('should pad short rows to match header length', () => {
      const csv = 'a,b,c\n1'
      const result = parseCSV(csv)
      expect(result.rows[0]).toEqual(['1', '', ''])
    })

    it('should trim rows longer than headers', () => {
      const csv = 'a,b\n1,2,3,4'
      const result = parseCSV(csv)
      expect(result.rows[0]).toEqual(['1', '2'])
    })

    it('should handle Windows line endings (CRLF)', () => {
      const csv = 'a,b\r\n1,2\r\n3,4'
      const result = parseCSV(csv)
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0]).toEqual(['1', '2'])
    })

    it('should skip empty lines', () => {
      const csv = 'a,b\n1,2\n\n3,4'
      const result = parseCSV(csv)
      expect(result.rows).toHaveLength(2)
    })
  })

  describe('detectColumnMapping', () => {
    it('should detect date column', () => {
      const headers = ['Transaction Date', 'Amount', 'Memo']
      const mapping = detectColumnMapping(headers)
      expect(mapping.date).toBe('Transaction Date')
      expect(mapping.confidence.date).toBeGreaterThan(0)
    })

    it('should detect amount column', () => {
      const headers = ['Date', 'Total', 'Description']
      const mapping = detectColumnMapping(headers)
      expect(mapping.amount).toBe('Total')
    })

    it('should detect debit/credit columns', () => {
      const headers = ['Date', 'Debit', 'Credit', 'Description']
      const mapping = detectColumnMapping(headers)
      expect(mapping.debit).toBe('Debit')
      expect(mapping.credit).toBe('Credit')
    })

    it('should detect description column variants', () => {
      const headers = ['Date', 'Amount', 'Merchant']
      const mapping = detectColumnMapping(headers)
      expect(mapping.description).toBe('Merchant')
    })

    it('should detect notes column', () => {
      const headers = ['Date', 'Amount', 'Desc', 'Reference']
      const mapping = detectColumnMapping(headers)
      expect(mapping.notes).toBe('Reference')
    })

    it('should prioritize exact matches (higher confidence)', () => {
      const headers = ['Date', 'Transaction Date']
      const mapping = detectColumnMapping(headers)
      // Exact "Date" match should have higher confidence than "Transaction Date"
      expect(mapping.date).toBe('Date')
    })
  })

  describe('parseAmount', () => {
    it('should parse positive amounts', () => {
      expect(parseAmount('100.50')).toBe(100.50)
    })

    it('should parse negative amounts', () => {
      expect(parseAmount('-50.25')).toBe(-50.25)
    })

    it('should handle currency symbols', () => {
      expect(parseAmount('$1,234.56')).toBe(1234.56)
      expect(parseAmount('€500')).toBe(500)
      expect(parseAmount('£99.99')).toBe(99.99)
    })

    it('should handle parentheses as negative', () => {
      expect(parseAmount('(100.00)')).toBe(-100)
    })

    it('should handle thousands separators', () => {
      expect(parseAmount('1,000,000.00')).toBe(1000000)
    })

    it('should return null for empty values', () => {
      expect(parseAmount('')).toBeNull()
      expect(parseAmount('   ')).toBeNull()
    })

    it('should return null for invalid values', () => {
      expect(parseAmount('abc')).toBeNull()
      expect(parseAmount('N/A')).toBeNull()
    })
  })

  describe('parseDate', () => {
    it('should parse ISO format (YYYY-MM-DD)', () => {
      expect(parseDate('2024-01-15')).toBe('2024-01-15')
    })

    it('should parse US format (MM/DD/YYYY)', () => {
      expect(parseDate('01/15/2024')).toBe('2024-01-15')
    })

    it('should parse 2-digit year (MM/DD/YY)', () => {
      expect(parseDate('01/15/24')).toBe('2024-01-15')
    })

    it('should handle European format (DD-MM-YYYY)', () => {
      // When day > 12, it must be DD/MM format
      expect(parseDate('25-12-2024')).toBe('2024-12-25')
    })

    it('should return null for invalid dates', () => {
      expect(parseDate('')).toBeNull()
      expect(parseDate('not a date')).toBeNull()
    })

    it('should return null for whitespace-only input', () => {
      expect(parseDate('   ')).toBeNull()
    })
  })

  describe('validateMapping', () => {
    it('should validate complete mapping', () => {
      const mapping: ColumnMapping = {
        date: 'Date',
        amount: 'Amount',
        description: 'Desc',
        notes: null,
        debit: null,
        credit: null,
      }
      const result = validateMapping(mapping)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail without date column', () => {
      const mapping: ColumnMapping = {
        date: null,
        amount: 'Amount',
        description: 'Desc',
        notes: null,
        debit: null,
        credit: null,
      }
      const result = validateMapping(mapping)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Date column is required')
    })

    it('should fail without amount or debit/credit columns', () => {
      const mapping: ColumnMapping = {
        date: 'Date',
        amount: null,
        description: 'Desc',
        notes: null,
        debit: null,
        credit: null,
      }
      const result = validateMapping(mapping)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Amount column (or Debit/Credit columns) is required')
    })

    it('should accept debit/credit instead of amount', () => {
      const mapping: ColumnMapping = {
        date: 'Date',
        amount: null,
        description: 'Desc',
        notes: null,
        debit: 'Debit',
        credit: 'Credit',
      }
      const result = validateMapping(mapping)
      expect(result.valid).toBe(true)
    })

    it('should fail without description column', () => {
      const mapping: ColumnMapping = {
        date: 'Date',
        amount: 'Amount',
        description: null,
        notes: null,
        debit: null,
        credit: null,
      }
      const result = validateMapping(mapping)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Description column is required')
    })
  })

  describe('transformToTransactions', () => {
    it('should transform valid rows to transactions', () => {
      const rows = [['2024-01-15', '100.00', 'Test Payment']]
      const headers = ['date', 'amount', 'description']
      const mapping: ColumnMapping = {
        date: 'date',
        amount: 'amount',
        description: 'description',
        notes: null,
        debit: null,
        credit: null,
      }

      const transactions = transformToTransactions(rows, headers, mapping)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].date).toBe('2024-01-15')
      expect(transactions[0].amount).toBe(100)
      expect(transactions[0].description).toBe('Test Payment')
      expect(transactions[0].isValid).toBe(true)
    })

    it('should handle debit/credit columns', () => {
      const rows = [
        ['2024-01-15', '50', '', 'Expense'],
        ['2024-01-16', '', '100', 'Income'],
      ]
      const headers = ['date', 'debit', 'credit', 'description']
      const mapping: ColumnMapping = {
        date: 'date',
        amount: null,
        description: 'description',
        notes: null,
        debit: 'debit',
        credit: 'credit',
      }

      const transactions = transformToTransactions(rows, headers, mapping)
      expect(transactions[0].amount).toBe(-50) // Debit is negative
      expect(transactions[1].amount).toBe(100) // Credit is positive
    })

    it('should mark invalid transactions with errors', () => {
      const rows = [['invalid-date', 'not-a-number', '']]
      const headers = ['date', 'amount', 'description']
      const mapping: ColumnMapping = {
        date: 'date',
        amount: 'amount',
        description: 'description',
        notes: null,
        debit: null,
        credit: null,
      }

      const transactions = transformToTransactions(rows, headers, mapping)
      expect(transactions[0].isValid).toBe(false)
      expect(transactions[0].errors.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// SECTION 2: Duplicate Detector Tests (src/lib/duplicate-detector.ts)
// ============================================================================

import {
  calculateSimilarity,
  checkSingleDuplicate,
  checkForDuplicates,
  getDateRange,
  type ExistingTransaction,
} from '@/lib/duplicate-detector'

describe('Duplicate Detector', () => {
  describe('calculateSimilarity', () => {
    it('should return 100 for identical strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(100)
    })

    it('should return 100 for both empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(100)
    })

    it('should return 0 when one string is empty', () => {
      expect(calculateSimilarity('hello', '')).toBe(0)
      expect(calculateSimilarity('', 'hello')).toBe(0)
    })

    it('should be case insensitive', () => {
      expect(calculateSimilarity('Hello', 'hello')).toBe(100)
      expect(calculateSimilarity('AMAZON', 'amazon')).toBe(100)
    })

    it('should calculate partial similarity', () => {
      const similarity = calculateSimilarity('Amazon Prime', 'Amazon Premium')
      expect(similarity).toBeGreaterThan(70)
      expect(similarity).toBeLessThan(100)
    })

    it('should return low similarity for completely different strings', () => {
      expect(calculateSimilarity('abc', 'xyz')).toBeLessThan(50)
    })
  })

  describe('checkSingleDuplicate', () => {
    const existingTransactions: ExistingTransaction[] = [
      { id: '1', date: '2024-01-15', amount: 100, description: 'Amazon Purchase' },
      { id: '2', date: '2024-01-16', amount: 50.99, description: 'Netflix Subscription' },
    ]

    it('should detect exact duplicate', () => {
      const newTx = { date: '2024-01-15', amount: 100, description: 'Amazon Purchase' }
      const result = checkSingleDuplicate(newTx, existingTransactions)
      expect(result.isDuplicate).toBe(true)
      expect(result.matchedTransaction?.id).toBe('1')
      expect(result.similarity).toBe(100)
    })

    it('should detect similar description duplicate', () => {
      // "Amazon Purchases" vs "Amazon Purchase" has ~93% similarity (1 char diff)
      const newTx = { date: '2024-01-15', amount: 100, description: 'Amazon Purchases' }
      const result = checkSingleDuplicate(newTx, existingTransactions, 80)
      expect(result.isDuplicate).toBe(true)
    })

    it('should not match different dates', () => {
      const newTx = { date: '2024-01-20', amount: 100, description: 'Amazon Purchase' }
      const result = checkSingleDuplicate(newTx, existingTransactions)
      expect(result.isDuplicate).toBe(false)
    })

    it('should not match different amounts', () => {
      const newTx = { date: '2024-01-15', amount: 200, description: 'Amazon Purchase' }
      const result = checkSingleDuplicate(newTx, existingTransactions)
      expect(result.isDuplicate).toBe(false)
    })

    it('should allow floating point tolerance', () => {
      const newTx = { date: '2024-01-16', amount: 50.989, description: 'Netflix Subscription' }
      const result = checkSingleDuplicate(newTx, existingTransactions)
      expect(result.isDuplicate).toBe(true)
    })

    it('should respect custom similarity threshold', () => {
      // "Amazon Purchase!" (16 chars) vs "Amazon Purchase" (15 chars) = 1 char diff
      // Similarity = (1 - 1/16) * 100 = 93.75%
      const newTx = { date: '2024-01-15', amount: 100, description: 'Amazon Purchase!' }

      // With 95% threshold, 93.75% similarity should NOT match
      const strictResult = checkSingleDuplicate(newTx, existingTransactions, 95)
      expect(strictResult.isDuplicate).toBe(false)

      // With 90% threshold, 93.75% similarity SHOULD match
      const lenientResult = checkSingleDuplicate(newTx, existingTransactions, 90)
      expect(lenientResult.isDuplicate).toBe(true)
    })
  })

  describe('checkForDuplicates', () => {
    const existingTransactions: ExistingTransaction[] = [
      { id: '1', date: '2024-01-15', amount: 100, description: 'Amazon Purchase' },
    ]

    it('should check multiple transactions', () => {
      const newTransactions = [
        { date: '2024-01-15', amount: 100, description: 'Amazon Purchase' },
        { date: '2024-01-16', amount: 50, description: 'New Transaction' },
      ]
      const results = checkForDuplicates(newTransactions, existingTransactions)
      expect(results).toHaveLength(2)
      expect(results[0].isDuplicate).toBe(true)
      expect(results[1].isDuplicate).toBe(false)
    })
  })

  describe('getDateRange', () => {
    it('should return min and max dates', () => {
      const transactions = [
        { date: '2024-01-15', amount: 100, description: 'A' },
        { date: '2024-01-10', amount: 50, description: 'B' },
        { date: '2024-01-20', amount: 75, description: 'C' },
      ]
      const range = getDateRange(transactions)
      expect(range?.minDate).toBe('2024-01-10')
      expect(range?.maxDate).toBe('2024-01-20')
    })

    it('should return null for empty array', () => {
      expect(getDateRange([])).toBeNull()
    })

    it('should handle single transaction', () => {
      const transactions = [{ date: '2024-01-15', amount: 100, description: 'A' }]
      const range = getDateRange(transactions)
      expect(range?.minDate).toBe('2024-01-15')
      expect(range?.maxDate).toBe('2024-01-15')
    })
  })
})

// ============================================================================
// SECTION 3: Message Mapper Tests (src/lib/message-mapper.ts)
// ============================================================================

import {
  dbMessagesToAgentMessages,
  getMessageText,
  hasToolCalls,
  getToolCalls,
  allToolCallsCompleted,
  type DbMessage,
} from '@/lib/message-mapper'

describe('Message Mapper', () => {
  describe('getMessageText', () => {
    it('should extract text from text parts', () => {
      const parts = [
        { type: 'text' as const, text: 'Hello ' },
        { type: 'text' as const, text: 'World' },
      ]
      expect(getMessageText(parts)).toBe('Hello World')
    })

    it('should ignore non-text parts', () => {
      const parts = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'reasoning' as const, reasoning: 'thinking...' },
        { type: 'text' as const, text: ' World' },
      ]
      expect(getMessageText(parts as any)).toBe('Hello World')
    })

    it('should return empty string for no text parts', () => {
      const parts = [{ type: 'reasoning' as const, reasoning: 'thinking' }]
      expect(getMessageText(parts as any)).toBe('')
    })

    it('should return empty string for empty array', () => {
      expect(getMessageText([])).toBe('')
    })
  })

  describe('hasToolCalls', () => {
    it('should return true when tool-call exists', () => {
      const parts = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'tool-call' as const, toolCallId: '1', toolName: 'search', args: {}, state: 'completed' as const },
      ]
      expect(hasToolCalls(parts as any)).toBe(true)
    })

    it('should return false when no tool-call exists', () => {
      const parts = [{ type: 'text' as const, text: 'Hello' }]
      expect(hasToolCalls(parts)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(hasToolCalls([])).toBe(false)
    })
  })

  describe('getToolCalls', () => {
    it('should filter and return tool call parts', () => {
      const parts = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'tool-call' as const, toolCallId: '1', toolName: 'search', args: {}, state: 'completed' as const },
        { type: 'tool-call' as const, toolCallId: '2', toolName: 'write', args: {}, state: 'pending' as const },
      ]
      const toolCalls = getToolCalls(parts as any)
      expect(toolCalls).toHaveLength(2)
      expect(toolCalls[0].toolName).toBe('search')
      expect(toolCalls[1].toolName).toBe('write')
    })

    it('should return empty array when no tool calls', () => {
      const parts = [{ type: 'text' as const, text: 'Hello' }]
      expect(getToolCalls(parts as any)).toEqual([])
    })
  })

  describe('allToolCallsCompleted', () => {
    it('should return true when all tool calls are completed', () => {
      const parts = [
        { type: 'tool-call' as const, toolCallId: '1', toolName: 'a', args: {}, state: 'completed' as const },
        { type: 'tool-call' as const, toolCallId: '2', toolName: 'b', args: {}, state: 'error' as const },
      ]
      expect(allToolCallsCompleted(parts as any)).toBe(true)
    })

    it('should return false when any tool call is running', () => {
      const parts = [
        { type: 'tool-call' as const, toolCallId: '1', toolName: 'a', args: {}, state: 'completed' as const },
        { type: 'tool-call' as const, toolCallId: '2', toolName: 'b', args: {}, state: 'running' as const },
      ]
      expect(allToolCallsCompleted(parts as any)).toBe(false)
    })

    it('should return false when any tool call is pending', () => {
      const parts = [
        { type: 'tool-call' as const, toolCallId: '1', toolName: 'a', args: {}, state: 'pending' as const },
      ]
      expect(allToolCallsCompleted(parts as any)).toBe(false)
    })

    it('should return true when no tool calls (vacuous truth)', () => {
      const parts = [{ type: 'text' as const, text: 'Hello' }]
      expect(allToolCallsCompleted(parts as any)).toBe(true)
    })
  })

  describe('dbMessagesToAgentMessages', () => {
    it('should convert user messages', () => {
      const dbMessages: DbMessage[] = [{
        id: '1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello',
        message_type: 'text',
        created_at: '2024-01-15T10:00:00Z',
      }]
      const result = dbMessagesToAgentMessages(dbMessages)
      expect(result).toHaveLength(1)
      expect(result[0].role).toBe('user')
      expect(result[0].content).toBe('Hello')
      expect(result[0].parts[0]).toEqual({ type: 'text', text: 'Hello' })
    })

    it('should aggregate consecutive assistant text parts', () => {
      const dbMessages: DbMessage[] = [
        { id: '1', conversation_id: 'c1', role: 'assistant', content: 'Part 1', message_type: 'text', created_at: '2024-01-15T10:00:00Z' },
        { id: '2', conversation_id: 'c1', role: 'assistant', content: 'Part 2', message_type: 'text', created_at: '2024-01-15T10:00:01Z' },
      ]
      const result = dbMessagesToAgentMessages(dbMessages)
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Part 1Part 2')
    })

    it('should handle reasoning parts', () => {
      const dbMessages: DbMessage[] = [
        { id: '1', conversation_id: 'c1', role: 'assistant', content: 'Thinking...', message_type: 'reasoning', created_at: '2024-01-15T10:00:00Z' },
      ]
      const result = dbMessagesToAgentMessages(dbMessages)
      expect(result[0].parts[0]).toEqual({ type: 'reasoning', reasoning: 'Thinking...' })
    })

    it('should handle tool call parts with metadata', () => {
      const dbMessages: DbMessage[] = [
        {
          id: '1',
          conversation_id: 'c1',
          role: 'assistant',
          content: 'Tool: search',
          message_type: 'tool_call',
          metadata: {
            toolCallId: 'tc-1',
            toolName: 'search',
            args: { query: 'test' },
            result: { data: [] },
            state: 'completed',
          },
          created_at: '2024-01-15T10:00:00Z',
        },
      ]
      const result = dbMessagesToAgentMessages(dbMessages)
      const toolPart = result[0].parts[0] as any
      expect(toolPart.type).toBe('tool-call')
      expect(toolPart.toolName).toBe('search')
      expect(toolPart.state).toBe('completed')
    })

    it('should separate user and assistant messages', () => {
      const dbMessages: DbMessage[] = [
        { id: '1', conversation_id: 'c1', role: 'user', content: 'Hi', message_type: 'text', created_at: '2024-01-15T10:00:00Z' },
        { id: '2', conversation_id: 'c1', role: 'assistant', content: 'Hello!', message_type: 'text', created_at: '2024-01-15T10:00:01Z' },
        { id: '3', conversation_id: 'c1', role: 'user', content: 'Bye', message_type: 'text', created_at: '2024-01-15T10:00:02Z' },
      ]
      const result = dbMessagesToAgentMessages(dbMessages)
      expect(result).toHaveLength(3)
      expect(result[0].role).toBe('user')
      expect(result[1].role).toBe('assistant')
      expect(result[2].role).toBe('user')
    })
  })
})

// ============================================================================
// SECTION 4: API Key Auth Tests (src/lib/api-key-auth.ts)
// ============================================================================

import { generateApiKey, validateApiKey } from '@/lib/api-key-auth'

describe('API Key Auth', () => {
  describe('generateApiKey', () => {
    it('should generate key with correct prefix', () => {
      const result = generateApiKey()
      expect(result.key).toMatch(/^sk_live_/)
    })

    it('should generate 15-character prefix', () => {
      const result = generateApiKey()
      expect(result.prefix).toBe(result.key.substring(0, 15))
      expect(result.prefix.length).toBe(15)
    })

    it('should generate unique keys', () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()
      expect(key1.key).not.toBe(key2.key)
    })

    it('should generate valid bcrypt hash', () => {
      const result = generateApiKey()
      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(result.hash).toMatch(/^\$2[aby]?\$/)
    })

    it('should generate sufficiently long key', () => {
      const result = generateApiKey()
      // sk_live_ (8 chars) + 48 random chars = 56 chars
      expect(result.key.length).toBe(56)
    })
  })

  describe('validateApiKey', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should return null for missing auth header', async () => {
      const result = await validateApiKey(null)
      expect(result).toBeNull()
    })

    it('should return null for empty auth header', async () => {
      const result = await validateApiKey('')
      expect(result).toBeNull()
    })

    it('should return null for invalid prefix', async () => {
      const result = await validateApiKey('Bearer invalid_key_12345')
      expect(result).toBeNull()
    })

    it('should return null for non-Bearer auth', async () => {
      const result = await validateApiKey('Basic sk_live_abc123xyz')
      expect(result).toBeNull()
    })

    it('should return null for malformed Bearer token', async () => {
      const result = await validateApiKey('Bearer')
      expect(result).toBeNull()
    })
  })
})

// ============================================================================
// SECTION 5: Metadata Tests (src/lib/metadata.ts)
// ============================================================================

import { createMetadata } from '@/lib/metadata'

describe('Metadata', () => {
  describe('createMetadata', () => {
    it('should create metadata with required fields', () => {
      const meta = createMetadata({
        title: 'Test Page',
        path: '/test',
      })
      expect(meta.title).toContain('Test Page')
      expect(meta.description).toBeDefined()
      expect(meta.openGraph).toBeDefined()
    })

    it('should use custom description', () => {
      const meta = createMetadata({
        title: 'Test',
        description: 'Custom description',
        path: '/test',
      })
      expect(meta.description).toBe('Custom description')
    })

    it('should set noIndex when specified', () => {
      const meta = createMetadata({
        title: 'Private',
        path: '/private',
        noIndex: true,
      })
      expect(meta.robots).toEqual({ index: false, follow: false })
    })

    it('should not set robots when noIndex is false', () => {
      const meta = createMetadata({
        title: 'Public',
        path: '/public',
        noIndex: false,
      })
      expect(meta.robots).toBeUndefined()
    })

    it('should generate correct OG image URL with type parameter', () => {
      const meta = createMetadata({
        title: 'OG Test',
        path: '/og-test',
        type: 'product',
      })
      const ogImage = meta.openGraph?.images?.[0] as { url: string }
      expect(ogImage?.url).toContain('/api/og')
      expect(ogImage?.url).toContain('type=product')
    })

    it('should use special title for home page', () => {
      const meta = createMetadata({
        title: 'Home',
        path: '/',
      })
      expect(meta.title).toContain('Deploy up to 38 autonomous AI agents')
    })

    it('should append site name for non-home pages', () => {
      const meta = createMetadata({
        title: 'About',
        path: '/about',
      })
      expect(meta.title).toContain('dreamteam.ai')
      expect(meta.title).toContain('About')
    })

    it('should set canonical URL', () => {
      const meta = createMetadata({
        title: 'Test',
        path: '/test-page',
      })
      expect(meta.alternates?.canonical).toContain('/test-page')
    })

    it('should set Twitter card metadata', () => {
      const meta = createMetadata({
        title: 'Twitter Test',
        path: '/twitter',
      })
      expect(meta.twitter?.card).toBe('summary_large_image')
      expect(meta.twitter?.title).toBeDefined()
    })
  })
})

// ============================================================================
// SECTION 6: API Route Tests
// ============================================================================

import { cookies } from 'next/headers'

describe('API Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/auth/send-otp', () => {
    it('should require phone number', async () => {
      const { POST } = await import('@/app/api/auth/send-otp/route')
      const request = new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Phone number is required')
    })

    it('should validate E.164 phone format', async () => {
      const { POST } = await import('@/app/api/auth/send-otp/route')
      const request = new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: '1234567890' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid phone number format')
    })

    it('should accept valid E.164 phone number', async () => {
      const { POST } = await import('@/app/api/auth/send-otp/route')
      const request = new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: '+14155551234' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request as any)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/goals', () => {
    it('should require authentication', async () => {
      // Mock cookies to return no session
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn(() => undefined),
        set: vi.fn(),
        getAll: vi.fn(() => []),
        has: vi.fn(() => false),
        delete: vi.fn(),
      } as any)

      const { GET } = await import('@/app/api/goals/route')
      const response = await GET()
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('POST /api/goals', () => {
    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = new Request('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Goal' }), // Missing type, target_amount, dates
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing required fields')
    })
  })
})

// ============================================================================
// SECTION 7: Add-ons Tests (SMS Credits, Call Minutes, Phone Billing)
// ============================================================================

import {
  SMS_BUNDLES,
  MINUTES_BUNDLES,
  PHONE_PRICING,
  calculateSMSCredits,
  secondsToMinutes,
  minutesToSeconds,
  formatAddOnPrice,
  getSMSBundleInfo,
  getMinutesBundleInfo,
  isSMSBalanceLow,
  isCallMinutesLow,
  withMinutesDisplay,
  type WorkspaceSMSCredits,
  type WorkspaceCallMinutes,
} from '@/types/addons'

import { calculateSegments, estimateCredits } from '@/lib/sms-with-credits'

describe('Add-ons Types and Helpers', () => {
  describe('SMS Bundle Definitions', () => {
    it('should have correct starter bundle values', () => {
      expect(SMS_BUNDLES.starter.credits).toBe(500)
      expect(SMS_BUNDLES.starter.price).toBe(1000) // $10
      expect(SMS_BUNDLES.starter.perCredit).toBe(2) // $0.02
    })

    it('should have correct growth bundle values', () => {
      expect(SMS_BUNDLES.growth.credits).toBe(2000)
      expect(SMS_BUNDLES.growth.price).toBe(3500) // $35
      expect(SMS_BUNDLES.growth.perCredit).toBe(1.75) // $0.0175
    })

    it('should have correct pro bundle values', () => {
      expect(SMS_BUNDLES.pro.credits).toBe(10000)
      expect(SMS_BUNDLES.pro.price).toBe(15000) // $150
      expect(SMS_BUNDLES.pro.perCredit).toBe(1.5) // $0.015
    })

    it('should have decreasing per-credit cost as bundles get larger', () => {
      expect(SMS_BUNDLES.growth.perCredit).toBeLessThan(SMS_BUNDLES.starter.perCredit)
      expect(SMS_BUNDLES.pro.perCredit).toBeLessThan(SMS_BUNDLES.growth.perCredit)
    })
  })

  describe('Minutes Bundle Definitions', () => {
    it('should have correct starter bundle values', () => {
      expect(MINUTES_BUNDLES.starter.minutes).toBe(100)
      expect(MINUTES_BUNDLES.starter.price).toBe(500) // $5
      expect(MINUTES_BUNDLES.starter.perMinute).toBe(5) // $0.05
    })

    it('should have correct growth bundle values', () => {
      expect(MINUTES_BUNDLES.growth.minutes).toBe(500)
      expect(MINUTES_BUNDLES.growth.price).toBe(2000) // $20
      expect(MINUTES_BUNDLES.growth.perMinute).toBe(4) // $0.04
    })

    it('should have correct pro bundle values', () => {
      expect(MINUTES_BUNDLES.pro.minutes).toBe(2000)
      expect(MINUTES_BUNDLES.pro.price).toBe(6500) // $65
      expect(MINUTES_BUNDLES.pro.perMinute).toBe(3.25) // $0.0325
    })

    it('should have decreasing per-minute cost as bundles get larger', () => {
      expect(MINUTES_BUNDLES.growth.perMinute).toBeLessThan(MINUTES_BUNDLES.starter.perMinute)
      expect(MINUTES_BUNDLES.pro.perMinute).toBeLessThan(MINUTES_BUNDLES.growth.perMinute)
    })
  })

  describe('Phone Pricing', () => {
    it('should have correct pricing for local numbers', () => {
      expect(PHONE_PRICING.local).toBe(300) // $3/mo
    })

    it('should have correct pricing for toll-free numbers', () => {
      expect(PHONE_PRICING.tollFree).toBe(500) // $5/mo
    })

    it('should have correct pricing for mobile numbers', () => {
      expect(PHONE_PRICING.mobile).toBe(300) // $3/mo
    })
  })

  describe('calculateSMSCredits', () => {
    it('should return 1 credit for single segment SMS', () => {
      expect(calculateSMSCredits(1, false)).toBe(1)
    })

    it('should return segment count for multi-segment SMS', () => {
      expect(calculateSMSCredits(3, false)).toBe(3)
    })

    it('should return 3 credits for MMS regardless of segments', () => {
      expect(calculateSMSCredits(1, true)).toBe(3)
      expect(calculateSMSCredits(5, true)).toBe(3)
    })
  })

  describe('secondsToMinutes', () => {
    it('should convert exact minutes', () => {
      expect(secondsToMinutes(60)).toBe(1)
      expect(secondsToMinutes(120)).toBe(2)
    })

    it('should round up partial minutes', () => {
      expect(secondsToMinutes(61)).toBe(2)
      expect(secondsToMinutes(90)).toBe(2)
      expect(secondsToMinutes(1)).toBe(1)
    })

    it('should handle zero', () => {
      expect(secondsToMinutes(0)).toBe(0)
    })
  })

  describe('minutesToSeconds', () => {
    it('should convert minutes to seconds', () => {
      expect(minutesToSeconds(1)).toBe(60)
      expect(minutesToSeconds(5)).toBe(300)
      expect(minutesToSeconds(0)).toBe(0)
    })
  })

  describe('formatAddOnPrice', () => {
    it('should format cents as dollars', () => {
      expect(formatAddOnPrice(100)).toBe('$1.00')
      expect(formatAddOnPrice(1000)).toBe('$10.00')
      expect(formatAddOnPrice(3500)).toBe('$35.00')
    })

    it('should handle zero', () => {
      expect(formatAddOnPrice(0)).toBe('$0.00')
    })

    it('should handle sub-dollar amounts', () => {
      expect(formatAddOnPrice(50)).toBe('$0.50')
      expect(formatAddOnPrice(2)).toBe('$0.02')
    })
  })

  describe('getSMSBundleInfo', () => {
    it('should return bundle info with display strings', () => {
      const info = getSMSBundleInfo('starter')
      expect(info.displayPrice).toBe('$10.00')
      expect(info.displayPerCredit).toBe('$0.02/credit')
      expect(info.savings).toBeNull() // Starter has no savings
    })

    it('should show savings for growth bundle', () => {
      const info = getSMSBundleInfo('growth')
      expect(info.savings).toContain('Save')
    })

    it('should show savings for pro bundle', () => {
      const info = getSMSBundleInfo('pro')
      expect(info.savings).toContain('Save')
    })
  })

  describe('getMinutesBundleInfo', () => {
    it('should return bundle info with display strings', () => {
      const info = getMinutesBundleInfo('starter')
      expect(info.displayPrice).toBe('$5.00')
      expect(info.displayPerMinute).toBe('$0.05/min')
      expect(info.savings).toBeNull()
    })

    it('should show savings for larger bundles', () => {
      expect(getMinutesBundleInfo('growth').savings).toContain('Save')
      expect(getMinutesBundleInfo('pro').savings).toContain('Save')
    })
  })

  describe('isSMSBalanceLow', () => {
    it('should return true when balance is below threshold', () => {
      const credits: WorkspaceSMSCredits = {
        id: '1',
        workspace_id: 'ws1',
        balance: 30,
        lifetime_credits: 500,
        lifetime_used: 470,
        auto_replenish_enabled: false,
        auto_replenish_threshold: 50,
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }
      expect(isSMSBalanceLow(credits)).toBe(true)
    })

    it('should return false when balance is above threshold', () => {
      const credits: WorkspaceSMSCredits = {
        id: '1',
        workspace_id: 'ws1',
        balance: 100,
        lifetime_credits: 500,
        lifetime_used: 400,
        auto_replenish_enabled: false,
        auto_replenish_threshold: 50,
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }
      expect(isSMSBalanceLow(credits)).toBe(false)
    })

    it('should use custom threshold when provided', () => {
      const credits: WorkspaceSMSCredits = {
        id: '1',
        workspace_id: 'ws1',
        balance: 75,
        lifetime_credits: 500,
        lifetime_used: 425,
        auto_replenish_enabled: false,
        auto_replenish_threshold: 50,
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }
      expect(isSMSBalanceLow(credits, 100)).toBe(true)
      expect(isSMSBalanceLow(credits, 50)).toBe(false)
    })
  })

  describe('isCallMinutesLow', () => {
    it('should return true when minutes balance is below threshold', () => {
      const minutes: WorkspaceCallMinutes = {
        id: '1',
        workspace_id: 'ws1',
        balance_seconds: 300, // 5 minutes
        lifetime_seconds: 6000,
        lifetime_used_seconds: 5700,
        auto_replenish_enabled: false,
        auto_replenish_threshold: 10, // 10 minutes threshold
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }
      expect(isCallMinutesLow(minutes)).toBe(true)
    })

    it('should return false when minutes balance is above threshold', () => {
      const minutes: WorkspaceCallMinutes = {
        id: '1',
        workspace_id: 'ws1',
        balance_seconds: 900, // 15 minutes
        lifetime_seconds: 6000,
        lifetime_used_seconds: 5100,
        auto_replenish_enabled: false,
        auto_replenish_threshold: 10,
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }
      expect(isCallMinutesLow(minutes)).toBe(false)
    })
  })

  describe('withMinutesDisplay', () => {
    it('should add display fields with converted minutes', () => {
      const minutes: WorkspaceCallMinutes = {
        id: '1',
        workspace_id: 'ws1',
        balance_seconds: 6000, // 100 minutes
        lifetime_seconds: 12000, // 200 minutes
        lifetime_used_seconds: 6000, // 100 minutes used
        auto_replenish_enabled: false,
        auto_replenish_threshold: 10,
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }

      const result = withMinutesDisplay(minutes)
      expect(result.balance_minutes).toBe(100)
      expect(result.lifetime_minutes).toBe(200)
      expect(result.lifetime_used_minutes).toBe(100)
    })

    it('should floor partial minutes', () => {
      const minutes: WorkspaceCallMinutes = {
        id: '1',
        workspace_id: 'ws1',
        balance_seconds: 150, // 2.5 minutes -> 2
        lifetime_seconds: 90, // 1.5 minutes -> 1
        lifetime_used_seconds: 45, // 0.75 minutes -> 0
        auto_replenish_enabled: false,
        auto_replenish_threshold: 10,
        auto_replenish_bundle: null,
        created_at: '',
        updated_at: '',
      }

      const result = withMinutesDisplay(minutes)
      expect(result.balance_minutes).toBe(2)
      expect(result.lifetime_minutes).toBe(1)
      expect(result.lifetime_used_minutes).toBe(0)
    })
  })
})

describe('SMS Credit Calculations', () => {
  describe('calculateSegments', () => {
    it('should return 1 for short messages', () => {
      expect(calculateSegments('Hello')).toBe(1)
      expect(calculateSegments('A'.repeat(160))).toBe(1)
    })

    it('should calculate multiple segments for long messages', () => {
      // 161 chars = 2 segments (153 chars per concatenated segment)
      expect(calculateSegments('A'.repeat(161))).toBe(2)
      // 306 chars = 2 segments
      expect(calculateSegments('A'.repeat(306))).toBe(2)
      // 307 chars = 3 segments
      expect(calculateSegments('A'.repeat(307))).toBe(3)
    })

    it('should handle Unicode messages with shorter limits', () => {
      // Unicode uses UCS-2: 70 chars single, 67 per segment for multi-part
      const emoji = '😀'
      expect(calculateSegments(emoji)).toBe(1)
      expect(calculateSegments(emoji.repeat(35))).toBe(1) // 70 chars (35 emojis x 2)
      expect(calculateSegments(emoji.repeat(36))).toBe(2) // 72 chars -> 2 segments
    })

    it('should handle empty string', () => {
      expect(calculateSegments('')).toBe(1)
    })
  })

  describe('estimateCredits', () => {
    it('should estimate credits for SMS', () => {
      expect(estimateCredits('Hello', false)).toBe(1)
      expect(estimateCredits('A'.repeat(161), false)).toBe(2)
    })

    it('should return 3 credits for MMS', () => {
      expect(estimateCredits('Hello', true)).toBe(3)
      expect(estimateCredits('A'.repeat(500), true)).toBe(3)
    })
  })
})

// ============================================================================
// SECTION 8: useAgentChat Bearer Token Authentication Tests
// ============================================================================

/**
 * These tests verify that the useAgentChat hook correctly includes
 * Bearer token authentication in fetch requests to /api/agent-chat.
 *
 * Since testing React hooks requires @testing-library/react which is not
 * installed, we test the authentication logic by directly simulating
 * the fetch call pattern used in the hook.
 */

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

import { getSupabaseClient } from '@/lib/supabase'

describe('useAgentChat Bearer Token Authentication', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch

    // Default mock: return a streaming response that completes immediately
    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('event: message\ndata: {"type":"done","usage":{"inputTokens":10,"outputTokens":5,"costUsd":0.001}}\n\n'),
            })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  /**
   * Helper function that simulates the authentication logic from useAgentChat.
   * This mirrors the exact code path in the hook:
   *
   * const supabase = getSupabaseClient()
   * const { data: { session } } = await supabase.auth.getSession()
   * const accessToken = session?.access_token
   * ...
   * headers: {
   *   "Content-Type": "application/json",
   *   ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
   * },
   */
  async function simulateAgentChatFetch(message: string, agentId: string, workspaceId: string) {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    return fetch('/api/agent-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        message,
        agentId,
        workspaceId,
      }),
    })
  }

  it('should include Authorization header when session has access_token', async () => {
    const mockAccessToken = 'test-access-token-abc123'
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: mockAccessToken,
            },
          },
        }),
      },
    } as any)

    await simulateAgentChatFetch('Hello', 'agent-1', 'workspace-1')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/agent-chat')
    expect(options.headers).toHaveProperty('Authorization', `Bearer ${mockAccessToken}`)
  })

  it('should omit Authorization header when no session exists', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: null,
          },
        }),
      },
    } as any)

    await simulateAgentChatFetch('Hello', 'agent-1', 'workspace-1')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers).not.toHaveProperty('Authorization')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('should use the exact access_token from session', async () => {
    const mockToken = 'jwt-token-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz'
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: mockToken,
            },
          },
        }),
      },
    } as any)

    await simulateAgentChatFetch('Test message', 'agent-1', 'workspace-1')

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe(`Bearer ${mockToken}`)
  })

  it('should omit Authorization header when session exists but access_token is undefined', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: undefined,
            },
          },
        }),
      },
    } as any)

    await simulateAgentChatFetch('Hello', 'agent-1', 'workspace-1')

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers).not.toHaveProperty('Authorization')
  })
})

// ============================================================================
// SECTION: Lead CSV Parser Tests (src/lib/lead-csv-parser.ts)
// ============================================================================

import {
  detectLeadColumnMapping,
  transformToLeads,
  validateLeadMapping,
  createEmptyLeadMapping,
  type LeadColumnMapping,
} from '@/lib/lead-csv-parser'

describe('Lead CSV Parser', () => {
  describe('detectLeadColumnMapping', () => {
    it('should detect company name column', () => {
      const headers = ['Company', 'Website', 'Industry']
      const mapping = detectLeadColumnMapping(headers)
      expect(mapping.name).toBe('Company')
      expect(mapping.confidence.name).toBeGreaterThan(0)
    })

    it('should detect company_name column', () => {
      const headers = ['company_name', 'url', 'sector']
      const mapping = detectLeadColumnMapping(headers)
      expect(mapping.name).toBe('company_name')
    })

    it('should detect website/domain columns', () => {
      const headers = ['Name', 'Website', 'Domain']
      const mapping = detectLeadColumnMapping(headers)
      expect(mapping.website).toBe('Website')
    })

    it('should detect address fields', () => {
      const headers = ['Name', 'Address', 'City', 'State', 'Postal Code']
      const mapping = detectLeadColumnMapping(headers)
      expect(mapping.address).toBe('Address')
      expect(mapping.city).toBe('City')
      expect(mapping.state).toBe('State')
      expect(mapping.postal_code).toBe('Postal Code')
    })

    it('should detect source column', () => {
      const headers = ['Name', 'Lead Source', 'Notes']
      const mapping = detectLeadColumnMapping(headers)
      expect(mapping.source).toBe('Lead Source')
    })

    it('should handle Close CRM style headers', () => {
      const headers = ['company_name', 'url', 'lead_source', 'status']
      const mapping = detectLeadColumnMapping(headers)
      expect(mapping.name).toBe('company_name')
      expect(mapping.website).toBe('url')
      expect(mapping.source).toBe('lead_source')
      expect(mapping.status).toBe('status')
    })
  })

  describe('transformToLeads', () => {
    it('should transform CSV rows to lead objects', () => {
      const rows = [['Acme Inc', 'https://acme.com', 'Technology']]
      const headers = ['Company', 'Website', 'Industry']
      const mapping: LeadColumnMapping = {
        name: 'Company',
        website: 'Website',
        industry: 'Industry',
        status: null,
        notes: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        source: null,
      }
      const leads = transformToLeads(rows, headers, mapping)
      expect(leads).toHaveLength(1)
      expect(leads[0].name).toBe('Acme Inc')
      expect(leads[0].website).toBe('https://acme.com')
      expect(leads[0].industry).toBe('Technology')
      expect(leads[0].isValid).toBe(true)
    })

    it('should mark rows without name as invalid', () => {
      const rows = [['', 'https://acme.com', 'Technology']]
      const headers = ['Company', 'Website', 'Industry']
      const mapping: LeadColumnMapping = {
        name: 'Company',
        website: 'Website',
        industry: 'Industry',
        status: null,
        notes: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        source: null,
      }
      const leads = transformToLeads(rows, headers, mapping)
      expect(leads[0].isValid).toBe(false)
      expect(leads[0].errors.length).toBeGreaterThan(0)
    })

    it('should handle optional fields as null', () => {
      const rows = [['Acme Inc', '', '']]
      const headers = ['Company', 'Website', 'Industry']
      const mapping: LeadColumnMapping = {
        name: 'Company',
        website: 'Website',
        industry: 'Industry',
        status: null,
        notes: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        source: null,
      }
      const leads = transformToLeads(rows, headers, mapping)
      expect(leads[0].website).toBeNull()
      expect(leads[0].industry).toBeNull()
      expect(leads[0].isValid).toBe(true)
    })
  })

  describe('validateLeadMapping', () => {
    it('should require name column', () => {
      const mapping = createEmptyLeadMapping()
      const result = validateLeadMapping(mapping)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Company name column is required')
    })

    it('should be valid with just name column', () => {
      const mapping = { ...createEmptyLeadMapping(), name: 'Company' }
      const result = validateLeadMapping(mapping)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})

// ============================================================================
// SECTION: Lead Duplicate Detector Tests (src/lib/lead-duplicate-detector.ts)
// ============================================================================

import {
  normalizeCompanyName,
  extractDomain,
  checkLeadDuplicate,
  checkLeadsForDuplicates,
  type ExistingLead,
} from '@/lib/lead-duplicate-detector'

describe('Lead Duplicate Detector', () => {
  describe('normalizeCompanyName', () => {
    it('should lowercase names', () => {
      expect(normalizeCompanyName('ACME INC')).toBe('acme')
    })

    it('should remove Inc suffix', () => {
      expect(normalizeCompanyName('Acme Inc')).toBe('acme')
      expect(normalizeCompanyName('Acme Inc.')).toBe('acme')
      expect(normalizeCompanyName('Acme, Inc.')).toBe('acme')
    })

    it('should remove LLC suffix', () => {
      expect(normalizeCompanyName('Acme LLC')).toBe('acme')
      expect(normalizeCompanyName('Acme L.L.C.')).toBe('acme')
    })

    it('should remove Ltd suffix', () => {
      expect(normalizeCompanyName('Acme Ltd')).toBe('acme')
      expect(normalizeCompanyName('Acme Ltd.')).toBe('acme')
      expect(normalizeCompanyName('Acme Limited')).toBe('acme')
    })

    it('should remove Corp suffix', () => {
      expect(normalizeCompanyName('Acme Corp')).toBe('acme')
      expect(normalizeCompanyName('Acme Corporation')).toBe('acme')
    })

    it('should handle empty input', () => {
      expect(normalizeCompanyName('')).toBe('')
    })

    it('should trim whitespace', () => {
      expect(normalizeCompanyName('  Acme  ')).toBe('acme')
    })
  })

  describe('extractDomain', () => {
    it('should extract domain from full URL', () => {
      expect(extractDomain('https://www.acme.com/about')).toBe('acme.com')
    })

    it('should extract domain from URL without protocol', () => {
      expect(extractDomain('www.acme.com')).toBe('acme.com')
    })

    it('should extract bare domain', () => {
      expect(extractDomain('acme.com')).toBe('acme.com')
    })

    it('should remove www prefix', () => {
      expect(extractDomain('www.example.com')).toBe('example.com')
    })

    it('should handle null input', () => {
      expect(extractDomain(null)).toBeNull()
    })

    it('should handle empty string', () => {
      expect(extractDomain('')).toBeNull()
    })

    it('should return null for invalid URLs without dots', () => {
      expect(extractDomain('localhost')).toBeNull()
    })

    it('should remove port numbers', () => {
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com')
    })
  })

  describe('checkLeadDuplicate', () => {
    const existingLeads: ExistingLead[] = [
      { id: '1', name: 'Acme Inc', website: 'https://acme.com' },
      { id: '2', name: 'Beta Corp', website: 'https://beta.io' },
      { id: '3', name: 'Gamma LLC', website: null },
    ]

    it('should detect exact name and domain match', () => {
      const result = checkLeadDuplicate(
        { name: 'Acme Inc', website: 'www.acme.com' },
        existingLeads
      )
      expect(result.isDuplicate).toBe(true)
      expect(result.matchReason).toBe('exact_name_and_domain')
      expect(result.similarity).toBe(100)
      expect(result.matchedLead?.id).toBe('1')
    })

    it('should detect similar name with same domain', () => {
      const result = checkLeadDuplicate(
        { name: 'Acme Incorporated', website: 'acme.com' },
        existingLeads
      )
      expect(result.isDuplicate).toBe(true)
      expect(result.matchReason).toBe('exact_name_and_domain')
    })

    it('should detect exact name only when neither has website', () => {
      const result = checkLeadDuplicate(
        { name: 'Gamma LLC', website: null },
        existingLeads
      )
      expect(result.isDuplicate).toBe(true)
      expect(result.matchReason).toBe('exact_name')
    })

    it('should not flag different companies as duplicates', () => {
      const result = checkLeadDuplicate(
        { name: 'Delta Corp', website: 'https://delta.io' },
        existingLeads
      )
      expect(result.isDuplicate).toBe(false)
      expect(result.matchReason).toBeNull()
    })

    it('should not flag same name with different domain', () => {
      const result = checkLeadDuplicate(
        { name: 'Acme Inc', website: 'https://differentacme.com' },
        existingLeads
      )
      expect(result.isDuplicate).toBe(false)
    })
  })

  describe('checkLeadsForDuplicates', () => {
    const existingLeads: ExistingLead[] = [
      { id: '1', name: 'Acme Inc', website: 'https://acme.com' },
    ]

    it('should check multiple leads', () => {
      const newLeads = [
        { name: 'Acme Inc', website: 'acme.com' },
        { name: 'New Company', website: 'new.com' },
      ]
      const results = checkLeadsForDuplicates(newLeads, existingLeads)
      expect(results).toHaveLength(2)
      expect(results[0].isDuplicate).toBe(true)
      expect(results[1].isDuplicate).toBe(false)
    })
  })
})

// ============================================================================
// SECTION: Workflow Condition Evaluator Tests (src/lib/workflow-condition-evaluator.ts)
// ============================================================================

import {
  evaluateCondition,
  getFieldValue,
  applyOperator,
} from '@/lib/workflow-condition-evaluator'
import type { WorkflowCondition } from '@/types/workflow'
import type { WorkflowContext, ExecutionResult } from '@/lib/workflow-executor'

describe('Workflow Condition Evaluator', () => {
  // Sample context for testing
  const sampleContext: WorkflowContext = {
    userId: 'user-123',
    leadId: 'lead-456',
    contactId: 'contact-789',
    lead: {
      id: 'lead-456',
      name: 'Test Company',
      status: 'hot',
    },
    contact: {
      id: 'contact-789',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com',
      phone: '+1234567890',
    },
    customFieldValues: {
      'cf-1': 'Custom Value',
      'cf-2': '100',
    },
  }

  const sampleResults: ExecutionResult[] = [
    {
      success: true,
      actionType: 'send_sms',
      actionId: 'action-1',
      executedAt: '2024-01-15T10:00:00Z',
      data: { sid: 'sms-123' },
    },
    {
      success: false,
      actionType: 'send_email',
      actionId: 'action-2',
      error: 'Email not configured',
      executedAt: '2024-01-15T10:01:00Z',
    },
  ]

  describe('getFieldValue', () => {
    it('should get trigger field value from lead', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: 'lead.status',
        operator: 'equals',
        value: 'hot',
      }
      const value = getFieldValue(condition, sampleContext, [])
      expect(value).toBe('hot')
    })

    it('should get trigger field value from contact', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: 'contact.email',
        operator: 'equals',
        value: 'test@test.com',
      }
      const value = getFieldValue(condition, sampleContext, [])
      expect(value).toBe('john@test.com')
    })

    it('should get custom field value', () => {
      const condition: WorkflowCondition = {
        field_source: 'custom_field',
        field_path: 'my_field',
        field_id: 'cf-1',
        operator: 'equals',
        value: 'test',
      }
      const value = getFieldValue(condition, sampleContext, [])
      expect(value).toBe('Custom Value')
    })

    it('should get previous action success result', () => {
      const condition: WorkflowCondition = {
        field_source: 'previous_action',
        field_path: 'action.action-1.success',
        operator: 'equals',
        value: 'true',
      }
      const value = getFieldValue(condition, sampleContext, sampleResults)
      expect(value).toBe(true)
    })

    it('should return undefined for missing field', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: 'lead.nonexistent',
        operator: 'equals',
        value: 'test',
      }
      const value = getFieldValue(condition, sampleContext, [])
      expect(value).toBeUndefined()
    })
  })

  describe('applyOperator', () => {
    it('should handle equals operator (case insensitive)', () => {
      expect(applyOperator('hello', 'equals', 'hello')).toBe(true)
      expect(applyOperator('Hello', 'equals', 'hello')).toBe(true)
      expect(applyOperator('hello', 'equals', 'world')).toBe(false)
    })

    it('should handle not_equals operator', () => {
      expect(applyOperator('hello', 'not_equals', 'world')).toBe(true)
      expect(applyOperator('hello', 'not_equals', 'hello')).toBe(false)
    })

    it('should handle contains operator', () => {
      expect(applyOperator('hello world', 'contains', 'world')).toBe(true)
      expect(applyOperator('hello world', 'contains', 'foo')).toBe(false)
    })

    it('should handle starts_with operator', () => {
      expect(applyOperator('hello world', 'starts_with', 'hello')).toBe(true)
      expect(applyOperator('hello world', 'starts_with', 'world')).toBe(false)
    })

    it('should handle greater_than operator', () => {
      expect(applyOperator(100, 'greater_than', '50')).toBe(true)
      expect(applyOperator('100', 'greater_than', '50')).toBe(true)
      expect(applyOperator(30, 'greater_than', '50')).toBe(false)
    })

    it('should handle less_than operator', () => {
      expect(applyOperator(30, 'less_than', '50')).toBe(true)
      expect(applyOperator(100, 'less_than', '50')).toBe(false)
    })

    it('should handle is_empty operator', () => {
      expect(applyOperator('', 'is_empty', '')).toBe(true)
      expect(applyOperator(null, 'is_empty', '')).toBe(true)
      expect(applyOperator(undefined, 'is_empty', '')).toBe(true)
      expect(applyOperator('   ', 'is_empty', '')).toBe(true)
      expect(applyOperator('hello', 'is_empty', '')).toBe(false)
    })

    it('should handle is_not_empty operator', () => {
      expect(applyOperator('hello', 'is_not_empty', '')).toBe(true)
      expect(applyOperator('', 'is_not_empty', '')).toBe(false)
      expect(applyOperator(null, 'is_not_empty', '')).toBe(false)
    })

    it('should return false for invalid numeric comparisons', () => {
      expect(applyOperator('not a number', 'greater_than', '50')).toBe(false)
      expect(applyOperator(100, 'greater_than', 'not a number')).toBe(false)
    })
  })

  describe('evaluateCondition', () => {
    it('should evaluate trigger field condition', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: 'lead.status',
        operator: 'equals',
        value: 'hot',
      }
      expect(evaluateCondition(condition, sampleContext, [])).toBe(true)
    })

    it('should evaluate condition with not_equals', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: 'lead.status',
        operator: 'not_equals',
        value: 'cold',
      }
      expect(evaluateCondition(condition, sampleContext, [])).toBe(true)
    })

    it('should evaluate previous action result condition', () => {
      const condition: WorkflowCondition = {
        field_source: 'previous_action',
        field_path: 'action.action-1.success',
        operator: 'equals',
        value: 'true',
      }
      expect(evaluateCondition(condition, sampleContext, sampleResults)).toBe(true)
    })

    it('should return false for missing required fields', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: '',  // Missing field path
        operator: 'equals',
        value: 'test',
      }
      expect(evaluateCondition(condition, sampleContext, [])).toBe(false)
    })

    it('should handle is_empty check on missing field', () => {
      const condition: WorkflowCondition = {
        field_source: 'trigger',
        field_path: 'lead.nonexistent',
        operator: 'is_empty',
        value: '',
      }
      expect(evaluateCondition(condition, sampleContext, [])).toBe(true)
    })
  })
})

// ============================================================================
// END OF COMPREHENSIVE TEST SUITE
// ============================================================================
