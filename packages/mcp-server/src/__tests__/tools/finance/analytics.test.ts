/**
 * Tests for finance/analytics tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyticsTools } from '../../../tools/finance/analytics.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
} from '../../helpers/response-validators.js'
import { mockAccountList, mockTransactionList, testWorkspaceId } from '../../fixtures/finance.js'

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

describe('finance/analytics tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // analytics_get_income_vs_expense
  // ============================================
  describe('analytics_get_income_vs_expense', () => {
    it('should get income vs expense summary', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([
        { amount: 3000, date: '2024-01-15' },
        { amount: -500, date: '2024-01-16' },
        { amount: -200, date: '2024-01-17' },
      ]))

      const result = await analyticsTools.analytics_get_income_vs_expense.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      const data = expectSuccessWithData<{ income: number; expenses: number; net: number }>(result)
      expect(data.income).toBe(3000)
      expect(data.expenses).toBe(700)
      expect(data.net).toBe(2300)
    })

    it('should group by day/week/month', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([
        { amount: 3000, date: '2024-01-15' },
        { amount: -500, date: '2024-01-16' },
      ]))

      const result = await analyticsTools.analytics_get_income_vs_expense.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        group_by: 'month',
      })

      const data = expectSuccessWithData<{ grouped: unknown[] }>(result)
      expect(data.grouped).toBeDefined()
    })

    it('should return zero when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await analyticsTools.analytics_get_income_vs_expense.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      const data = expectSuccessWithData<{ income: number; expenses: number; net: number }>(result)
      expect(data.income).toBe(0)
      expect(data.expenses).toBe(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await analyticsTools.analytics_get_income_vs_expense.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection failed'))

      const result = await analyticsTools.analytics_get_income_vs_expense.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // analytics_get_spending_by_category
  // ============================================
  describe('analytics_get_spending_by_category', () => {
    it('should return empty when no accounts exist', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await analyticsTools.analytics_get_spending_by_category.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ categories: unknown[] }>(result)
      expect(data.categories).toHaveLength(0)
    })

    it('should return empty when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await analyticsTools.analytics_get_spending_by_category.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ categories: unknown[] }>(result)
      expect(data.categories).toHaveLength(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await analyticsTools.analytics_get_spending_by_category.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // analytics_get_net_worth
  // ============================================
  describe('analytics_get_net_worth', () => {
    it('should calculate net worth', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success([
        { id: 'a1', name: 'Checking', type: 'checking', balance: 5000, currency: 'USD', is_active: true },
        { id: 'a2', name: 'Savings', type: 'savings', balance: 10000, currency: 'USD', is_active: true },
        { id: 'a3', name: 'Credit Card', type: 'credit', balance: -2000, currency: 'USD', is_active: true },
      ]))

      const result = await analyticsTools.analytics_get_net_worth.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{
        net_worth: number
        total_assets: number
        total_liabilities: number
      }>(result)
      expect(data.total_assets).toBe(15000)
      expect(data.total_liabilities).toBe(2000)
      expect(data.net_worth).toBe(13000)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await analyticsTools.analytics_get_net_worth.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection reset'))

      const result = await analyticsTools.analytics_get_net_worth.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // analytics_get_cash_flow
  // ============================================
  describe('analytics_get_cash_flow', () => {
    it('should get cash flow analysis', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([
        { amount: 3000, date: '2024-01-01' },
        { amount: -500, date: '2024-01-02' },
      ]))

      const result = await analyticsTools.analytics_get_cash_flow.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      const data = expectSuccessWithData<{
        summary: { income: number; expenses: number; net: number }
        metrics: { positive_flow_days: number }
      }>(result)
      expect(data.summary).toBeDefined()
      expect(data.metrics).toBeDefined()
    })
  })

  // ============================================
  // analytics_get_trends
  // ============================================
  describe('analytics_get_trends', () => {
    it('should get spending trends', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([
        { amount: 3000, date: '2024-01-15' },
        { amount: -500, date: '2024-01-16' },
        { amount: 3000, date: '2024-02-15' },
        { amount: -600, date: '2024-02-16' },
      ]))

      const result = await analyticsTools.analytics_get_trends.handler({
        workspace_id: testWorkspaceId,
        months: 6,
      })

      const data = expectSuccessWithData<{
        monthly_data: unknown[]
        trends: { income: string; expenses: string }
      }>(result)
      expect(data.trends).toBeDefined()
    })
  })

  // ============================================
  // analytics_get_profit_loss
  // ============================================
  describe('analytics_get_profit_loss', () => {
    it('should return zero profit when no accounts exist', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await analyticsTools.analytics_get_profit_loss.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      const data = expectSuccessWithData<{ net_profit: number }>(result)
      expect(data.net_profit).toBe(0)
    })

    it('should return zero when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await analyticsTools.analytics_get_profit_loss.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      const data = expectSuccessWithData<{ net_profit: number }>(result)
      expect(data.net_profit).toBe(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await analyticsTools.analytics_get_profit_loss.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // analytics_project_cash_flow
  // ============================================
  describe('analytics_project_cash_flow', () => {
    it('should project future cash flow', async () => {
      // Mock net worth calculation
      supabaseMock.setQueryResult('accounts', mockResults.success([
        { id: 'a1', name: 'Checking', type: 'checking', balance: 10000, currency: 'USD', is_active: true },
      ]))
      supabaseMock.setQueryResult('subscriptions', mockResults.success([
        { name: 'Netflix', amount: -15, frequency: 'monthly', next_renewal_date: '2024-02-01' },
      ]))
      supabaseMock.setQueryResult('recurring_rules', mockResults.success([
        { description: 'Salary', amount: 5000, frequency: 'monthly', next_date: '2024-02-01' },
      ]))

      const result = await analyticsTools.analytics_project_cash_flow.handler({
        workspace_id: testWorkspaceId,
        months_ahead: 3,
      })

      const data = expectSuccessWithData<{
        current_net_worth: number
        projections: unknown[]
        months_projected: number
      }>(result)
      expect(data.projections.length).toBe(3)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await analyticsTools.analytics_project_cash_flow.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // analytics_get_calendar_events
  // ============================================
  describe('analytics_get_calendar_events', () => {
    it('should get calendar events', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.success([
        { id: 's1', name: 'Netflix', amount: -15, next_renewal_date: '2024-01-15', category: null },
      ]))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('recurring_rules', mockResults.success([]))
      supabaseMock.setQueryResult('budgets', mockResults.success([]))

      const result = await analyticsTools.analytics_get_calendar_events.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      const data = expectSuccessWithData<{ events: unknown[]; count: number }>(result)
      expect(data.events).toBeDefined()
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await analyticsTools.analytics_get_calendar_events.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('subscriptions', mockResults.error('Query timeout'))

      const result = await analyticsTools.analytics_get_calendar_events.handler({
        workspace_id: testWorkspaceId,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expectError(result, 'Database error')
    })
  })
})
