/**
 * Tests for finance/budgets tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { budgetTools } from '../../../tools/finance/budgets.js'
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
import { mockBudget, mockBudgetList, mockAccountList, testWorkspaceId } from '../../fixtures/finance.js'

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

describe('finance/budgets tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // budget_list
  // ============================================
  describe('budget_list', () => {
    it('should list budgets successfully', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success(mockBudgetList))

      const result = await budgetTools.budget_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'budgets', countKey: 'count' })
    })

    it('should filter by active status', async () => {
      const activeBudgets = mockBudgetList.filter(b => b.is_active)
      supabaseMock.setQueryResult('budgets', mockResults.success(activeBudgets))

      const result = await budgetTools.budget_list.handler({
        workspace_id: testWorkspaceId,
        is_active: true,
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await budgetTools.budget_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.error('Connection failed'))

      const result = await budgetTools.budget_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // budget_get
  // ============================================
  describe('budget_get', () => {
    it('should get budget by ID with spending', async () => {
      const budgetWithAlerts = { ...mockBudget, alerts: [], category: { name: 'Groceries' } }
      supabaseMock.setQueryResult('budgets', mockResults.success(budgetWithAlerts))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([{ amount: -100 }]))

      const result = await budgetTools.budget_get.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.notFound())

      const result = await budgetTools.budget_get.handler({
        workspace_id: testWorkspaceId,
        budget_id: 'non-existent',
      })

      expectNotFound(result, 'Budget')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await budgetTools.budget_get.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // budget_create
  // ============================================
  describe('budget_create', () => {
    it('should create budget successfully', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success(mockBudget))

      const result = await budgetTools.budget_create.handler({
        workspace_id: testWorkspaceId,
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'budget' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await budgetTools.budget_create.handler({
        workspace_id: testWorkspaceId,
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.error('Constraint violation'))

      const result = await budgetTools.budget_create.handler({
        workspace_id: testWorkspaceId,
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // budget_update
  // ============================================
  describe('budget_update', () => {
    it('should update budget successfully', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success(mockBudget))

      const result = await budgetTools.budget_update.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
        amount: 600,
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'budget' })
    })

    it('should return error when no fields to update', async () => {
      const result = await budgetTools.budget_update.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.notFound())

      const result = await budgetTools.budget_update.handler({
        workspace_id: testWorkspaceId,
        budget_id: 'non-existent',
        amount: 600,
      })

      expectNotFound(result, 'Budget')
    })
  })

  // ============================================
  // budget_delete
  // ============================================
  describe('budget_delete', () => {
    it('should delete budget successfully', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success(null))

      const result = await budgetTools.budget_delete.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      expectDeleteResult(result, 'budget_id')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await budgetTools.budget_delete.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.error('Foreign key constraint'))

      const result = await budgetTools.budget_delete.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      expectError(result, 'Failed to delete')
    })
  })

  // ============================================
  // budget_get_status
  // ============================================
  describe('budget_get_status', () => {
    it('should get budget status', async () => {
      const budgetWithAlerts = { ...mockBudget, alerts: [], category: { name: 'Groceries' } }
      supabaseMock.setQueryResult('budgets', mockResults.success(budgetWithAlerts))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([{ amount: -100 }]))

      const result = await budgetTools.budget_get_status.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
      })

      const data = expectSuccessWithData<{ status: string }>(result)
      expect(['on_track', 'warning', 'critical', 'over_budget']).toContain(data.status)
    })
  })

  // ============================================
  // budget_list_over_limit
  // ============================================
  describe('budget_list_over_limit', () => {
    it('should list over-limit budgets', async () => {
      const budgetsWithSpending = mockBudgetList.map(b => ({ ...b, alerts: [], category: { name: 'Test' } }))
      supabaseMock.setQueryResult('budgets', mockResults.success(budgetsWithSpending))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([]))

      const result = await budgetTools.budget_list_over_limit.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'budgets' })
    })
  })

  // ============================================
  // budget_list_with_spending
  // ============================================
  describe('budget_list_with_spending', () => {
    it('should list budgets with spending', async () => {
      const budgetsWithAlerts = mockBudgetList.map(b => ({ ...b, alerts: [], category: { name: 'Test' } }))
      supabaseMock.setQueryResult('budgets', mockResults.success(budgetsWithAlerts))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([{ amount: -100 }]))

      const result = await budgetTools.budget_list_with_spending.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'budgets', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await budgetTools.budget_list_with_spending.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // budget_add_alert
  // ============================================
  describe('budget_add_alert', () => {
    it('should add alert successfully', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success({ id: mockBudget.id }))
      supabaseMock.setQueryResult('budget_alerts', mockResults.success({ id: 'alert-1', threshold_percent: 80 }))

      const result = await budgetTools.budget_add_alert.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
        threshold_percent: 80,
      })

      const data = expectSuccessWithData<{ message: string; alert: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when budget not found', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.notFound())

      const result = await budgetTools.budget_add_alert.handler({
        workspace_id: testWorkspaceId,
        budget_id: 'non-existent',
        threshold_percent: 80,
      })

      expectError(result, 'Budget not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await budgetTools.budget_add_alert.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
        threshold_percent: 80,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // budget_remove_alert
  // ============================================
  describe('budget_remove_alert', () => {
    it('should remove alert successfully', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success({ id: mockBudget.id }))
      supabaseMock.setQueryResult('budget_alerts', mockResults.success(null))

      const result = await budgetTools.budget_remove_alert.handler({
        workspace_id: testWorkspaceId,
        budget_id: mockBudget.id,
        threshold_percent: 80,
      })

      const data = expectSuccessWithData<{ message: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when budget not found', async () => {
      supabaseMock.setQueryResult('budgets', mockResults.success(null))

      const result = await budgetTools.budget_remove_alert.handler({
        workspace_id: testWorkspaceId,
        budget_id: 'non-existent',
        threshold_percent: 80,
      })

      expectError(result, 'Budget not found')
    })
  })

  // ============================================
  // budget_get_alerts_triggered
  // ============================================
  describe('budget_get_alerts_triggered', () => {
    it('should get triggered alerts', async () => {
      const budgetsWithAlerts = mockBudgetList.map(b => ({
        ...b,
        alerts: [{ threshold_percent: 50 }],
        category: { name: 'Test' },
      }))
      supabaseMock.setQueryResult('budgets', mockResults.success(budgetsWithAlerts))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([{ amount: -400 }])) // 80% of 500

      const result = await budgetTools.budget_get_alerts_triggered.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ triggered_alerts: unknown[]; count: number }>(result)
      expect(data.triggered_alerts).toBeDefined()
    })
  })
})
