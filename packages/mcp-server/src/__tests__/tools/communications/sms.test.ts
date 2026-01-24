/**
 * Tests for communications/sms tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { smsTools } from '../../../tools/communications/sms.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockSms,
  mockSmsList,
  mockConversationThread,
  mockConversationThreadList,
  mockPhoneNumber,
  testWorkspaceId,
} from '../../fixtures/communications.js'

vi.mock('../../../auth.js', () => ({
  getSupabase: vi.fn(),
}))

vi.mock('../../../lib/context.js', () => ({
  resolveWorkspaceId: vi.fn((input: { workspace_id?: string }) => input.workspace_id || testWorkspaceId),
  getWorkspaceId: vi.fn(() => testWorkspaceId),
  getUserId: vi.fn(() => 'test-user-id'),
  getAuthenticatedUserId: vi.fn(() => 'test-user-id'),
}))

import { getSupabase } from '../../../auth.js'

describe('communications/sms tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // sms_send
  // ============================================
  describe('sms_send', () => {
    it('should send SMS with specified from number', async () => {
      // Insert SMS
      supabaseMock.setQueryResultOnce('communications', mockResults.success(mockSms))
      // Check existing thread
      supabaseMock.setQueryResultOnce('conversation_threads', mockResults.success(mockConversationThread))
      // Update thread
      supabaseMock.setQueryResultOnce('conversation_threads', mockResults.success(null))

      const result = await smsTools.sms_send.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
        body: 'Hello!',
        from_number: '+15551234567',
      })

      const data = expectSuccessWithData<{ message: string; sms: unknown }>(result)
      expect(data.message).toContain('sent')
    })

    it('should use default from number when not specified', async () => {
      // Get default number
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(mockPhoneNumber))
      // Insert SMS
      supabaseMock.setQueryResultOnce('communications', mockResults.success(mockSms))
      // Check existing thread (not found)
      supabaseMock.setQueryResultOnce('conversation_threads', mockResults.notFound())
      // Insert new thread
      supabaseMock.setQueryResultOnce('conversation_threads', mockResults.success(mockConversationThread))

      const result = await smsTools.sms_send.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
        body: 'Hello!',
      })

      const data = expectSuccessWithData<{ message: string; sms: unknown }>(result)
      expect(data.message).toContain('sent')
    })

    it('should return error when no from number available', async () => {
      supabaseMock.setQueryResult('twilio_numbers', mockResults.notFound())

      const result = await smsTools.sms_send.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
        body: 'Hello!',
      })

      expectError(result, 'No from number')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(mockPhoneNumber))
      supabaseMock.setQueryResultOnce('communications', mockResults.error('Insert failed'))

      const result = await smsTools.sms_send.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
        body: 'Hello!',
      })

      expectError(result, 'Failed to send SMS')
    })
  })

  // ============================================
  // sms_list
  // ============================================
  describe('sms_list', () => {
    it('should list SMS messages successfully', async () => {
      supabaseMock.setQueryResult('communications', mockResults.success(mockSmsList))

      const result = await smsTools.sms_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'messages', countKey: 'count' })
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('communications', mockResults.error('Connection failed'))

      const result = await smsTools.sms_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // sms_get_conversation
  // ============================================
  describe('sms_get_conversation', () => {
    it('should get conversation thread', async () => {
      // Get messages
      supabaseMock.setQueryResultOnce('communications', mockResults.success(mockSmsList))
      // Get thread
      supabaseMock.setQueryResultOnce('conversation_threads', mockResults.success(mockConversationThread))

      const result = await smsTools.sms_get_conversation.handler({
        workspace_id: testWorkspaceId,
        phone_number: '+15559876543',
      })

      const data = expectSuccessWithData<{ thread: unknown; messages: unknown[]; count: number }>(result)
      expect(data.messages).toBeDefined()
      expect(data.count).toBeGreaterThanOrEqual(0)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('communications', mockResults.error('Connection failed'))

      const result = await smsTools.sms_get_conversation.handler({
        workspace_id: testWorkspaceId,
        phone_number: '+15559876543',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // sms_get_threads
  // ============================================
  describe('sms_get_threads', () => {
    it('should list conversation threads', async () => {
      supabaseMock.setQueryResult('conversation_threads', mockResults.success(mockConversationThreadList))

      const result = await smsTools.sms_get_threads.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'threads', countKey: 'count' })
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('conversation_threads', mockResults.error('Connection failed'))

      const result = await smsTools.sms_get_threads.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // sms_mark_thread_read
  // ============================================
  describe('sms_mark_thread_read', () => {
    it('should mark thread as read', async () => {
      supabaseMock.setQueryResult('conversation_threads', mockResults.success({ ...mockConversationThread, unread_count: 0 }))

      const result = await smsTools.sms_mark_thread_read.handler({
        workspace_id: testWorkspaceId,
        phone_number: '+15559876543',
      })

      const data = expectSuccessWithData<{ message: string; thread: unknown }>(result)
      expect(data.message).toContain('marked as read')
    })

    it('should return error when thread not found', async () => {
      supabaseMock.setQueryResult('conversation_threads', mockResults.notFound())

      const result = await smsTools.sms_mark_thread_read.handler({
        workspace_id: testWorkspaceId,
        phone_number: '+15551111111',
      })

      expectError(result, 'thread not found')
    })
  })
})
