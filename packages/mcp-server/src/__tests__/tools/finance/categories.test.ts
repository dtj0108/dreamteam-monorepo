/**
 * Tests for finance/categories tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoryTools } from '../../../tools/finance/categories.js'
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
  mockCategory,
  mockCategoryList,
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

describe('finance/categories tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // category_list
  // ============================================
  describe('category_list', () => {
    it('should list categories successfully', async () => {
      supabaseMock.setQueryResult('categories', mockResults.success(mockCategoryList))

      const result = await categoryTools.category_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'categories', countKey: 'count' })
    })

    it('should filter by type', async () => {
      const expenseCategories = mockCategoryList.filter(c => c.type === 'expense')
      supabaseMock.setQueryResult('categories', mockResults.success(expenseCategories))

      const result = await categoryTools.category_list.handler({
        workspace_id: testWorkspaceId,
        type: 'expense',
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await categoryTools.category_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('categories', mockResults.error('Connection failed'))

      const result = await categoryTools.category_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // category_get
  // ============================================
  describe('category_get', () => {
    it('should get category by ID', async () => {
      const cat = { ...mockCategory, workspace_id: testWorkspaceId, is_system: false }
      supabaseMock.setQueryResult('categories', mockResults.success(cat))

      const result = await categoryTools.category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      expectSuccess(result)
    })

    it('should allow access to system categories', async () => {
      const systemCat = { ...mockCategory, is_system: true, workspace_id: null }
      supabaseMock.setQueryResult('categories', mockResults.success(systemCat))

      const result = await categoryTools.category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: 'system-cat-id',
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('categories', mockResults.notFound())

      const result = await categoryTools.category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
      })

      expectNotFound(result, 'Category')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await categoryTools.category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // category_create
  // ============================================
  describe('category_create', () => {
    it('should create category successfully', async () => {
      supabaseMock.setQueryResult('categories', mockResults.success(mockCategory))

      const result = await categoryTools.category_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Category',
        type: 'expense',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'category' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await categoryTools.category_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Category',
        type: 'expense',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('categories', mockResults.error('Duplicate name'))

      const result = await categoryTools.category_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Duplicate',
        type: 'expense',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // category_update
  // ============================================
  describe('category_update', () => {
    it('should update category successfully', async () => {
      const existingCat = { id: mockCategory.id, is_system: false, workspace_id: testWorkspaceId }
      supabaseMock.setQueryResult('categories', mockResults.success(existingCat))

      const result = await categoryTools.category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
        name: 'Updated Name',
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'category' })
    })

    it('should return error when modifying system category', async () => {
      const systemCat = { id: 'sys-cat', is_system: true, workspace_id: null }
      supabaseMock.setQueryResult('categories', mockResults.success(systemCat))

      const result = await categoryTools.category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: 'sys-cat',
        name: 'Updated',
      })

      expectError(result, 'Cannot modify system categories')
    })

    it('should return error when no fields to update', async () => {
      // The handler first verifies the category exists before checking if there are fields to update
      const existingCat = { id: mockCategory.id, is_system: false, workspace_id: testWorkspaceId }
      supabaseMock.setQueryResult('categories', mockResults.success(existingCat))

      const result = await categoryTools.category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('categories', mockResults.notFound())

      const result = await categoryTools.category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
        name: 'Updated',
      })

      expectNotFound(result, 'Category')
    })
  })

  // ============================================
  // category_delete
  // ============================================
  describe('category_delete', () => {
    it('should delete category successfully', async () => {
      const existingCat = { id: mockCategory.id, is_system: false, workspace_id: testWorkspaceId }
      supabaseMock.setQueryResult('categories', mockResults.success(existingCat))

      const result = await categoryTools.category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      expectDeleteResult(result, 'category_id')
    })

    it('should return error when deleting system category', async () => {
      const systemCat = { id: 'sys-cat', is_system: true, workspace_id: null }
      supabaseMock.setQueryResult('categories', mockResults.success(systemCat))

      const result = await categoryTools.category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: 'sys-cat',
      })

      expectError(result, 'Cannot delete system categories')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('categories', mockResults.notFound())

      const result = await categoryTools.category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
      })

      expectNotFound(result, 'Category')
    })
  })

  // ============================================
  // category_get_spending
  // ============================================
  describe('category_get_spending', () => {
    it('should get category spending successfully', async () => {
      supabaseMock.setQueryResult('categories', mockResults.success({ id: mockCategory.id, name: 'Groceries', type: 'expense' }))
      supabaseMock.setQueryResult('accounts', mockResults.success(mockAccountList.map(a => ({ id: a.id }))))
      supabaseMock.setQueryResult('transactions', mockResults.success([{ amount: -50 }, { amount: -30 }]))

      const result = await categoryTools.category_get_spending.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      const data = expectSuccessWithData<{ total: number; transaction_count: number }>(result)
      expect(data.total).toBe(80)
      expect(data.transaction_count).toBe(2)
    })

    it('should return zero when no accounts', async () => {
      supabaseMock.setQueryResult('categories', mockResults.success({ id: mockCategory.id, name: 'Groceries', type: 'expense' }))
      supabaseMock.setQueryResult('accounts', mockResults.empty())

      const result = await categoryTools.category_get_spending.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      const data = expectSuccessWithData<{ total: number }>(result)
      expect(data.total).toBe(0)
    })

    it('should return error when category not found', async () => {
      supabaseMock.setQueryResult('categories', mockResults.notFound())

      const result = await categoryTools.category_get_spending.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
      })

      expectNotFound(result, 'Category')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await categoryTools.category_get_spending.handler({
        workspace_id: testWorkspaceId,
        category_id: mockCategory.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // category_list_with_totals
  // ============================================
  describe('category_list_with_totals', () => {
    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await categoryTools.category_list_with_totals.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await categoryTools.category_list_with_totals.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('categories', mockResults.error('Query timeout'))

      const result = await categoryTools.category_list_with_totals.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })
})
