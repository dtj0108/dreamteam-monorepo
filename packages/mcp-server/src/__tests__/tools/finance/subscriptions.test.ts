/**
 * Tests for finance/subscriptions tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscriptionTools } from '../../../tools/finance/subscriptions.js'
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
import { mockSubscription, mockSubscriptionList, mockAccountList, testWorkspaceId } from '../../fixtures/finance.js'

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

describe('finance/subscriptions tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // subscription_list
  // ============================================
  describe('subscription_list', () => {
    it('should list subscriptions successfully', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success(mockSubscriptionList))

      const result = await subscriptionTools.subscription_list.handler({
        workspace_id: testWorkspaceId,
      })

      const subs = expectListResult(result, { itemsKey: 'subscriptions', countKey: 'count' })
      expect(subs[0]).toHaveProperty('monthly_equivalent')
    })

    it('should filter by active status', async () => {
      const activeSubs = mockSubscriptionList.filter(s => s.is_active)
      supabaseMock.setQueryResult('subscriptions', mockResults.success(activeSubs))

      const result = await subscriptionTools.subscription_list.handler({
        workspace_id: testWorkspaceId,
        is_active: true,
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.error('Connection failed'))

      const result = await subscriptionTools.subscription_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // subscription_get
  // ============================================
  describe('subscription_get', () => {
    it('should get subscription by ID', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success(mockSubscription))

      const result = await subscriptionTools.subscription_get.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
      })

      const data = expectSuccessWithData<{ monthly_equivalent: number }>(result)
      expect(data.monthly_equivalent).toBeDefined()
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.notFound())

      const result = await subscriptionTools.subscription_get.handler({
        workspace_id: testWorkspaceId,
        subscription_id: 'non-existent',
      })

      expectNotFound(result, 'Subscription')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_get.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // subscription_create
  // ============================================
  describe('subscription_create', () => {
    it('should create subscription successfully', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success(mockSubscription))

      const result = await subscriptionTools.subscription_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-01',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'subscription' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-01',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.error('Constraint violation'))

      const result = await subscriptionTools.subscription_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-01',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // subscription_update
  // ============================================
  describe('subscription_update', () => {
    it('should update subscription successfully', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success(mockSubscription))

      const result = await subscriptionTools.subscription_update.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
        amount: 19.99,
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'subscription' })
    })

    it('should return error when no fields to update', async () => {
      const result = await subscriptionTools.subscription_update.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.notFound())

      const result = await subscriptionTools.subscription_update.handler({
        workspace_id: testWorkspaceId,
        subscription_id: 'non-existent',
        amount: 19.99,
      })

      expectNotFound(result, 'Subscription')
    })
  })

  // ============================================
  // subscription_delete
  // ============================================
  describe('subscription_delete', () => {
    it('should delete subscription successfully', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success(null))

      const result = await subscriptionTools.subscription_delete.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
      })

      expectDeleteResult(result, 'subscription_id')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_delete.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // subscription_get_upcoming
  // ============================================
  describe('subscription_get_upcoming', () => {
    it('should get upcoming subscriptions', async () => {
      const upcomingSubs = mockSubscriptionList.map(s => ({
        ...s,
        next_renewal_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }))
      supabaseMock.setQueryResult('subscriptions', mockResults.success(upcomingSubs))

      const result = await subscriptionTools.subscription_get_upcoming.handler({
        workspace_id: testWorkspaceId,
        days_ahead: 7,
      })

      const data = expectSuccessWithData<{ subscriptions: unknown[]; days_ahead: number }>(result)
      expect(data.days_ahead).toBe(7)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_get_upcoming.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.error('Query timeout'))

      const result = await subscriptionTools.subscription_get_upcoming.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // subscription_get_summary
  // ============================================
  describe('subscription_get_summary', () => {
    it('should get subscription summary', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success(mockSubscriptionList))

      const result = await subscriptionTools.subscription_get_summary.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{
        total_monthly: number
        total_yearly: number
        active_count: number
      }>(result)
      expect(data.total_monthly).toBeGreaterThan(0)
      expect(data.total_yearly).toBeGreaterThan(0)
      expect(data.active_count).toBe(2)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_get_summary.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.error('Connection reset'))

      const result = await subscriptionTools.subscription_get_summary.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // subscription_detect_from_transactions
  // ============================================
  describe('subscription_detect_from_transactions', () => {
    it('should detect potential subscriptions', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([
        { description: 'Netflix', amount: -15.99, date: '2024-01-01' },
        { description: 'Netflix', amount: -15.99, date: '2024-02-01' },
        { description: 'Netflix', amount: -15.99, date: '2024-03-01' },
      ]))

      const result = await subscriptionTools.subscription_detect_from_transactions.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ potential_subscriptions: unknown[]; count: number }>(result)
      expect(data.potential_subscriptions.length).toBeGreaterThan(0)
    })

    it('should return empty when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await subscriptionTools.subscription_detect_from_transactions.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ potential_subscriptions: unknown[] }>(result)
      expect(data.potential_subscriptions).toHaveLength(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await subscriptionTools.subscription_detect_from_transactions.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // subscription_mark_canceled
  // ============================================
  describe('subscription_mark_canceled', () => {
    it('should mark subscription as canceled', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success({ ...mockSubscription, is_active: false }))

      const result = await subscriptionTools.subscription_mark_canceled.handler({
        workspace_id: testWorkspaceId,
        subscription_id: mockSubscription.id,
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'subscription' })
    })
  })
})
