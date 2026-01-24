/**
 * Tests for team/dm tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dmTools } from '../../../tools/team/dm.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockConversation, testWorkspaceId } from '../../fixtures/team.js'

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

describe('team/dm tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // dm_list_conversations
  // ============================================
  describe('dm_list_conversations', () => {
    it('should list DM conversations', async () => {
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success([
        {
          conversation_id: 'conversation-123',
          last_read_at: '2024-01-15T10:00:00Z',
          conversation: { id: 'conversation-123', workspace_id: testWorkspaceId, created_at: '2024-01-10T00:00:00Z' },
        },
      ]))
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success([]))
      supabaseMock.setQueryResult('messages', mockResults.success([]))

      const result = await dmTools.dm_list_conversations.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'conversations', countKey: 'count' })
    })

    it('should return empty when no conversations', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.success([]))

      const result = await dmTools.dm_list_conversations.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ conversations: unknown[]; count: number }>(result)
      expect(data.count).toBe(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_list_conversations.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.error('Connection failed'))

      const result = await dmTools.dm_list_conversations.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // dm_get_conversation
  // ============================================
  describe('dm_get_conversation', () => {
    it('should get conversation by ID', async () => {
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success({ id: 'participant-1', last_read_at: '2024-01-15T10:00:00Z' }))
      supabaseMock.setQueryResult('dm_conversations', mockResults.success(mockConversation))
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success([{ profile: { id: 'user-456', name: 'Other User' } }]))
      supabaseMock.setQueryResult('messages', mockResults.success([]))

      const result = await dmTools.dm_get_conversation.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.notFound())

      const result = await dmTools.dm_get_conversation.handler({
        workspace_id: testWorkspaceId,
        conversation_id: 'non-existent',
      })

      expectError(result, 'Conversation not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_get_conversation.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // dm_create_conversation
  // ============================================
  describe('dm_create_conversation', () => {
    it('should create DM conversation', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.success([{ profile_id: 'user-456' }]))
      supabaseMock.setQueryResult('dm_conversations', mockResults.success(mockConversation))
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success(null))
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success([{ profile: { id: 'user-456', name: 'Other User' } }]))

      const result = await dmTools.dm_create_conversation.handler({
        workspace_id: testWorkspaceId,
        participant_ids: ['user-456'],
      })

      const data = expectSuccessWithData<{ message: string; conversation: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when participant not in workspace', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.success([]))

      const result = await dmTools.dm_create_conversation.handler({
        workspace_id: testWorkspaceId,
        participant_ids: ['non-existent'],
      })

      expectError(result, 'not members')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_create_conversation.handler({
        workspace_id: testWorkspaceId,
        participant_ids: ['user-456'],
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // dm_get_or_create
  // ============================================
  describe('dm_get_or_create', () => {
    it('should return error when trying to DM yourself', async () => {
      const result = await dmTools.dm_get_or_create.handler({
        workspace_id: testWorkspaceId,
        participant_id: 'test-user-id',
      })

      expectError(result, 'Cannot create a conversation with yourself')
    })

    it('should return error when user not in workspace', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await dmTools.dm_get_or_create.handler({
        workspace_id: testWorkspaceId,
        participant_id: 'user-456',
      })

      expectError(result, 'not a member')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_get_or_create.handler({
        workspace_id: testWorkspaceId,
        participant_id: 'user-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // dm_archive_conversation
  // ============================================
  describe('dm_archive_conversation', () => {
    it('should archive conversation', async () => {
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success({ id: 'participant-1' }))
      supabaseMock.setQueryResultOnce('dm_participants', mockResults.success(null))

      const result = await dmTools.dm_archive_conversation.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      const data = expectSuccessWithData<{ message: string; conversation_id: string }>(result)
      expect(data.message).toContain('archived')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.notFound())

      const result = await dmTools.dm_archive_conversation.handler({
        workspace_id: testWorkspaceId,
        conversation_id: 'non-existent',
      })

      expectError(result, 'Conversation not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_archive_conversation.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // dm_mark_read
  // ============================================
  describe('dm_mark_read', () => {
    it('should mark conversation as read', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.success({ id: 'participant-1', last_read_at: new Date().toISOString() }))

      const result = await dmTools.dm_mark_read.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      const data = expectSuccessWithData<{ message: string; participation: unknown }>(result)
      expect(data.message).toContain('read')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.notFound())

      const result = await dmTools.dm_mark_read.handler({
        workspace_id: testWorkspaceId,
        conversation_id: 'non-existent',
      })

      expectError(result, 'Conversation not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_mark_read.handler({
        workspace_id: testWorkspaceId,
        conversation_id: mockConversation.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // dm_get_unread_count
  // ============================================
  describe('dm_get_unread_count', () => {
    it('should return zero when no conversations', async () => {
      supabaseMock.setQueryResult('dm_participants', mockResults.success([]))

      const result = await dmTools.dm_get_unread_count.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ unread_count: number }>(result)
      expect(data.unread_count).toBe(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dmTools.dm_get_unread_count.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })
})
