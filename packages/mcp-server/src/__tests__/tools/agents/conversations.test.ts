/**
 * Tests for agents/conversations tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { agentConversationTools } from '../../../tools/agents/conversations.js'
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
  mockConversation,
  mockConversationList,
  mockMessage,
  mockMessageList,
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

describe('agents/conversations tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess), 'admin')
  })

  // ============================================
  // agent_conversation_list
  // ============================================
  describe('agent_conversation_list', () => {
    it('should list conversations successfully', async () => {
      supabaseMock.setQueryResult('agent_conversations', mockResults.success(mockConversationList))

      const result = await agentConversationTools.agent_conversation_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'conversations', countKey: 'count' })
    })

    it('should filter by agent_id', async () => {
      supabaseMock.setQueryResult('agent_conversations', mockResults.success([mockConversation]))

      const result = await agentConversationTools.agent_conversation_list.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      const data = expectSuccessWithData<{ conversations: unknown[]; count: number }>(result)
      expect(data.conversations).toHaveLength(1)
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentConversationTools.agent_conversation_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('agent_conversations', mockResults.error('Connection failed'))

      const result = await agentConversationTools.agent_conversation_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // agent_conversation_get
  // ============================================
  describe('agent_conversation_get', () => {
    it('should get conversation with messages', async () => {
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success({
        ...mockConversation,
        agent: { id: mockAgent.id, name: mockAgent.name },
      }))
      supabaseMock.setQueryResultOnce('agent_messages', mockResults.success(mockMessageList))

      const result = await agentConversationTools.agent_conversation_get.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      const data = expectSuccessWithData<{ messages: unknown[]; message_count: number }>(result)
      expect(data.messages).toHaveLength(2)
      expect(data.message_count).toBe(2)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('agent_conversations', mockResults.notFound())

      const result = await agentConversationTools.agent_conversation_get.handler({
        workspace_id: testWorkspaceId,
        conversation_id: 'non-existent',
      })

      expectError(result, 'Conversation not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentConversationTools.agent_conversation_get.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_conversation_create
  // ============================================
  describe('agent_conversation_create', () => {
    it('should create conversation successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id, name: mockAgent.name }))
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success(mockConversation))

      const result = await agentConversationTools.agent_conversation_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        title: 'New Conversation',
      })

      const data = expectSuccessWithData<{ message: string; conversation: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should create conversation with default title', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id, name: mockAgent.name }))
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success(mockConversation))

      const result = await agentConversationTools.agent_conversation_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      const data = expectSuccessWithData<{ message: string; conversation: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentConversationTools.agent_conversation_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentConversationTools.agent_conversation_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id, name: mockAgent.name }))
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.error('Insert failed'))

      const result = await agentConversationTools.agent_conversation_create.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // agent_conversation_send_message
  // ============================================
  describe('agent_conversation_send_message', () => {
    it('should send message successfully', async () => {
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success({ id: mockConversation.id, agent_id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_messages', mockResults.success(mockMessage))
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success(null)) // Update timestamp

      const result = await agentConversationTools.agent_conversation_send_message.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
        content: 'Hello, I need help!',
      })

      const data = expectSuccessWithData<{ message: string; user_message: unknown; note: string }>(result)
      expect(data.message).toContain('sent')
      expect(data.note).toContain('asynchronously')
    })

    it('should return error when conversation not found', async () => {
      supabaseMock.setQueryResult('agent_conversations', mockResults.notFound())

      const result = await agentConversationTools.agent_conversation_send_message.handler({
        workspace_id: testWorkspaceId,
        conversation_id: 'non-existent',
        content: 'Hello!',
      })

      expectError(result, 'Conversation not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentConversationTools.agent_conversation_send_message.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
        content: 'Hello!',
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors on message insert', async () => {
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success({ id: mockConversation.id, agent_id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_messages', mockResults.error('Insert failed'))

      const result = await agentConversationTools.agent_conversation_send_message.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
        content: 'Hello!',
      })

      expectError(result, 'Failed to send')
    })
  })

  // ============================================
  // agent_conversation_delete
  // ============================================
  describe('agent_conversation_delete', () => {
    it('should delete conversation successfully', async () => {
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success({ id: mockConversation.id }))
      supabaseMock.setQueryResultOnce('agent_messages', mockResults.success(null)) // Delete messages
      supabaseMock.setQueryResultOnce('agent_conversations', mockResults.success(null)) // Delete conversation

      const result = await agentConversationTools.agent_conversation_delete.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      const data = expectSuccessWithData<{ message: string; conversation_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.conversation_id).toBe(mockConversation.id)
    })

    it('should return error when conversation not found', async () => {
      supabaseMock.setQueryResult('agent_conversations', mockResults.notFound())

      const result = await agentConversationTools.agent_conversation_delete.handler({
        workspace_id: testWorkspaceId,
        conversation_id: 'non-existent',
      })

      expectError(result, 'Conversation not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentConversationTools.agent_conversation_delete.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      expectError(result, 'Access denied')
    })
  })
})
