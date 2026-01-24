/**
 * Tests for agents/memories tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { agentMemoryTools } from '../../../tools/agents/memories.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockAgent,
  mockMemory,
  mockMemorySecond,
  mockMemoryList,
  testWorkspaceId,
} from '../../fixtures/agents.js'

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

describe('agents/memories tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess), 'admin')
  })

  // ============================================
  // agent_memory_list
  // ============================================
  describe('agent_memory_list', () => {
    it('should list memories successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success(mockMemoryList))

      const result = await agentMemoryTools.agent_memory_list.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectListResult(result, { itemsKey: 'memories', countKey: 'count' })
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_list.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentMemoryTools.agent_memory_list.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.error('Connection failed'))

      const result = await agentMemoryTools.agent_memory_list.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // agent_memory_create
  // ============================================
  describe('agent_memory_create', () => {
    it('should create memory successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.notFound()) // Check for duplicate
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success(mockMemory))

      const result = await agentMemoryTools.agent_memory_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        path: 'user_preferences',
        content: '# User Preferences\n\n- Prefers formal communication',
      })

      const data = expectSuccessWithData<{ message: string; memory: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        path: 'test_path',
        content: 'Test content',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when path already exists', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success({ id: mockMemory.id }))

      const result = await agentMemoryTools.agent_memory_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        path: 'user_preferences',
        content: 'Duplicate content',
      })

      expectError(result, 'already exists')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentMemoryTools.agent_memory_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        path: 'test_path',
        content: 'Test content',
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.notFound())
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.error('Insert failed'))

      const result = await agentMemoryTools.agent_memory_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        path: 'test_path',
        content: 'Test content',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // agent_memory_update
  // ============================================
  describe('agent_memory_update', () => {
    it('should update memory successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success({ id: mockMemory.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success({ ...mockMemory, content: 'Updated content' }))

      const result = await agentMemoryTools.agent_memory_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        memory_id: mockMemory.id,
        content: 'Updated content',
      })

      const data = expectSuccessWithData<{ message: string; memory: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        memory_id: mockMemory.id,
        content: 'Updated',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when memory not found', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        memory_id: 'non-existent',
        content: 'Updated',
      })

      expectError(result, 'Memory not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentMemoryTools.agent_memory_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        memory_id: mockMemory.id,
        content: 'Updated',
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_memory_delete
  // ============================================
  describe('agent_memory_delete', () => {
    it('should delete memory successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success({ id: mockMemory.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success(null))

      const result = await agentMemoryTools.agent_memory_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        memory_id: mockMemory.id,
      })

      const data = expectSuccessWithData<{ message: string; memory_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.memory_id).toBe(mockMemory.id)
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        memory_id: mockMemory.id,
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when memory not found', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        memory_id: 'non-existent',
      })

      expectError(result, 'Memory not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentMemoryTools.agent_memory_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        memory_id: mockMemory.id,
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_memory_search
  // ============================================
  describe('agent_memory_search', () => {
    it('should search memories successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success([mockMemory]))

      const result = await agentMemoryTools.agent_memory_search.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        query: 'preferences',
      })

      const data = expectSuccessWithData<{ memories: unknown[]; count: number; query: string }>(result)
      expect(data.memories).toHaveLength(1)
      expect(data.query).toBe('preferences')
    })

    it('should return empty results when no matches', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.success([]))

      const result = await agentMemoryTools.agent_memory_search.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        query: 'nonexistent',
      })

      const data = expectSuccessWithData<{ memories: unknown[]; count: number }>(result)
      expect(data.memories).toHaveLength(0)
      expect(data.count).toBe(0)
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentMemoryTools.agent_memory_search.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        query: 'test',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentMemoryTools.agent_memory_search.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        query: 'test',
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_memories', mockResults.error('Search failed'))

      const result = await agentMemoryTools.agent_memory_search.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        query: 'test',
      })

      expectError(result, 'Database error')
    })
  })
})
