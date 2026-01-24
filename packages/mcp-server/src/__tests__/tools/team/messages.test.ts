/**
 * Tests for team/messages tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { messageTools } from '../../../tools/team/messages.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockMessage, mockMessageList, mockReaction, mockChannel, testWorkspaceId } from '../../fixtures/team.js'

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

describe('team/messages tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // message_list
  // ============================================
  describe('message_list', () => {
    it('should list messages in channel', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success(mockChannel))
      supabaseMock.setQueryResultOnce('messages', mockResults.success(mockMessageList))
      supabaseMock.setQueryResultOnce('messages', mockResults.success([]))

      const result = await messageTools.message_list.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectListResult(result, { itemsKey: 'messages', countKey: 'count' })
    })

    it('should return error when channel not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await messageTools.message_list.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_list.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectAccessDenied(result)
    })

    it('should return error when no target specified', async () => {
      const result = await messageTools.message_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Either channel_id or dm_conversation_id is required')
    })
  })

  // ============================================
  // message_get
  // ============================================
  describe('message_get', () => {
    it('should get message by ID', async () => {
      supabaseMock.setQueryResult('messages', mockResults.success(mockMessage))

      const result = await messageTools.message_get.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_get.handler({
        workspace_id: testWorkspaceId,
        message_id: 'non-existent',
      })

      expectError(result, 'Message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_get.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_send
  // ============================================
  describe('message_send', () => {
    it('should send message to channel', async () => {
      supabaseMock.setQueryResult('channel_members', mockResults.success({ id: 'membership-123' }))
      supabaseMock.setQueryResult('messages', mockResults.success(mockMessage))

      const result = await messageTools.message_send.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        content: 'Hello, world!',
      })

      const data = expectSuccessWithData<{ message: string; data: unknown }>(result)
      expect(data.message).toBe('Message sent')
    })

    it('should return error when no target specified', async () => {
      const result = await messageTools.message_send.handler({
        workspace_id: testWorkspaceId,
        content: 'Hello',
      })

      expectError(result, 'Either channel_id or dm_conversation_id is required')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_send.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        content: 'Hello',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('channel_members', mockResults.success({ id: 'membership-123' }))
      supabaseMock.setQueryResult('messages', mockResults.error('Insert failed'))

      const result = await messageTools.message_send.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        content: 'Hello',
      })

      expectError(result, 'Failed to send')
    })
  })

  // ============================================
  // message_update
  // ============================================
  describe('message_update', () => {
    it('should update message successfully', async () => {
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ id: mockMessage.id, sender_id: 'test-user-id', content: 'old' }))
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ ...mockMessage, content: 'Updated content' }))

      const result = await messageTools.message_update.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
        content: 'Updated content',
      })

      const data = expectSuccessWithData<{ message: string; data: unknown }>(result)
      expect(data.message).toBe('Message updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_update.handler({
        workspace_id: testWorkspaceId,
        message_id: 'non-existent',
        content: 'Updated',
      })

      expectError(result, 'Message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_update.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
        content: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_delete
  // ============================================
  describe('message_delete', () => {
    it('should delete message successfully', async () => {
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ id: mockMessage.id, sender_id: 'test-user-id' }))
      supabaseMock.setQueryResultOnce('messages', mockResults.success(null))

      const result = await messageTools.message_delete.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      const data = expectSuccessWithData<{ message: string; message_id: string }>(result)
      expect(data.message).toBe('Message deleted')
      expect(data.message_id).toBe(mockMessage.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_delete.handler({
        workspace_id: testWorkspaceId,
        message_id: 'non-existent',
      })

      expectError(result, 'Message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_delete.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_reply
  // ============================================
  describe('message_reply', () => {
    it('should reply to message', async () => {
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ id: mockMessage.id, channel_id: mockChannel.id, dm_conversation_id: null }))
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ ...mockMessage, parent_id: mockMessage.id }))

      const result = await messageTools.message_reply.handler({
        workspace_id: testWorkspaceId,
        parent_message_id: mockMessage.id,
        content: 'Reply content',
      })

      const data = expectSuccessWithData<{ message: string; data: unknown }>(result)
      expect(data.message).toBe('Reply sent')
    })

    it('should return error when parent not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_reply.handler({
        workspace_id: testWorkspaceId,
        parent_message_id: 'non-existent',
        content: 'Reply',
      })

      expectError(result, 'Parent message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_reply.handler({
        workspace_id: testWorkspaceId,
        parent_message_id: mockMessage.id,
        content: 'Reply',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_add_reaction
  // ============================================
  describe('message_add_reaction', () => {
    it('should add reaction to message', async () => {
      supabaseMock.setQueryResult('messages', mockResults.success(mockMessage))
      supabaseMock.setQueryResultOnce('message_reactions', mockResults.notFound()) // No existing reaction
      supabaseMock.setQueryResultOnce('message_reactions', mockResults.success(mockReaction))

      const result = await messageTools.message_add_reaction.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
        emoji: '👍',
      })

      const data = expectSuccessWithData<{ message: string; reaction: unknown }>(result)
      expect(data.message).toBe('Reaction added')
    })

    it('should return error when message not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_add_reaction.handler({
        workspace_id: testWorkspaceId,
        message_id: 'non-existent',
        emoji: '👍',
      })

      expectError(result, 'Message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_add_reaction.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
        emoji: '👍',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_remove_reaction
  // ============================================
  describe('message_remove_reaction', () => {
    it('should remove reaction from message', async () => {
      supabaseMock.setQueryResult('message_reactions', mockResults.success(null))

      const result = await messageTools.message_remove_reaction.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
        emoji: '👍',
      })

      const data = expectSuccessWithData<{ message: string; message_id: string; emoji: string }>(result)
      expect(data.message).toBe('Reaction removed')
      expect(data.emoji).toBe('👍')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_remove_reaction.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
        emoji: '👍',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_search
  // ============================================
  describe('message_search', () => {
    it('should search messages', async () => {
      supabaseMock.setQueryResult('messages', mockResults.success(mockMessageList))

      const result = await messageTools.message_search.handler({
        workspace_id: testWorkspaceId,
        query: 'hello',
      })

      const data = expectSuccessWithData<{ messages: unknown[]; query: string }>(result)
      expect(data.query).toBe('hello')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_search.handler({
        workspace_id: testWorkspaceId,
        query: 'hello',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('messages', mockResults.error('Search failed'))

      const result = await messageTools.message_search.handler({
        workspace_id: testWorkspaceId,
        query: 'hello',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // message_get_thread
  // ============================================
  describe('message_get_thread', () => {
    it('should get message thread', async () => {
      supabaseMock.setQueryResultOnce('messages', mockResults.success(mockMessage))
      supabaseMock.setQueryResultOnce('messages', mockResults.success([]))

      const result = await messageTools.message_get_thread.handler({
        workspace_id: testWorkspaceId,
        parent_message_id: mockMessage.id,
      })

      const data = expectSuccessWithData<{ parent_message: unknown; replies: unknown[]; reply_count: number }>(result)
      expect(data.parent_message).toBeDefined()
      expect(data.reply_count).toBe(0)
    })

    it('should return error when parent not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_get_thread.handler({
        workspace_id: testWorkspaceId,
        parent_message_id: 'non-existent',
      })

      expectError(result, 'Message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_get_thread.handler({
        workspace_id: testWorkspaceId,
        parent_message_id: mockMessage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_pin
  // ============================================
  describe('message_pin', () => {
    it('should pin message', async () => {
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ id: mockMessage.id, channel_id: mockChannel.id }))
      supabaseMock.setQueryResultOnce('messages', mockResults.success({ ...mockMessage, is_pinned: true }))

      const result = await messageTools.message_pin.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      const data = expectSuccessWithData<{ message: string; data: unknown }>(result)
      expect(data.message).toBe('Message pinned')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('messages', mockResults.notFound())

      const result = await messageTools.message_pin.handler({
        workspace_id: testWorkspaceId,
        message_id: 'non-existent',
      })

      expectError(result, 'Message not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_pin.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // message_unpin
  // ============================================
  describe('message_unpin', () => {
    it('should unpin message', async () => {
      supabaseMock.setQueryResult('messages', mockResults.success({ ...mockMessage, is_pinned: false }))

      const result = await messageTools.message_unpin.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      const data = expectSuccessWithData<{ message: string; data: unknown }>(result)
      expect(data.message).toBe('Message unpinned')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await messageTools.message_unpin.handler({
        workspace_id: testWorkspaceId,
        message_id: mockMessage.id,
      })

      expectAccessDenied(result)
    })
  })
})
