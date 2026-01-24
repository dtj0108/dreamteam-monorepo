/**
 * Tests for crm/activities tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { activityTools } from '../../../tools/crm/activities.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectNotFound,
  expectListResult,
  expectMutationResult,
  expectDeleteResult,
} from '../../helpers/response-validators.js'
import { mockActivity, mockActivityList, mockContact, mockDeal, testWorkspaceId } from '../../fixtures/crm.js'

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

describe('crm/activities tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // activity_list
  // ============================================
  describe('activity_list', () => {
    it('should list activities successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success(mockActivityList))

      const result = await activityTools.activity_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'activities', countKey: 'count' })
    })

    it('should filter by type', async () => {
      const callActivities = mockActivityList.filter(a => a.type === 'call')
      supabaseMock.setQueryResult('activities', mockResults.success(callActivities))

      const result = await activityTools.activity_list.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
      })

      expectSuccess(result)
    })

    it('should filter by completion status', async () => {
      const incompleteActivities = mockActivityList.filter(a => !a.is_completed)
      supabaseMock.setQueryResult('activities', mockResults.success(incompleteActivities))

      const result = await activityTools.activity_list.handler({
        workspace_id: testWorkspaceId,
        is_completed: false,
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Connection failed'))

      const result = await activityTools.activity_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // activity_get
  // ============================================
  describe('activity_get', () => {
    it('should get activity by ID', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success(mockActivity))

      const result = await activityTools.activity_get.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('activities', mockResults.notFound())

      const result = await activityTools.activity_get.handler({
        workspace_id: testWorkspaceId,
        activity_id: 'non-existent',
      })

      expectNotFound(result, 'Activity')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_get.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // activity_create
  // ============================================
  describe('activity_create', () => {
    it('should create activity successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success(mockActivity))

      const result = await activityTools.activity_create.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
        subject: 'Follow-up call',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'activity' })
    })

    it('should create activity with contact', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success({ id: mockContact.id }))
      supabaseMock.setQueryResult('activities', mockResults.success(mockActivity))

      const result = await activityTools.activity_create.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
        subject: 'Follow-up call',
        contact_id: mockContact.id,
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'activity' })
    })

    it('should return error when contact not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await activityTools.activity_create.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
        subject: 'Follow-up call',
        contact_id: 'non-existent',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when deal not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await activityTools.activity_create.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
        subject: 'Follow-up call',
        deal_id: 'non-existent',
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_create.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
        subject: 'Follow-up call',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Constraint violation'))

      const result = await activityTools.activity_create.handler({
        workspace_id: testWorkspaceId,
        type: 'call',
        subject: 'Follow-up call',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // activity_update
  // ============================================
  describe('activity_update', () => {
    it('should update activity successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({ id: mockActivity.id }))

      const result = await activityTools.activity_update.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
        subject: 'Updated subject',
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'activity' })
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({ id: mockActivity.id }))

      const result = await activityTools.activity_update.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('activities', mockResults.notFound())

      const result = await activityTools.activity_update.handler({
        workspace_id: testWorkspaceId,
        activity_id: 'non-existent',
        subject: 'Updated',
      })

      expectNotFound(result, 'Activity')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_update.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
        subject: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // activity_delete
  // ============================================
  describe('activity_delete', () => {
    it('should delete activity successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({ id: mockActivity.id }))

      const result = await activityTools.activity_delete.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectDeleteResult(result, 'activity_id')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('activities', mockResults.notFound())

      const result = await activityTools.activity_delete.handler({
        workspace_id: testWorkspaceId,
        activity_id: 'non-existent',
      })

      expectNotFound(result, 'Activity')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_delete.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // activity_mark_complete
  // ============================================
  describe('activity_mark_complete', () => {
    it('should mark activity as complete', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({ id: mockActivity.id }))

      const result = await activityTools.activity_mark_complete.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectMutationResult(result, { messageContains: 'complete', entityKey: 'activity' })
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('activities', mockResults.notFound())

      const result = await activityTools.activity_mark_complete.handler({
        workspace_id: testWorkspaceId,
        activity_id: 'non-existent',
      })

      expectNotFound(result, 'Activity')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_mark_complete.handler({
        workspace_id: testWorkspaceId,
        activity_id: mockActivity.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // activity_log_call
  // ============================================
  describe('activity_log_call', () => {
    it('should log call successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({
        ...mockActivity,
        type: 'call',
        is_completed: true,
      }))

      const result = await activityTools.activity_log_call.handler({
        workspace_id: testWorkspaceId,
        subject: 'Sales call',
        duration_minutes: 30,
      })

      expectMutationResult(result, { messageContains: 'logged', entityKey: 'activity' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_log_call.handler({
        workspace_id: testWorkspaceId,
        subject: 'Sales call',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Insert failed'))

      const result = await activityTools.activity_log_call.handler({
        workspace_id: testWorkspaceId,
        subject: 'Sales call',
      })

      expectError(result, 'Failed to log')
    })
  })

  // ============================================
  // activity_log_email
  // ============================================
  describe('activity_log_email', () => {
    it('should log email successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({
        ...mockActivity,
        type: 'email',
        is_completed: true,
      }))

      const result = await activityTools.activity_log_email.handler({
        workspace_id: testWorkspaceId,
        subject: 'Follow-up email',
      })

      expectMutationResult(result, { messageContains: 'logged', entityKey: 'activity' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_log_email.handler({
        workspace_id: testWorkspaceId,
        subject: 'Follow-up email',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Insert failed'))

      const result = await activityTools.activity_log_email.handler({
        workspace_id: testWorkspaceId,
        subject: 'Follow-up email',
      })

      expectError(result, 'Failed to log')
    })
  })

  // ============================================
  // activity_log_meeting
  // ============================================
  describe('activity_log_meeting', () => {
    it('should log meeting successfully', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success({
        ...mockActivity,
        type: 'meeting',
        is_completed: true,
      }))

      const result = await activityTools.activity_log_meeting.handler({
        workspace_id: testWorkspaceId,
        subject: 'Product demo',
        meeting_date: '2024-02-01T14:00:00Z',
      })

      expectMutationResult(result, { messageContains: 'logged', entityKey: 'activity' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_log_meeting.handler({
        workspace_id: testWorkspaceId,
        subject: 'Product demo',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Insert failed'))

      const result = await activityTools.activity_log_meeting.handler({
        workspace_id: testWorkspaceId,
        subject: 'Product demo',
      })

      expectError(result, 'Failed to log')
    })
  })

  // ============================================
  // activity_get_overdue
  // ============================================
  describe('activity_get_overdue', () => {
    it('should get overdue activities', async () => {
      const overdueActivities = mockActivityList.filter(a => !a.is_completed && a.due_date)
      supabaseMock.setQueryResult('activities', mockResults.success(overdueActivities))

      const result = await activityTools.activity_get_overdue.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ activities: unknown[]; message: string }>(result)
      expect(data.message).toContain('overdue')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_get_overdue.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Query failed'))

      const result = await activityTools.activity_get_overdue.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // activity_get_upcoming
  // ============================================
  describe('activity_get_upcoming', () => {
    it('should get upcoming activities', async () => {
      supabaseMock.setQueryResult('activities', mockResults.success([]))

      const result = await activityTools.activity_get_upcoming.handler({
        workspace_id: testWorkspaceId,
        days_ahead: 7,
      })

      const data = expectSuccessWithData<{ activities: unknown[]; days_ahead: number; message: string }>(result)
      expect(data.days_ahead).toBe(7)
      expect(data.message).toContain('upcoming')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await activityTools.activity_get_upcoming.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('activities', mockResults.error('Query failed'))

      const result = await activityTools.activity_get_upcoming.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })
})
