/**
 * Tests for knowledge/whiteboards tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { knowledgeWhiteboardTools } from '../../../tools/knowledge/whiteboards.js'
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
  mockKnowledgeWhiteboard,
  mockKnowledgeWhiteboardList,
  mockArchivedWhiteboard,
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

describe('knowledge/whiteboards tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // knowledge_whiteboard_list
  // ============================================
  describe('knowledge_whiteboard_list', () => {
    it('should list whiteboards successfully', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.success(mockKnowledgeWhiteboardList))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'whiteboards', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.error('Connection failed'))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // knowledge_whiteboard_get
  // ============================================
  describe('knowledge_whiteboard_get', () => {
    it('should get whiteboard by ID', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.success(mockKnowledgeWhiteboard))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_get.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_get.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_get.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_whiteboard_create
  // ============================================
  describe('knowledge_whiteboard_create', () => {
    it('should create whiteboard successfully', async () => {
      // Get position
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success([{ position: 0 }]))
      // Insert
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success(mockKnowledgeWhiteboard))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Architecture Diagram',
      })

      const data = expectSuccessWithData<{ message: string; whiteboard: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Architecture Diagram',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success([]))
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.error('Insert failed'))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_create.handler({
        workspace_id: testWorkspaceId,
        title: 'Architecture Diagram',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // knowledge_whiteboard_update
  // ============================================
  describe('knowledge_whiteboard_update', () => {
    it('should update whiteboard successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ id: mockKnowledgeWhiteboard.id }))
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ ...mockKnowledgeWhiteboard, title: 'Updated' }))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_update.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
        title: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; whiteboard: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_update.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
        title: 'Updated',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_update.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
        title: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_whiteboard_delete
  // ============================================
  describe('knowledge_whiteboard_delete', () => {
    it('should delete whiteboard successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ id: mockKnowledgeWhiteboard.id }))
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success(null))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_delete.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      const data = expectSuccessWithData<{ message: string; whiteboard_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.whiteboard_id).toBe(mockKnowledgeWhiteboard.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_delete.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_delete.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_whiteboard_archive
  // ============================================
  describe('knowledge_whiteboard_archive', () => {
    it('should archive whiteboard successfully', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.success({ ...mockKnowledgeWhiteboard, is_archived: true }))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_archive.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      const data = expectSuccessWithData<{ message: string; whiteboard: unknown }>(result)
      expect(data.message).toContain('archived')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_archive.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_archive.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_whiteboard_restore
  // ============================================
  describe('knowledge_whiteboard_restore', () => {
    it('should restore whiteboard successfully', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.success({ ...mockArchivedWhiteboard, is_archived: false }))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_restore.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockArchivedWhiteboard.id,
      })

      const data = expectSuccessWithData<{ message: string; whiteboard: unknown }>(result)
      expect(data.message).toContain('restored')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_restore.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_restore.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockArchivedWhiteboard.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_whiteboard_favorite
  // ============================================
  describe('knowledge_whiteboard_favorite', () => {
    it('should favorite whiteboard successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ id: mockKnowledgeWhiteboard.id, is_favorited_by: [] }))
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ ...mockKnowledgeWhiteboard, is_favorited_by: [testUserId] }))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_favorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      const data = expectSuccessWithData<{ message: string; whiteboard: unknown }>(result)
      expect(data.message).toContain('favorites')
    })

    it('should return error when already favorited', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.success({ id: mockKnowledgeWhiteboard.id, is_favorited_by: [testUserId] }))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_favorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectError(result, 'already in favorites')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_favorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_favorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_whiteboard_unfavorite
  // ============================================
  describe('knowledge_whiteboard_unfavorite', () => {
    it('should unfavorite whiteboard successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ id: mockKnowledgeWhiteboard.id, is_favorited_by: [testUserId] }))
      supabaseMock.setQueryResultOnce('knowledge_whiteboards', mockResults.success({ ...mockKnowledgeWhiteboard, is_favorited_by: [] }))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_unfavorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      const data = expectSuccessWithData<{ message: string; whiteboard: unknown }>(result)
      expect(data.message).toContain('removed from favorites')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_whiteboards', mockResults.notFound())

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_unfavorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: 'non-existent',
      })

      expectError(result, 'Whiteboard not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeWhiteboardTools.knowledge_whiteboard_unfavorite.handler({
        workspace_id: testWorkspaceId,
        whiteboard_id: mockKnowledgeWhiteboard.id,
      })

      expectAccessDenied(result)
    })
  })
})
