/**
 * Tests for finance/recurring-rules tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recurringRuleTools } from '../../../tools/finance/recurring-rules.js'
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
import { mockRecurringRule, mockRecurringRuleList, mockAccountList, testWorkspaceId } from '../../fixtures/finance.js'

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

describe('finance/recurring-rules tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // recurring_rule_list
  // ============================================
  describe('recurring_rule_list', () => {
    it('should list recurring rules successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('recurring_rules', mockResults.success(mockRecurringRuleList))

      const result = await recurringRuleTools.recurring_rule_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'recurring_rules', countKey: 'count' })
    })

    it('should return empty when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await recurringRuleTools.recurring_rule_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'recurring_rules', expectedCount: 0 })
    })

    it('should filter by active status', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      const activeRules = mockRecurringRuleList.filter(r => r.is_active)
      supabaseMock.setQueryResult('recurring_rules', mockResults.success(activeRules))

      const result = await recurringRuleTools.recurring_rule_list.handler({
        workspace_id: testWorkspaceId,
        is_active: true,
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await recurringRuleTools.recurring_rule_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection failed'))

      const result = await recurringRuleTools.recurring_rule_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // recurring_rule_get
  // ============================================
  describe('recurring_rule_get', () => {
    it('should get recurring rule by ID', async () => {
      const ruleWithAccount = { ...mockRecurringRule, account: { workspace_id: testWorkspaceId } }
      supabaseMock.setQueryResult('recurring_rules', mockResults.success(ruleWithAccount))

      const result = await recurringRuleTools.recurring_rule_get.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.notFound())

      const result = await recurringRuleTools.recurring_rule_get.handler({
        workspace_id: testWorkspaceId,
        rule_id: 'non-existent',
      })

      expectNotFound(result, 'Recurring rule')
    })

    it('should return error when wrong workspace', async () => {
      const ruleWithWrongWorkspace = { ...mockRecurringRule, account: { workspace_id: 'other-workspace' } }
      supabaseMock.setQueryResult('recurring_rules', mockResults.success(ruleWithWrongWorkspace))

      const result = await recurringRuleTools.recurring_rule_get.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectError(result, 'not found in this workspace')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await recurringRuleTools.recurring_rule_get.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // recurring_rule_create
  // ============================================
  describe('recurring_rule_create', () => {
    it('should create recurring rule successfully', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success({ id: 'acc-123' }))
      supabaseMock.setQueryResult('recurring_rules', mockResults.success(mockRecurringRule))

      const result = await recurringRuleTools.recurring_rule_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'acc-123',
        amount: -2000,
        description: 'Monthly Rent',
        frequency: 'monthly',
        next_date: '2024-02-01',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'recurring_rule' })
    })

    it('should return error when account not found', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.notFound())

      const result = await recurringRuleTools.recurring_rule_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'non-existent',
        amount: -2000,
        description: 'Monthly Rent',
        frequency: 'monthly',
        next_date: '2024-02-01',
      })

      expectError(result, 'Account not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await recurringRuleTools.recurring_rule_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'acc-123',
        amount: -2000,
        description: 'Monthly Rent',
        frequency: 'monthly',
        next_date: '2024-02-01',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success({ id: 'acc-123' }))
      supabaseMock.setQueryResult('recurring_rules', mockResults.error('Constraint violation'))

      const result = await recurringRuleTools.recurring_rule_create.handler({
        workspace_id: testWorkspaceId,
        account_id: 'acc-123',
        amount: -2000,
        description: 'Monthly Rent',
        frequency: 'monthly',
        next_date: '2024-02-01',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // recurring_rule_update
  // ============================================
  describe('recurring_rule_update', () => {
    it('should update recurring rule successfully', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.success({
        id: mockRecurringRule.id,
        account: { workspace_id: testWorkspaceId },
      }))

      const result = await recurringRuleTools.recurring_rule_update.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
        amount: -2500,
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'recurring_rule' })
    })

    it('should return error when no fields to update', async () => {
      // The handler first verifies the rule exists before checking if there are fields to update
      supabaseMock.setQueryResult('recurring_rules', mockResults.success({
        id: mockRecurringRule.id,
        account: { workspace_id: testWorkspaceId },
      }))

      const result = await recurringRuleTools.recurring_rule_update.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.notFound())

      const result = await recurringRuleTools.recurring_rule_update.handler({
        workspace_id: testWorkspaceId,
        rule_id: 'non-existent',
        amount: -2500,
      })

      expectNotFound(result, 'Recurring rule')
    })

    it('should return error when wrong workspace', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.success({
        id: mockRecurringRule.id,
        account: { workspace_id: 'other-workspace' },
      }))

      const result = await recurringRuleTools.recurring_rule_update.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
        amount: -2500,
      })

      expectError(result, 'not found in this workspace')
    })
  })

  // ============================================
  // recurring_rule_delete
  // ============================================
  describe('recurring_rule_delete', () => {
    it('should delete recurring rule successfully', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.success({
        id: mockRecurringRule.id,
        account: { workspace_id: testWorkspaceId },
      }))

      const result = await recurringRuleTools.recurring_rule_delete.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectDeleteResult(result, 'rule_id')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.notFound())

      const result = await recurringRuleTools.recurring_rule_delete.handler({
        workspace_id: testWorkspaceId,
        rule_id: 'non-existent',
      })

      expectNotFound(result, 'Recurring rule')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await recurringRuleTools.recurring_rule_delete.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // recurring_rule_skip_next
  // ============================================
  describe('recurring_rule_skip_next', () => {
    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.notFound())

      const result = await recurringRuleTools.recurring_rule_skip_next.handler({
        workspace_id: testWorkspaceId,
        rule_id: 'non-existent',
      })

      expectNotFound(result, 'Recurring rule')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('recurring_rules', mockResults.notFound())

      const result = await recurringRuleTools.recurring_rule_skip_next.handler({
        workspace_id: testWorkspaceId,
        rule_id: 'non-existent',
      })

      expectNotFound(result, 'Recurring rule')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await recurringRuleTools.recurring_rule_skip_next.handler({
        workspace_id: testWorkspaceId,
        rule_id: mockRecurringRule.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // recurring_rule_generate_transactions
  // ============================================
  describe('recurring_rule_generate_transactions', () => {
    it('should generate transactions from rules', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('recurring_rules', mockResults.success([
        { ...mockRecurringRule, next_date: '2024-01-01' },
      ]))
      supabaseMock.setQueryResult('transactions', mockResults.success({ id: 'new-tx-id' }))

      const result = await recurringRuleTools.recurring_rule_generate_transactions.handler({
        workspace_id: testWorkspaceId,
        up_to_date: '2024-01-15',
      })

      const data = expectSuccessWithData<{ generated: unknown[]; count: number }>(result)
      expect(data.generated).toBeDefined()
    })

    it('should return empty when no accounts', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await recurringRuleTools.recurring_rule_generate_transactions.handler({
        workspace_id: testWorkspaceId,
        up_to_date: '2024-01-15',
      })

      const data = expectSuccessWithData<{ generated: unknown[] }>(result)
      expect(data.generated).toHaveLength(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await recurringRuleTools.recurring_rule_generate_transactions.handler({
        workspace_id: testWorkspaceId,
        up_to_date: '2024-01-15',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('accounts', mockResults.error('Connection failed'))

      const result = await recurringRuleTools.recurring_rule_generate_transactions.handler({
        workspace_id: testWorkspaceId,
        up_to_date: '2024-01-15',
      })

      expectError(result, 'Database error')
    })
  })
})
