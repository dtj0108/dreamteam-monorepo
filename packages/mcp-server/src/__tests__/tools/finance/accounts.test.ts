/**
 * Tests for finance/accounts tools
 *
 * Tests cover:
 * - account_list: List all accounts with optional filters
 * - account_get: Get single account by ID
 * - account_create: Create new account
 * - account_update: Update existing account
 * - account_delete: Delete account
 * - account_get_balance: Get account balance
 * - account_list_by_type: List accounts filtered by type
 * - account_get_totals: Get aggregate totals
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { accountTools } from '../../../tools/finance/accounts.js'
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
import { mockAccount, mockAccountList, testWorkspaceId } from '../../fixtures/finance.js'

// Mock the auth module
vi.mock('../../../auth.js', () => ({
  getSupabase: vi.fn(),
  validateWorkspaceAccess: vi.fn(),
}))

// Mock the context module
vi.mock('../../../lib/context.js', () => ({
  resolveWorkspaceId: vi.fn((input: { workspace_id?: string }) => input.workspace_id || testWorkspaceId),
  getWorkspaceId: vi.fn(() => testWorkspaceId),
  getUserId: vi.fn(() => 'test-user-id'),
  getAuthenticatedUserId: vi.fn(() => 'test-user-id'),
}))

import { getSupabase, validateWorkspaceAccess } from '../../../auth.js'

describe('finance/accounts tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // account_list
  // ============================================
  describe('account_list', () => {
    it('should list all accounts successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList))

      const result = await accountTools.account_list.handler({
        workspace_id: testWorkspaceId,
      })

      const accounts = expectListResult(result, {
        itemsKey: 'accounts',
        countKey: 'count',
        expectedCount: 3,
      })
      expect(accounts[0].name).toBe('Checking Account')
    })

    it('should return empty list when no accounts exist', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await accountTools.account_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, {
        itemsKey: 'accounts',
        countKey: 'count',
        expectedCount: 0,
      })
    })

    it('should filter by account type', async () => {
      const checkingAccounts = mockAccountList.filter((a) => a.type === 'checking')
      supabaseMock.setQueryResult('accounts', mockResults.success(checkingAccounts))

      const result = await accountTools.account_list.handler({
        workspace_id: testWorkspaceId,
        type: 'checking',
      })

      const accounts = expectListResult(result, {
        itemsKey: 'accounts',
        expectedCount: 1,
      })
      expect(accounts[0].type).toBe('checking')
    })

    it('should filter by active status', async () => {
      const activeAccounts = mockAccountList.filter((a) => a.is_active)
      supabaseMock.setQueryResult('accounts', mockResults.success(activeAccounts))

      const result = await accountTools.account_list.handler({
        workspace_id: testWorkspaceId,
        is_active: true,
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection failed'))

      const result = await accountTools.account_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // account_get
  // ============================================
  describe('account_get', () => {
    it('should get account by ID successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccount))

      const result = await accountTools.account_get.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      const data = expectSuccessWithData<typeof mockAccount>(result)
      expect(data.id).toBe(mockAccount.id)
      expect(data.name).toBe(mockAccount.name)
    })

    it('should return error when account not found', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.notFound())

      const result = await accountTools.account_get.handler({
        workspace_id: testWorkspaceId,
        account_id: 'non-existent-id',
      })

      expectNotFound(result, 'Account')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_get.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Query timeout'))

      const result = await accountTools.account_get.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // account_create
  // ============================================
  describe('account_create', () => {
    it('should create account successfully', async () => {
      const newAccount = { ...mockAccount, id: 'new-acc-id' }
      supabaseMock.setQueryResult('accounts', mockResults.success(newAccount))

      const result = await accountTools.account_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Checking',
        type: 'checking',
        balance: 1000,
        institution: 'Bank of America',
        currency: 'USD',
      })

      const account = expectMutationResult(result, {
        messageContains: 'created',
        entityKey: 'account',
      })
      expect(account).toBeDefined()
    })

    it('should create account with default values', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccount))

      const result = await accountTools.account_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Basic Account',
        type: 'checking',
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Test Account',
        type: 'checking',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Duplicate key'))

      const result = await accountTools.account_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Test Account',
        type: 'checking',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // account_update
  // ============================================
  describe('account_update', () => {
    it('should update account successfully', async () => {
      const updatedAccount = { ...mockAccount, name: 'Updated Name' }
      supabaseMock.setQueryResult('accounts', mockResults.success(updatedAccount))

      const result = await accountTools.account_update.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
        name: 'Updated Name',
      })

      const account = expectMutationResult(result, {
        messageContains: 'updated',
        entityKey: 'account',
      })
      expect(account).toBeDefined()
    })

    it('should return error when no fields to update', async () => {
      const result = await accountTools.account_update.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when account not found', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.notFound())

      const result = await accountTools.account_update.handler({
        workspace_id: testWorkspaceId,
        account_id: 'non-existent-id',
        name: 'Updated Name',
      })

      expectNotFound(result, 'Account')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_update.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
        name: 'Updated Name',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // account_delete
  // ============================================
  describe('account_delete', () => {
    it('should delete account successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(null))

      const result = await accountTools.account_delete.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectDeleteResult(result, 'account_id')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_delete.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Foreign key constraint'))

      const result = await accountTools.account_delete.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectError(result, 'Failed to delete')
    })
  })

  // ============================================
  // account_get_balance
  // ============================================
  describe('account_get_balance', () => {
    it('should get account balance successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success({
        id: mockAccount.id,
        name: mockAccount.name,
        balance: mockAccount.balance,
        currency: mockAccount.currency,
      }))

      const result = await accountTools.account_get_balance.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      const data = expectSuccessWithData<{ balance: number; currency: string }>(result)
      expect(data.balance).toBe(1500.00)
      expect(data.currency).toBe('USD')
    })

    it('should return error when account not found', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.notFound())

      const result = await accountTools.account_get_balance.handler({
        workspace_id: testWorkspaceId,
        account_id: 'non-existent-id',
      })

      expectNotFound(result, 'Account')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_get_balance.handler({
        workspace_id: testWorkspaceId,
        account_id: mockAccount.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // account_list_by_type
  // ============================================
  describe('account_list_by_type', () => {
    it('should list accounts by type successfully', async () => {
      const checkingAccounts = mockAccountList.filter((a) => a.type === 'checking')
      supabaseMock.setQueryResult('accounts', mockResults.success(checkingAccounts))

      const result = await accountTools.account_list_by_type.handler({
        workspace_id: testWorkspaceId,
        type: 'checking',
      })

      const accounts = expectListResult(result, {
        itemsKey: 'accounts',
      })
      expect(accounts.every((a: { type: string }) => a.type === 'checking')).toBe(true)
    })

    it('should return empty list when no accounts of type exist', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await accountTools.account_list_by_type.handler({
        workspace_id: testWorkspaceId,
        type: 'investment',
      })

      expectListResult(result, {
        itemsKey: 'accounts',
        expectedCount: 0,
      })
    })
  })

  // ============================================
  // account_get_totals
  // ============================================
  describe('account_get_totals', () => {
    it('should get total balance successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList))

      const result = await accountTools.account_get_totals.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ total_balance: number; account_count: number }>(result)
      expect(data.total_balance).toBe(6000.00) // 1500 + 5000 + (-500)
      expect(data.account_count).toBe(3)
    })

    it('should group totals by type', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList))

      const result = await accountTools.account_get_totals.handler({
        workspace_id: testWorkspaceId,
        group_by: 'type',
      })

      const data = expectSuccessWithData<{
        total_balance: number
        grouped_by: string
        groups: Record<string, { total: number; count: number }>
      }>(result)
      expect(data.grouped_by).toBe('type')
      expect(data.groups.checking).toBeDefined()
      expect(data.groups.savings).toBeDefined()
      expect(data.groups.credit).toBeDefined()
    })

    it('should group totals by institution', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList))

      const result = await accountTools.account_get_totals.handler({
        workspace_id: testWorkspaceId,
        group_by: 'institution',
      })

      const data = expectSuccessWithData<{
        grouped_by: string
        groups: Record<string, { total: number; count: number }>
      }>(result)
      expect(data.grouped_by).toBe('institution')
      expect(data.groups['Chase Bank']).toBeDefined()
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await accountTools.account_get_totals.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection reset'))

      const result = await accountTools.account_get_totals.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })
})
