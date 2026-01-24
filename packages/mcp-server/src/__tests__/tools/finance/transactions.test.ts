/**
 * Tests for finance/transactions tools
 *
 * Tests cover:
 * - transaction_list: List transactions with filters
 * - transaction_get: Get single transaction
 * - transaction_create: Create new transaction
 * - transaction_update: Update transaction
 * - transaction_delete: Delete transaction
 * - transaction_create_transfer: Create transfer between accounts
 * - transaction_bulk_categorize: Bulk categorize transactions
 * - transaction_search: Search by description
 * - transaction_get_by_date_range: Get by date range
 * - transaction_get_uncategorized: Get uncategorized
 * - transaction_get_recent: Get recent
 * - transaction_get_duplicates: Find duplicates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionTools } from '../../../tools/finance/transactions.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectNotFound,
  expectListResult,
  expectMutationResult,
  expectDeleteResult,
} from '../../helpers/response-validators.js'
import {
  mockTransaction,
  mockTransactionList,
  mockAccountList,
  testWorkspaceId,
} from '../../fixtures/finance.js'

vi.mock('../../../auth.js', () => ({
  getSupabase: vi.fn(),
  validateWorkspaceAccess: vi.fn(),
}))

vi.mock('../../../lib/context.js', () => ({
  resolveWorkspaceId: vi.fn((input: { workspace_id?: string }) => input.workspace_id || testWorkspaceId),
  getWorkspaceId: vi.fn(() => testWorkspaceId),
  getUserId: vi.fn(() => 'test-user-id'),
  getAuthenticatedUserId: vi.fn(() => 'test-user-id'),
}))

import { getSupabase, validateWorkspaceAccess } from '../../../auth.js'

describe('finance/transactions tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // transaction_list
  // ============================================
  describe('transaction_list', () => {
    it('should list transactions successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success(mockTransactionList))

      const result = await transactionTools.transaction_list.handler({
        workspace_id: testWorkspaceId,
      })

      const txs = expectListResult(result, { itemsKey: 'transactions', countKey: 'count' })
      expect(txs.length).toBeGreaterThan(0)
    })

    it('should return empty when no accounts exist', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await transactionTools.transaction_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'transactions', expectedCount: 0 })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection failed'))

      const result = await transactionTools.transaction_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // transaction_get
  // ============================================
  describe('transaction_get', () => {
    it('should get transaction by ID', async () => {
      const txWithAccount = { ...mockTransaction, account: { workspace_id: testWorkspaceId } }
      supabaseMock.setQueryResult('transactions', mockResults.success(txWithAccount))

      const result = await transactionTools.transaction_get.handler({
        workspace_id: testWorkspaceId,
        transaction_id: mockTransaction.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('transactions', mockResults.notFound())

      const result = await transactionTools.transaction_get.handler({
        workspace_id: testWorkspaceId,
        transaction_id: 'non-existent',
      })

      expectNotFound(result, 'Transaction')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_get.handler({
        workspace_id: testWorkspaceId,
        transaction_id: mockTransaction.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // transaction_create
  // ============================================
  describe('transaction_create', () => {
    it('should create transaction successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success({ id: 'acc-123' }))
      supabaseMock.setQueryResult('transactions', mockResults.success(mockTransaction))

      const result = await transactionTools.transaction_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'acc-123',
        amount: -50,
        date: '2024-01-15',
        description: 'Grocery shopping',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'transaction' })
    })

    it('should return error when account not found', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.notFound())

      const result = await transactionTools.transaction_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'non-existent',
        amount: -50,
        date: '2024-01-15',
      })

      expectError(result, 'Account not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'acc-123',
        amount: -50,
        date: '2024-01-15',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // transaction_update
  // ============================================
  describe('transaction_update', () => {
    it('should update transaction successfully', async () => {
      supabaseMock.setQueryResult('transactions', mockResults.success({
        id: mockTransaction.id,
        account: { workspace_id: testWorkspaceId }
      }))

      const result = await transactionTools.transaction_update.handler({
        workspace_id: testWorkspaceId,
        transaction_id: mockTransaction.id,
        amount: -75,
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'transaction' })
    })

    it('should return error when no fields to update', async () => {
      const result = await transactionTools.transaction_update.handler({
        workspace_id: testWorkspaceId,
        transaction_id: mockTransaction.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when transaction not found', async () => {
      supabaseMock.setQueryResult('transactions', mockResults.notFound())

      const result = await transactionTools.transaction_update.handler({
        workspace_id: testWorkspaceId,
        transaction_id: 'non-existent',
        amount: -75,
      })

      expectNotFound(result, 'Transaction')
    })
  })

  // ============================================
  // transaction_delete
  // ============================================
  describe('transaction_delete', () => {
    it('should delete transaction successfully', async () => {
      supabaseMock.setQueryResult('transactions', mockResults.success({
        id: mockTransaction.id,
        is_transfer: false,
        transfer_pair_id: null,
        account: { workspace_id: testWorkspaceId },
      }))

      const result = await transactionTools.transaction_delete.handler({
        workspace_id: testWorkspaceId,
        transaction_id: mockTransaction.id,
      })

      expectDeleteResult(result, 'transaction_id')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_delete.handler({
        workspace_id: testWorkspaceId,
        transaction_id: mockTransaction.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // transaction_create_transfer
  // ============================================
  describe('transaction_create_transfer', () => {
    it('should create transfer successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success([
        { id: 'acc-from', name: 'Checking' },
        { id: 'acc-to', name: 'Savings' },
      ]))
      supabaseMock.setQueryResult('transactions', mockResults.success({ id: 'tx-new' }))

      const result = await transactionTools.transaction_create_transfer.handler({
        workspace_id: testWorkspaceId,
        from_account_id: 'acc-from',
        to_account_id: 'acc-to',
        amount: 500,
        date: '2024-01-15',
      })

      expectSuccess(result)
    })

    it('should return error when accounts not found', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success([{ id: 'acc-from' }]))

      const result = await transactionTools.transaction_create_transfer.handler({
        workspace_id: testWorkspaceId,
        from_account_id: 'acc-from',
        to_account_id: 'acc-missing',
        amount: 500,
        date: '2024-01-15',
      })

      expectError(result, 'One or both accounts not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_create_transfer.handler({
        workspace_id: testWorkspaceId,
        from_account_id: 'acc-from',
        to_account_id: 'acc-to',
        amount: 500,
        date: '2024-01-15',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // transaction_bulk_categorize
  // ============================================
  describe('transaction_bulk_categorize', () => {
    it('should bulk categorize transactions', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([{ id: 'tx-1' }, { id: 'tx-2' }]))

      const result = await transactionTools.transaction_bulk_categorize.handler({
        workspace_id: testWorkspaceId,
        transaction_ids: ['tx-1', 'tx-2'],
        category_id: 'cat-123',
      })

      const data = expectSuccessWithData<{ updated_count: number }>(result)
      expect(data.updated_count).toBe(2)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_bulk_categorize.handler({
        workspace_id: testWorkspaceId,
        transaction_ids: ['tx-1'],
        category_id: 'cat-123',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // transaction_search
  // ============================================
  describe('transaction_search', () => {
    it('should search transactions successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success(mockTransactionList))

      const result = await transactionTools.transaction_search.handler({
        workspace_id: testWorkspaceId,
        query: 'Grocery',
      })

      const data = expectSuccessWithData<{ query: string; transactions: unknown[] }>(result)
      expect(data.query).toBe('Grocery')
    })

    it('should return empty when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await transactionTools.transaction_search.handler({
        workspace_id: testWorkspaceId,
        query: 'test',
      })

      expectListResult(result, { itemsKey: 'transactions', expectedCount: 0 })
    })
  })

  // ============================================
  // transaction_get_by_date_range
  // ============================================
  describe('transaction_get_by_date_range', () => {
    it('should get transactions by date range', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success(mockTransactionList))

      const result = await transactionTools.transaction_get_by_date_range.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expectListResult(result, { itemsKey: 'transactions' })
    })
  })

  // ============================================
  // transaction_get_uncategorized
  // ============================================
  describe('transaction_get_uncategorized', () => {
    it('should get uncategorized transactions', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([]))

      const result = await transactionTools.transaction_get_uncategorized.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'transactions' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_get_uncategorized.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // transaction_get_recent
  // ============================================
  describe('transaction_get_recent', () => {
    it('should get recent transactions', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success(mockTransactionList))

      const result = await transactionTools.transaction_get_recent.handler({
        workspace_id: testWorkspaceId,
        limit: 5,
      })

      expectListResult(result, { itemsKey: 'transactions' })
    })
  })

  // ============================================
  // transaction_get_duplicates
  // ============================================
  describe('transaction_get_duplicates', () => {
    it('should find potential duplicates', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([
        { id: 'tx-1', amount: -50, date: '2024-01-15', account_id: 'acc-123' },
        { id: 'tx-2', amount: -50, date: '2024-01-15', account_id: 'acc-123' },
      ]))

      const result = await transactionTools.transaction_get_duplicates.handler({
        workspace_id: testWorkspaceId,
        days_window: 7,
      })

      const data = expectSuccessWithData<{ potential_duplicates: unknown[] }>(result)
      expect(data.potential_duplicates).toBeDefined()
    })

    it('should return empty when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await transactionTools.transaction_get_duplicates.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ potential_duplicates: unknown[] }>(result)
      expect(data.potential_duplicates).toHaveLength(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await transactionTools.transaction_get_duplicates.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })
})
