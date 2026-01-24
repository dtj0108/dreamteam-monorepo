/**
 * Tests for communications/calls tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callTools } from '../../../tools/communications/calls.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockCall,
  mockCallList,
  mockCallRecording,
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

describe('communications/calls tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // call_initiate
  // ============================================
  describe('call_initiate', () => {
    it('should initiate call with specified from number', async () => {
      supabaseMock.setQueryResult('communications', mockResults.success(mockCall))

      const result = await callTools.call_initiate.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
        from_number: '+15551234567',
      })

      const data = expectSuccessWithData<{ message: string; call: unknown }>(result)
      expect(data.message).toContain('initiated')
    })

    it('should use default from number when not specified', async () => {
      // Get default number
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(mockPhoneNumber))
      // Insert call
      supabaseMock.setQueryResultOnce('communications', mockResults.success(mockCall))

      const result = await callTools.call_initiate.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
      })

      const data = expectSuccessWithData<{ message: string; call: unknown }>(result)
      expect(data.message).toContain('initiated')
    })

    it('should return error when no from number available', async () => {
      supabaseMock.setQueryResult('twilio_numbers', mockResults.notFound())

      const result = await callTools.call_initiate.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
      })

      expectError(result, 'No from number')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(mockPhoneNumber))
      supabaseMock.setQueryResultOnce('communications', mockResults.error('Insert failed'))

      const result = await callTools.call_initiate.handler({
        workspace_id: testWorkspaceId,
        to_phone: '+15559876543',
      })

      expectError(result, 'Failed to initiate call')
    })
  })

  // ============================================
  // call_get
  // ============================================
  describe('call_get', () => {
    it('should get call by ID', async () => {
      supabaseMock.setQueryResult('communications', mockResults.success(mockCall))

      const result = await callTools.call_get.handler({
        workspace_id: testWorkspaceId,
        call_id: mockCall.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('communications', mockResults.notFound())

      const result = await callTools.call_get.handler({
        workspace_id: testWorkspaceId,
        call_id: 'non-existent',
      })

      expectError(result, 'Call not found')
    })
  })

  // ============================================
  // call_list
  // ============================================
  describe('call_list', () => {
    it('should list calls successfully', async () => {
      supabaseMock.setQueryResult('communications', mockResults.success(mockCallList))

      const result = await callTools.call_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'calls', countKey: 'count' })
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('communications', mockResults.error('Connection failed'))

      const result = await callTools.call_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // call_get_recording
  // ============================================
  describe('call_get_recording', () => {
    it('should get call recording', async () => {
      // Verify call exists
      supabaseMock.setQueryResultOnce('communications', mockResults.success({ id: mockCall.id }))
      // Get recording
      supabaseMock.setQueryResultOnce('call_recordings', mockResults.success(mockCallRecording))

      const result = await callTools.call_get_recording.handler({
        workspace_id: testWorkspaceId,
        call_id: mockCall.id,
      })

      const data = expectSuccessWithData<{ recording_url: string; duration_seconds: number }>(result)
      expect(data.recording_url).toBeDefined()
      expect(data.duration_seconds).toBe(120)
    })

    it('should return error when call not found', async () => {
      supabaseMock.setQueryResult('communications', mockResults.notFound())

      const result = await callTools.call_get_recording.handler({
        workspace_id: testWorkspaceId,
        call_id: 'non-existent',
      })

      expectError(result, 'Call not found')
    })

    it('should return error when no recording found', async () => {
      supabaseMock.setQueryResultOnce('communications', mockResults.success({ id: mockCall.id }))
      supabaseMock.setQueryResultOnce('call_recordings', mockResults.notFound())

      const result = await callTools.call_get_recording.handler({
        workspace_id: testWorkspaceId,
        call_id: mockCall.id,
      })

      expectError(result, 'No recording found')
    })
  })

  // ============================================
  // call_end
  // ============================================
  describe('call_end', () => {
    it('should end active call', async () => {
      // Get call (active)
      supabaseMock.setQueryResultOnce('communications', mockResults.success({ id: mockCall.id, twilio_sid: 'CA123', twilio_status: 'in-progress' }))
      // Update call
      supabaseMock.setQueryResultOnce('communications', mockResults.success({ ...mockCall, twilio_status: 'completed' }))

      const result = await callTools.call_end.handler({
        workspace_id: testWorkspaceId,
        call_id: mockCall.id,
      })

      const data = expectSuccessWithData<{ message: string; call: unknown }>(result)
      expect(data.message).toContain('ended')
    })

    it('should return error when call not found', async () => {
      supabaseMock.setQueryResult('communications', mockResults.notFound())

      const result = await callTools.call_end.handler({
        workspace_id: testWorkspaceId,
        call_id: 'non-existent',
      })

      expectError(result, 'Call not found')
    })

    it('should return error when call is not active', async () => {
      supabaseMock.setQueryResult('communications', mockResults.success({ id: mockCall.id, twilio_sid: 'CA123', twilio_status: 'completed' }))

      const result = await callTools.call_end.handler({
        workspace_id: testWorkspaceId,
        call_id: mockCall.id,
      })

      expectError(result, 'Call is not active')
    })
  })
})
