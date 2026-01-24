/**
 * Tests for knowledge/categories tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { knowledgeCategoryTools } from '../../../tools/knowledge/categories.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockKnowledgeCategory,
  mockKnowledgeCategoryList,
  mockSystemCategory,
  testWorkspaceId,
} from '../../fixtures/knowledge.js'

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

describe('knowledge/categories tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // knowledge_category_list
  // ============================================
  describe('knowledge_category_list', () => {
    it('should list categories successfully', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.success(mockKnowledgeCategoryList))

      const result = await knowledgeCategoryTools.knowledge_category_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'categories', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeCategoryTools.knowledge_category_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.error('Connection failed'))

      const result = await knowledgeCategoryTools.knowledge_category_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // knowledge_category_get
  // ============================================
  describe('knowledge_category_get', () => {
    it('should get category by ID', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.success(mockKnowledgeCategory))

      const result = await knowledgeCategoryTools.knowledge_category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.notFound())

      const result = await knowledgeCategoryTools.knowledge_category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
      })

      expectError(result, 'Category not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeCategoryTools.knowledge_category_get.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_category_create
  // ============================================
  describe('knowledge_category_create', () => {
    it('should create category successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success([{ position: 0 }]))
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success(mockKnowledgeCategory))

      const result = await knowledgeCategoryTools.knowledge_category_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Engineering',
      })

      const data = expectSuccessWithData<{ message: string; category: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeCategoryTools.knowledge_category_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Engineering',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success([]))
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.error('Insert failed'))

      const result = await knowledgeCategoryTools.knowledge_category_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Engineering',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // knowledge_category_update
  // ============================================
  describe('knowledge_category_update', () => {
    it('should update category successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success({ id: mockKnowledgeCategory.id, is_system: false }))
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success({ ...mockKnowledgeCategory, name: 'Updated' }))

      const result = await knowledgeCategoryTools.knowledge_category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
        name: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; category: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.notFound())

      const result = await knowledgeCategoryTools.knowledge_category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Category not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.success({ id: mockKnowledgeCategory.id, is_system: false }))

      const result = await knowledgeCategoryTools.knowledge_category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeCategoryTools.knowledge_category_update.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_category_delete
  // ============================================
  describe('knowledge_category_delete', () => {
    it('should delete category successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success({ id: mockKnowledgeCategory.id, is_system: false }))
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success(null))

      const result = await knowledgeCategoryTools.knowledge_category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
      })

      const data = expectSuccessWithData<{ message: string; category_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.category_id).toBe(mockKnowledgeCategory.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.notFound())

      const result = await knowledgeCategoryTools.knowledge_category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: 'non-existent',
      })

      expectError(result, 'Category not found')
    })

    it('should return error when trying to delete system category', async () => {
      supabaseMock.setQueryResult('knowledge_categories', mockResults.success({ id: mockSystemCategory.id, is_system: true }))

      const result = await knowledgeCategoryTools.knowledge_category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: mockSystemCategory.id,
      })

      expectError(result, 'Cannot delete system categories')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeCategoryTools.knowledge_category_delete.handler({
        workspace_id: testWorkspaceId,
        category_id: mockKnowledgeCategory.id,
      })

      expectAccessDenied(result)
    })
  })
})
