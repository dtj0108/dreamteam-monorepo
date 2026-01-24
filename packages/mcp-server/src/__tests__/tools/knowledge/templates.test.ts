/**
 * Tests for knowledge/templates tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { knowledgeTemplateTools } from '../../../tools/knowledge/templates.js'
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
  mockKnowledgeTemplate,
  mockKnowledgeTemplateList,
  mockSystemTemplate,
  mockKnowledgePage,
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

describe('knowledge/templates tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // knowledge_template_list
  // ============================================
  describe('knowledge_template_list', () => {
    it('should list templates successfully', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.success(mockKnowledgeTemplateList))

      const result = await knowledgeTemplateTools.knowledge_template_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'templates', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeTemplateTools.knowledge_template_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.error('Connection failed'))

      const result = await knowledgeTemplateTools.knowledge_template_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // knowledge_template_get
  // ============================================
  describe('knowledge_template_get', () => {
    it('should get template by ID', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.success(mockKnowledgeTemplate))

      const result = await knowledgeTemplateTools.knowledge_template_get.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.notFound())

      const result = await knowledgeTemplateTools.knowledge_template_get.handler({
        workspace_id: testWorkspaceId,
        template_id: 'non-existent',
      })

      expectError(result, 'Template not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeTemplateTools.knowledge_template_get.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_template_create
  // ============================================
  describe('knowledge_template_create', () => {
    it('should create template successfully', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.success(mockKnowledgeTemplate))

      const result = await knowledgeTemplateTools.knowledge_template_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Meeting Notes',
        content: [{ type: 'heading', content: [] }],
      })

      const data = expectSuccessWithData<{ message: string; template: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeTemplateTools.knowledge_template_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Meeting Notes',
        content: [],
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.error('Insert failed'))

      const result = await knowledgeTemplateTools.knowledge_template_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Meeting Notes',
        content: [],
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // knowledge_template_update
  // ============================================
  describe('knowledge_template_update', () => {
    it('should update template successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success({ id: mockKnowledgeTemplate.id, is_system: false }))
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success({ ...mockKnowledgeTemplate, name: 'Updated' }))

      const result = await knowledgeTemplateTools.knowledge_template_update.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
        name: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; template: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.notFound())

      const result = await knowledgeTemplateTools.knowledge_template_update.handler({
        workspace_id: testWorkspaceId,
        template_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Template not found')
    })

    it('should return error when trying to update system template', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.success({ id: mockSystemTemplate.id, is_system: true }))

      const result = await knowledgeTemplateTools.knowledge_template_update.handler({
        workspace_id: testWorkspaceId,
        template_id: mockSystemTemplate.id,
        name: 'Updated',
      })

      expectError(result, 'Cannot modify system templates')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.success({ id: mockKnowledgeTemplate.id, is_system: false }))

      const result = await knowledgeTemplateTools.knowledge_template_update.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeTemplateTools.knowledge_template_update.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_template_delete
  // ============================================
  describe('knowledge_template_delete', () => {
    it('should delete template successfully', async () => {
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success({ id: mockKnowledgeTemplate.id, is_system: false }))
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success(null))

      const result = await knowledgeTemplateTools.knowledge_template_delete.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
      })

      const data = expectSuccessWithData<{ message: string; template_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.template_id).toBe(mockKnowledgeTemplate.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.notFound())

      const result = await knowledgeTemplateTools.knowledge_template_delete.handler({
        workspace_id: testWorkspaceId,
        template_id: 'non-existent',
      })

      expectError(result, 'Template not found')
    })

    it('should return error when trying to delete system template', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.success({ id: mockSystemTemplate.id, is_system: true }))

      const result = await knowledgeTemplateTools.knowledge_template_delete.handler({
        workspace_id: testWorkspaceId,
        template_id: mockSystemTemplate.id,
      })

      expectError(result, 'Cannot delete system templates')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeTemplateTools.knowledge_template_delete.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // knowledge_template_use
  // ============================================
  describe('knowledge_template_use', () => {
    it('should create page from template', async () => {
      // Get template
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success(mockKnowledgeTemplate))
      // Get sibling pages for position
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success([{ position: 0 }]))
      // Create page
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.success(mockKnowledgePage))
      // Update usage count
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success(null))

      const result = await knowledgeTemplateTools.knowledge_template_use.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
        title: 'My New Page',
      })

      const data = expectSuccessWithData<{ message: string; page: unknown }>(result)
      expect(data.message).toContain('created from template')
    })

    it('should return error when template not found', async () => {
      supabaseMock.setQueryResult('knowledge_templates', mockResults.notFound())

      const result = await knowledgeTemplateTools.knowledge_template_use.handler({
        workspace_id: testWorkspaceId,
        template_id: 'non-existent',
        title: 'My New Page',
      })

      expectError(result, 'Template not found')
    })

    it('should return error when parent page not found', async () => {
      // Get template
      supabaseMock.setQueryResultOnce('knowledge_templates', mockResults.success(mockKnowledgeTemplate))
      // Parent page check
      supabaseMock.setQueryResultOnce('knowledge_pages', mockResults.notFound())

      const result = await knowledgeTemplateTools.knowledge_template_use.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
        title: 'My New Page',
        parent_id: 'non-existent-parent',
      })

      expectError(result, 'Parent page not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await knowledgeTemplateTools.knowledge_template_use.handler({
        workspace_id: testWorkspaceId,
        template_id: mockKnowledgeTemplate.id,
        title: 'My New Page',
      })

      expectAccessDenied(result)
    })
  })
})
