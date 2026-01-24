/**
 * Tests for team/channels tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { channelTools } from '../../../tools/team/channels.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectNotFound,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockChannel, mockChannelList, mockChannelMember, mockChannelMemberList, testWorkspaceId } from '../../fixtures/team.js'

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

describe('team/channels tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // channel_list
  // ============================================
  describe('channel_list', () => {
    it('should list channels successfully', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success(mockChannelList))
      supabaseMock.setQueryResult('channel_members', mockResults.success([]))

      const result = await channelTools.channel_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'channels', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('channels', mockResults.error('Connection failed'))

      const result = await channelTools.channel_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // channel_get
  // ============================================
  describe('channel_get', () => {
    it('should get channel by ID', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success(mockChannel))
      supabaseMock.setQueryResult('channel_members', mockResults.success([]))

      const result = await channelTools.channel_get.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_get.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_get.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_create
  // ============================================
  describe('channel_create', () => {
    it('should create channel successfully', async () => {
      // First query checks if name exists (should return not found)
      supabaseMock.setQueryResultOnce('channels', mockResults.notFound())
      // Second query creates the channel
      supabaseMock.setQueryResultOnce('channels', mockResults.success(mockChannel))
      // Third query adds creator as member
      supabaseMock.setQueryResult('channel_members', mockResults.success(mockChannelMember))

      const result = await channelTools.channel_create.handler({
        workspace_id: testWorkspaceId,
        name: 'general',
      })

      const data = expectSuccessWithData<{ message: string; channel: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_create.handler({
        workspace_id: testWorkspaceId,
        name: 'general',
      })

      expectAccessDenied(result)
    })

    it('should return error when channel name already exists', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ id: 'existing-channel' }))

      const result = await channelTools.channel_create.handler({
        workspace_id: testWorkspaceId,
        name: 'general',
      })

      expectError(result, 'already exists')
    })
  })

  // ============================================
  // channel_update
  // ============================================
  describe('channel_update', () => {
    it('should update channel successfully', async () => {
      supabaseMock.setQueryResultOnce('channels', mockResults.success({ id: mockChannel.id, created_by: 'test-user-id' }))
      supabaseMock.setQueryResultOnce('channels', mockResults.success({ ...mockChannel, name: 'Updated Channel' }))

      const result = await channelTools.channel_update.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        name: 'Updated Channel',
      })

      const data = expectSuccessWithData<{ message: string; channel: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ id: mockChannel.id, created_by: 'test-user-id' }))

      const result = await channelTools.channel_update.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_update.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_update.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_delete
  // ============================================
  describe('channel_delete', () => {
    it('should archive channel successfully', async () => {
      supabaseMock.setQueryResultOnce('channels', mockResults.success({ id: mockChannel.id, created_by: 'test-user-id', name: 'general' }))
      supabaseMock.setQueryResultOnce('channels', mockResults.success(null))

      const result = await channelTools.channel_delete.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      const data = expectSuccessWithData<{ message: string; channel_id: string }>(result)
      expect(data.message).toContain('archived')
      expect(data.channel_id).toBe(mockChannel.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_delete.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_delete.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_join
  // ============================================
  describe('channel_join', () => {
    it('should join channel successfully', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ ...mockChannel, is_private: false }))
      supabaseMock.setQueryResultOnce('channel_members', mockResults.notFound()) // Not already a member
      supabaseMock.setQueryResultOnce('channel_members', mockResults.success(mockChannelMember))

      const result = await channelTools.channel_join.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      const data = expectSuccessWithData<{ message: string; membership: unknown }>(result)
      expect(data.message).toContain('Joined')
    })

    it('should return error when channel not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_join.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when channel is private', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ ...mockChannel, is_private: true }))

      const result = await channelTools.channel_join.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectError(result, 'Cannot join a private channel')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_join.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_leave
  // ============================================
  describe('channel_leave', () => {
    it('should leave channel successfully', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ ...mockChannel, created_by: 'other-user' }))
      supabaseMock.setQueryResultOnce('channel_members', mockResults.success({ id: 'membership-123' }))
      supabaseMock.setQueryResultOnce('channel_members', mockResults.success(null))

      const result = await channelTools.channel_leave.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      const data = expectSuccessWithData<{ message: string; channel_id: string }>(result)
      expect(data.message).toContain('Left')
    })

    it('should return error when channel not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_leave.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when channel creator tries to leave', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ ...mockChannel, created_by: 'test-user-id' }))

      const result = await channelTools.channel_leave.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectError(result, 'Channel creator cannot leave')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_leave.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_add_member
  // ============================================
  describe('channel_add_member', () => {
    it('should add member to channel', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success(mockChannel))
      supabaseMock.setQueryResult('workspace_members', mockResults.success({ id: 'ws-member-456', profile_id: 'user-456' }))
      supabaseMock.setQueryResultOnce('channel_members', mockResults.notFound()) // Not already a member
      supabaseMock.setQueryResultOnce('channel_members', mockResults.success(mockChannelMember))

      const result = await channelTools.channel_add_member.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        member_id: 'ws-member-456',
      })

      const data = expectSuccessWithData<{ message: string; membership: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when channel not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_add_member.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
        member_id: 'ws-member-456',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_add_member.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        member_id: 'ws-member-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_remove_member
  // ============================================
  describe('channel_remove_member', () => {
    it('should remove member from channel', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success({ id: mockChannel.id, created_by: 'test-user-id' }))
      supabaseMock.setQueryResult('workspace_members', mockResults.success({ id: 'ws-member-456', profile_id: 'user-456' }))
      supabaseMock.setQueryResult('channel_members', mockResults.success(null))

      const result = await channelTools.channel_remove_member.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        member_id: 'ws-member-456',
      })

      const data = expectSuccessWithData<{ message: string; channel_id: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when channel not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_remove_member.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
        member_id: 'ws-member-456',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_remove_member.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        member_id: 'ws-member-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_get_members
  // ============================================
  describe('channel_get_members', () => {
    it('should get channel members', async () => {
      supabaseMock.setQueryResult('channels', mockResults.success(mockChannel))
      supabaseMock.setQueryResult('channel_members', mockResults.success(mockChannelMemberList))

      const result = await channelTools.channel_get_members.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      const data = expectSuccessWithData<{ members: unknown[]; channel_id: string }>(result)
      expect(data.channel_id).toBe(mockChannel.id)
    })

    it('should return error when channel not found', async () => {
      supabaseMock.setQueryResult('channels', mockResults.notFound())

      const result = await channelTools.channel_get_members.handler({
        workspace_id: testWorkspaceId,
        channel_id: 'non-existent',
      })

      expectError(result, 'Channel not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_get_members.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // channel_set_notifications
  // ============================================
  describe('channel_set_notifications', () => {
    it('should set notification preferences', async () => {
      supabaseMock.setQueryResultOnce('channel_members', mockResults.success({ id: 'membership-123' }))
      supabaseMock.setQueryResultOnce('channel_members', mockResults.success({ ...mockChannelMember, notifications: 'mentions' }))

      const result = await channelTools.channel_set_notifications.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        notifications: 'mentions',
      })

      const data = expectSuccessWithData<{ message: string; membership: unknown }>(result)
      expect(data.message).toContain('mentions')
    })

    it('should return error when not a member', async () => {
      supabaseMock.setQueryResult('channel_members', mockResults.notFound())

      const result = await channelTools.channel_set_notifications.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        notifications: 'all',
      })

      expectError(result, 'not a member')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await channelTools.channel_set_notifications.handler({
        workspace_id: testWorkspaceId,
        channel_id: mockChannel.id,
        notifications: 'all',
      })

      expectAccessDenied(result)
    })
  })
})
