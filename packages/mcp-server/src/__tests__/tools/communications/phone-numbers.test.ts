/**
 * Tests for communications/phone-numbers tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { phoneNumberTools } from '../../../tools/communications/phone-numbers.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockPhoneNumber,
  mockPhoneNumberSecondary,
  mockPhoneNumberList,
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

describe('communications/phone-numbers tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // phone_number_list
  // ============================================
  describe('phone_number_list', () => {
    it('should list phone numbers successfully', async () => {
      supabaseMock.setQueryResult('twilio_numbers', mockResults.success(mockPhoneNumberList))

      const result = await phoneNumberTools.phone_number_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'phone_numbers', countKey: 'count' })
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('twilio_numbers', mockResults.error('Connection failed'))

      const result = await phoneNumberTools.phone_number_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // phone_number_provision
  // ============================================
  describe('phone_number_provision', () => {
    it('should initiate phone number provisioning', async () => {
      const result = await phoneNumberTools.phone_number_provision.handler({
        workspace_id: testWorkspaceId,
        area_code: '555',
        country: 'US',
      })

      const data = expectSuccessWithData<{ message: string; requested: { area_code: string; country: string } }>(result)
      expect(data.message).toContain('provisioning initiated')
      expect(data.requested.area_code).toBe('555')
      expect(data.requested.country).toBe('US')
    })

    it('should use defaults when not specified', async () => {
      const result = await phoneNumberTools.phone_number_provision.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ message: string; requested: { area_code: string; country: string } }>(result)
      expect(data.requested.area_code).toBe('any')
      expect(data.requested.country).toBe('US')
    })
  })

  // ============================================
  // phone_number_release
  // ============================================
  describe('phone_number_release', () => {
    it('should release phone number', async () => {
      // Verify number exists
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(mockPhoneNumber))
      // Delete number
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(null))

      const result = await phoneNumberTools.phone_number_release.handler({
        workspace_id: testWorkspaceId,
        phone_number_id: mockPhoneNumber.id,
      })

      const data = expectSuccessWithData<{ message: string; phone_number: string }>(result)
      expect(data.message).toContain('released')
      expect(data.phone_number).toBe(mockPhoneNumber.phone_number)
    })

    it('should return error when phone number not found', async () => {
      supabaseMock.setQueryResult('twilio_numbers', mockResults.notFound())

      const result = await phoneNumberTools.phone_number_release.handler({
        workspace_id: testWorkspaceId,
        phone_number_id: 'non-existent',
      })

      expectError(result, 'Phone number not found')
    })
  })

  // ============================================
  // phone_number_set_default
  // ============================================
  describe('phone_number_set_default', () => {
    it('should set phone number as default', async () => {
      // Verify number exists
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success({ id: mockPhoneNumberSecondary.id }))
      // Unset current default
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success(null))
      // Set new default
      supabaseMock.setQueryResultOnce('twilio_numbers', mockResults.success({ ...mockPhoneNumberSecondary, is_primary: true }))

      const result = await phoneNumberTools.phone_number_set_default.handler({
        workspace_id: testWorkspaceId,
        phone_number_id: mockPhoneNumberSecondary.id,
      })

      const data = expectSuccessWithData<{ message: string; phone_number: unknown }>(result)
      expect(data.message).toContain('Default phone number updated')
    })

    it('should return error when phone number not found', async () => {
      supabaseMock.setQueryResult('twilio_numbers', mockResults.notFound())

      const result = await phoneNumberTools.phone_number_set_default.handler({
        workspace_id: testWorkspaceId,
        phone_number_id: 'non-existent',
      })

      expectError(result, 'Phone number not found')
    })
  })
})
