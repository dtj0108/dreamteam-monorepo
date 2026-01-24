/**
 * Tests for knowledge/pages tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { knowledgePageTools } from '../../../tools/knowledge/pages.js'
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
  mockKnowledgePage,
  mockKnowledgePageList,
  mockChildPage,
  mockKnowledgeCategory,
  mockPageCategory,
  testWorkspaceId,
  testUserId,
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

describe('knowledge/pages tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // knowledge_page_list
  // ============================================
  describe('knowledge_page_list', () => {
    it('should list pages successfully', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success(mockKnowledgePageList))

      const result = await knowledgePageTools.knowledge_page_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'pages', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.error('Connection failed'))

      const result = await knowledgePageTools.knowledge_page_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // knowledge_page_get
  // ============================================
  describe('knowledge_page_get', () => {
    it('should get page by ID', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success(mockKnowledgePage))

      const result = await knowledgePageTools.knowledge_page_get.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_get.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_get.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_create
  // ============================================
  describe('knowledge_page_create', () => {
    it('should create page successfully', async () => {
      // Get siblings for position
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success([{ position: 0 }]))
      // Insert page
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success(mockKnowledgePage))

      const result = await knowledgePageTools.knowledge_page_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Getting Started Guide',
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should create page with parent', async () => {
      // Get parent
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: 'parent-123' }))
      // Get siblings for position
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success([]))
      // Insert page
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success(mockChildPage))

      const result = await knowledgePageTools.knowledge_page_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Sub-page',
        parent_id: 'parent-123',
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when parent not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Sub-page',
        parent_id: 'non-existent',
      })

      expectError(result, 'Parent page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Getting Started Guide',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_update
  // ============================================
  describe('knowledge_page_update', () => {
    it('should update page successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ ...mockKnowledgePage, title: 'Updated' }))

      const result = await knowledgePageTools.knowledge_page_update.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        title: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_update.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
        title: 'Updated',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_update.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        title: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_delete
  // ============================================
  describe('knowledge_page_delete', () => {
    it('should delete page successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success(null))

      const result = await knowledgePageTools.knowledge_page_delete.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ message: string; page_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.page_id).toBe(mockKnowledgePage.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_delete.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_delete.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_archive
  // ============================================
  describe('knowledge_page_archive', () => {
    it('should archive page successfully', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success({ ...mockKnowledgePage, is_archived: true }))

      const result = await knowledgePageTools.knowledge_page_archive.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('archived')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_archive.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_archive.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_restore
  // ============================================
  describe('knowledge_page_restore', () => {
    it('should restore page successfully', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success({ ...mockKnowledgePage, is_archived: false }))

      const result = await knowledgePageTools.knowledge_page_restore.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('restored')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_restore.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_restore.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_move
  // ============================================
  describe('knowledge_page_move', () => {
    it('should move page successfully', async () => {
      // Verify page exists
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      // Verify parent exists
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: 'new-parent' }))
      // Get siblings for position
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success([{ position: 0 }]))
      // Update page
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ ...mockKnowledgePage, parent_id: 'new-parent' }))

      const result = await knowledgePageTools.knowledge_page_move.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        parent_id: 'new-parent',
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('moved')
    })

    it('should return error when page not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_move.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
        parent_id: 'new-parent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when moving to itself', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))

      const result = await knowledgePageTools.knowledge_page_move.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        parent_id: mockKnowledgePage.id,
      })

      expectError(result, 'Cannot move a page into itself')
    })

    it('should return error when parent not found', async () => {
      // Page exists
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      // Parent not found
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_move.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        parent_id: 'non-existent-parent',
      })

      expectError(result, 'Parent page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_move.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        parent_id: 'new-parent',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_duplicate
  // ============================================
  describe('knowledge_page_duplicate', () => {
    it('should duplicate page successfully', async () => {
      // Get original
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success(mockKnowledgePage))
      // Get siblings for position
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success([{ position: 1 }]))
      // Insert duplicate
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ ...mockKnowledgePage, id: 'page-copy', title: 'Getting Started Guide (Copy)' }))

      const result = await knowledgePageTools.knowledge_page_duplicate.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('duplicated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_duplicate.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_duplicate.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_favorite
  // ============================================
  describe('knowledge_page_favorite', () => {
    it('should favorite page successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id, is_favorited_by: [] }))
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ ...mockKnowledgePage, is_favorited_by: [testUserId] }))

      const result = await knowledgePageTools.knowledge_page_favorite.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('favorites')
    })

    it('should return error when already favorited', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id, is_favorited_by: [testUserId] }))

      const result = await knowledgePageTools.knowledge_page_favorite.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectError(result, 'already in favorites')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_favorite.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_favorite.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_unfavorite
  // ============================================
  describe('knowledge_page_unfavorite', () => {
    it('should unfavorite page successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id, is_favorited_by: [testUserId] }))
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ ...mockKnowledgePage, is_favorited_by: [] }))

      const result = await knowledgePageTools.knowledge_page_unfavorite.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('removed from favorites')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_unfavorite.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_unfavorite.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_search
  // ============================================
  describe('knowledge_page_search', () => {
    it('should search pages successfully', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success(mockKnowledgePageList))

      const result = await knowledgePageTools.knowledge_page_search.handler({
        workspace_id: testWorkspaceId,
        query: 'getting',
      })

      const data = expectSuccessWithData<{ pages: unknown[]; count: number; query: string }>(result)
      expect(data.query).toBe('getting')
      expect(data.count).toBeGreaterThanOrEqual(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_search.handler({
        workspace_id: testWorkspaceId,
        query: 'getting',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.error('Search failed'))

      const result = await knowledgePageTools.knowledge_page_search.handler({
        workspace_id: testWorkspaceId,
        query: 'getting',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // knowledge_page_get_children
  // ============================================
  describe('knowledge_page_get_children', () => {
    it('should get children successfully', async () => {
      // Verify parent exists
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      // Get children
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success([mockChildPage]))

      const result = await knowledgePageTools.knowledge_page_get_children.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      const data = expectSuccessWithData<{ children: unknown[]; count: number; parent_id: string }>(result)
      expect(data.parent_id).toBe(mockKnowledgePage.id)
      expect(data.count).toBeGreaterThanOrEqual(0)
    })

    it('should return error when page not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_get_children.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
      })

      expectError(result, 'Page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_get_children.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_reorder
  // ============================================
  describe('knowledge_page_reorder', () => {
    it('should reorder pages successfully', async () => {
      // Updates are all parallel
      supabaseMock.setQueryResult('knowledge_pages', mockResults.success(null))

      const result = await knowledgePageTools.knowledge_page_reorder.handler({
        workspace_id: testWorkspaceId,
        page_ids: ['page-2', 'page-1', 'page-3'],
      })

      const data = expectSuccessWithData<{ message: string; page_ids: string[] }>(result)
      expect(data.message).toContain('reordered')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_reorder.handler({
        workspace_id: testWorkspaceId,
        page_ids: ['page-1', 'page-2'],
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_add_category
  // ============================================
  describe('knowledge_page_add_category', () => {
    it('should add category to page', async () => {
      // Verify page exists
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      // Verify category exists
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.success({ id: mockKnowledgeCategory.id }))
      // Insert page-category relation
      supabaseMock.setQueryResultOnce('knowledge_page_categories', mockResults.success(mockPageCategory))

      const result = await knowledgePageTools.knowledge_page_add_category.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        category_id: mockKnowledgeCategory.id,
      })

      const data = expectSuccessWithData<{ message: string; page_category: unknown }>(result)
      expect(data.message).toContain('Category added')
    })

    it('should return error when page not found', async () => {
      supabaseMock.setQueryResult('knowledge_pages', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_add_category.handler({
        workspace_id: testWorkspaceId,
        page_id: 'non-existent',
        category_id: mockKnowledgeCategory.id,
      })

      expectError(result, 'Page not found')
    })

    it('should return error when category not found', async () => {
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success({ id: mockKnowledgePage.id }))
      supabaseMock.setQueryResultOnce('knowledge_categories', mockResults.notFound())

      const result = await knowledgePageTools.knowledge_page_add_category.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        category_id: 'non-existent',
      })

      expectError(result, 'Category not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_add_category.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        category_id: mockKnowledgeCategory.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_page_remove_category
  // ============================================
  describe('knowledge_page_remove_category', () => {
    it('should remove category from page', async () => {
      supabaseMock.setQueryResult('knowledge_page_categories', mockResults.success(null))

      const result = await knowledgePageTools.knowledge_page_remove_category.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        category_id: mockKnowledgeCategory.id,
      })

      const data = expectSuccessWithData<{ message: string; page_id: string; category_id: string }>(result)
      expect(data.message).toContain('Category removed')
      expect(data.page_id).toBe(mockKnowledgePage.id)
      expect(data.category_id).toBe(mockKnowledgeCategory.id)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgePageTools.knowledge_page_remove_category.handler({
        workspace_id: testWorkspaceId,
        page_id: mockKnowledgePage.id,
        category_id: mockKnowledgeCategory.id,
      })

      expectAccessDenied(result)
    })
  })
})
