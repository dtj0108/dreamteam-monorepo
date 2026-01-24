/**
 * Tests for crm/leads tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { leadTools } from '../../../tools/crm/leads.js'
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
import { mockLead, mockLeadList, mockLeadTask, mockLeadTaskList, testWorkspaceId } from '../../fixtures/crm.js'

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

describe('crm/leads tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // lead_list
  // ============================================
  describe('lead_list', () => {
    it('should list leads successfully', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success(mockLeadList))

      const result = await leadTools.lead_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'leads', countKey: 'count' })
    })

    it('should filter by status', async () => {
      const filteredLeads = mockLeadList.filter(l => l.status === 'qualified')
      supabaseMock.setQueryResult('leads', mockResults.success(filteredLeads))

      const result = await leadTools.lead_list.handler({
        workspace_id: testWorkspaceId,
        status: 'qualified',
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('leads', mockResults.error('Connection failed'))

      const result = await leadTools.lead_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // lead_get
  // ============================================
  describe('lead_get', () => {
    it('should get lead by ID', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success(mockLead))

      const result = await leadTools.lead_get.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_get.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
      })

      expectNotFound(result, 'Lead')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_get.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_create
  // ============================================
  describe('lead_create', () => {
    it('should create lead successfully', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success(mockLead))

      const result = await leadTools.lead_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Acme Corp',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'lead' })
    })

    it('should create lead with pipeline and stage', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: 'pipeline-123' }))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success({ id: 'stage-123', pipeline_id: 'pipeline-123' }))
      supabaseMock.setQueryResult('leads', mockResults.success(mockLead))

      const result = await leadTools.lead_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Acme Corp',
        pipeline_id: 'pipeline-123',
        stage_id: 'stage-123',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'lead' })
    })

    it('should return error when pipeline not found', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.notFound())

      const result = await leadTools.lead_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Acme Corp',
        pipeline_id: 'non-existent',
      })

      expectError(result, 'Pipeline not found')
    })

    it('should return error when stage not found', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.notFound())

      const result = await leadTools.lead_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Acme Corp',
        stage_id: 'non-existent',
      })

      expectError(result, 'Stage not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Acme Corp',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('leads', mockResults.error('Constraint violation'))

      const result = await leadTools.lead_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Acme Corp',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // lead_update
  // ============================================
  describe('lead_update', () => {
    it('should update lead successfully', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))

      const result = await leadTools.lead_update.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        name: 'Updated Name',
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'lead' })
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))

      const result = await leadTools.lead_update.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_update.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_update.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_delete
  // ============================================
  describe('lead_delete', () => {
    it('should delete lead successfully', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))

      const result = await leadTools.lead_delete.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectDeleteResult(result, 'lead_id')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_delete.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_delete.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_change_status
  // ============================================
  describe('lead_change_status', () => {
    it('should change lead status successfully', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id, status: 'qualified' }))

      const result = await leadTools.lead_change_status.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        status: 'won',
      })

      const data = expectSuccessWithData<{ old_status: string; new_status: string }>(result)
      expect(data.old_status).toBe('qualified')
      expect(data.new_status).toBe('won')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_change_status.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
        status: 'won',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_change_status.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        status: 'won',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_move_stage
  // ============================================
  describe('lead_move_stage', () => {
    it('should move lead to new stage', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id, stage_id: 'stage-123', pipeline_id: 'pipeline-123' }))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success({ id: 'stage-456', name: 'Contacted', pipeline_id: 'pipeline-123' }))

      const result = await leadTools.lead_move_stage.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        stage_id: 'stage-456',
      })

      const data = expectSuccessWithData<{ old_stage_id: string; new_stage_id: string }>(result)
      expect(data.old_stage_id).toBe('stage-123')
      expect(data.new_stage_id).toBe('stage-456')
    })

    it('should return error when stage not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id, stage_id: 'stage-123' }))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.notFound())

      const result = await leadTools.lead_move_stage.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        stage_id: 'non-existent',
      })

      expectError(result, 'Stage not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_move_stage.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        stage_id: 'stage-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_add_task
  // ============================================
  describe('lead_add_task', () => {
    it('should add task to lead', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))
      supabaseMock.setQueryResult('lead_tasks', mockResults.success(mockLeadTask))

      const result = await leadTools.lead_add_task.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        title: 'Send proposal',
      })

      expectMutationResult(result, { messageContains: 'added', entityKey: 'task' })
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_add_task.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
        title: 'Send proposal',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_add_task.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        title: 'Send proposal',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_complete_task
  // ============================================
  describe('lead_complete_task', () => {
    it('should complete task', async () => {
      supabaseMock.setQueryResult('lead_tasks', mockResults.success({ ...mockLeadTask, is_completed: true }))

      const result = await leadTools.lead_complete_task.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        task_id: mockLeadTask.id,
      })

      expectMutationResult(result, { messageContains: 'completed', entityKey: 'task' })
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('lead_tasks', mockResults.notFound())

      const result = await leadTools.lead_complete_task.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        task_id: 'non-existent',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_complete_task.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        task_id: mockLeadTask.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_get_tasks
  // ============================================
  describe('lead_get_tasks', () => {
    it('should get lead tasks', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))
      supabaseMock.setQueryResult('lead_tasks', mockResults.success(mockLeadTaskList))

      const result = await leadTools.lead_get_tasks.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      const data = expectSuccessWithData<{ tasks: unknown[]; lead_id: string }>(result)
      expect(data.lead_id).toBe(mockLead.id)
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_get_tasks.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_get_tasks.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_get_opportunities
  // ============================================
  describe('lead_get_opportunities', () => {
    it('should get lead opportunities', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success([]))

      const result = await leadTools.lead_get_opportunities.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      const data = expectSuccessWithData<{ opportunities: unknown[]; lead_id: string }>(result)
      expect(data.lead_id).toBe(mockLead.id)
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_get_opportunities.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_get_opportunities.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // lead_get_contacts
  // ============================================
  describe('lead_get_contacts', () => {
    it('should get lead contacts', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id, name: 'Acme Corp' }))
      supabaseMock.setQueryResult('contacts', mockResults.success([]))

      const result = await leadTools.lead_get_contacts.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      const data = expectSuccessWithData<{ contacts: unknown[]; lead: { id: string } }>(result)
      expect(data.lead.id).toBe(mockLead.id)
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await leadTools.lead_get_contacts.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await leadTools.lead_get_contacts.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
      })

      expectAccessDenied(result)
    })
  })
})
