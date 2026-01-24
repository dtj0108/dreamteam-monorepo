/**
 * Tests for agents/workflows tools
 *
 * Note: Workflows are user-scoped (not workspace-scoped), so they use
 * user_id directly without validateWorkspaceAccess.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workflowTools } from '../../../tools/agents/workflows.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockWorkflow,
  mockWorkflowInactive,
  mockWorkflowList,
  mockWorkflowExecution,
  mockExecutionList,
  testUserId,
} from '../../fixtures/agents.js'

vi.mock('../../../auth.js', () => ({
  getSupabase: vi.fn(),
}))

import { getSupabase } from '../../../auth.js'

describe('agents/workflows tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // workflow_list
  // ============================================
  describe('workflow_list', () => {
    it('should list workflows successfully', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success(mockWorkflowList))

      const result = await workflowTools.workflow_list.handler({
        user_id: testUserId,
      })

      expectListResult(result, { itemsKey: 'workflows', countKey: 'count' })
    })

    it('should filter by active status', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success([mockWorkflow]))

      const result = await workflowTools.workflow_list.handler({
        user_id: testUserId,
        is_active: true,
      })

      const data = expectSuccessWithData<{ workflows: unknown[]; count: number }>(result)
      expect(data.workflows).toHaveLength(1)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.error('Connection failed'))

      const result = await workflowTools.workflow_list.handler({
        user_id: testUserId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // workflow_get
  // ============================================
  describe('workflow_get', () => {
    it('should get workflow by ID', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success(mockWorkflow))

      const result = await workflowTools.workflow_get.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_get.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
      })

      expectError(result, 'Workflow not found')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.error('Connection failed'))

      const result = await workflowTools.workflow_get.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // workflow_create
  // ============================================
  describe('workflow_create', () => {
    it('should create workflow successfully', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success(mockWorkflow))

      const result = await workflowTools.workflow_create.handler({
        user_id: testUserId,
        name: 'New Workflow',
        description: 'A test workflow',
        trigger_type: 'schedule',
        trigger_config: { cron: '0 9 * * *' },
        actions: [{ type: 'email', to: 'test@example.com' }],
      })

      const data = expectSuccessWithData<{ message: string; workflow: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should create workflow with manual trigger', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success({ ...mockWorkflow, trigger_type: 'manual' }))

      const result = await workflowTools.workflow_create.handler({
        user_id: testUserId,
        name: 'Manual Workflow',
        trigger_type: 'manual',
        actions: [{ type: 'api_call' }],
      })

      const data = expectSuccessWithData<{ message: string; workflow: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.error('Insert failed'))

      const result = await workflowTools.workflow_create.handler({
        user_id: testUserId,
        name: 'New Workflow',
        trigger_type: 'webhook',
        actions: [],
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // workflow_update
  // ============================================
  describe('workflow_update', () => {
    it('should update workflow successfully', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success({ id: mockWorkflow.id }))
      supabaseMock.setQueryResultOnce('workflows', mockResults.success({ ...mockWorkflow, name: 'Updated Workflow' }))

      const result = await workflowTools.workflow_update.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
        name: 'Updated Workflow',
      })

      const data = expectSuccessWithData<{ message: string; workflow: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_update.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Workflow not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success({ id: mockWorkflow.id }))

      const result = await workflowTools.workflow_update.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      expectError(result, 'No fields to update')
    })
  })

  // ============================================
  // workflow_delete
  // ============================================
  describe('workflow_delete', () => {
    it('should delete workflow successfully', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success({ id: mockWorkflow.id }))
      supabaseMock.setQueryResultOnce('workflows', mockResults.success(null))

      const result = await workflowTools.workflow_delete.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      const data = expectSuccessWithData<{ message: string; workflow_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.workflow_id).toBe(mockWorkflow.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_delete.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
      })

      expectError(result, 'Workflow not found')
    })
  })

  // ============================================
  // workflow_execute
  // ============================================
  describe('workflow_execute', () => {
    it('should execute workflow successfully', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success(mockWorkflow))
      supabaseMock.setQueryResultOnce('workflow_executions', mockResults.success({
        id: 'exec-new',
        status: 'pending',
      }))

      const result = await workflowTools.workflow_execute.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      const data = expectSuccessWithData<{ message: string; execution_id: string; status: string; note: string }>(result)
      expect(data.message).toContain('started')
      expect(data.status).toBe('pending')
      expect(data.note).toContain('asynchronously')
    })

    it('should execute workflow with input data', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success(mockWorkflow))
      supabaseMock.setQueryResultOnce('workflow_executions', mockResults.success({
        id: 'exec-new',
        status: 'pending',
      }))

      const result = await workflowTools.workflow_execute.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
        input: { lead_id: 'lead-123' },
      })

      const data = expectSuccessWithData<{ message: string; execution_id: string }>(result)
      expect(data.message).toContain('started')
    })

    it('should return error when workflow not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_execute.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
      })

      expectError(result, 'Workflow not found')
    })

    it('should return error when workflow is disabled', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success(mockWorkflowInactive))

      const result = await workflowTools.workflow_execute.handler({
        user_id: testUserId,
        workflow_id: mockWorkflowInactive.id,
      })

      expectError(result, 'disabled')
    })

    it('should handle database errors on execution create', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success(mockWorkflow))
      supabaseMock.setQueryResultOnce('workflow_executions', mockResults.error('Insert failed'))

      const result = await workflowTools.workflow_execute.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      expectError(result, 'Failed to create execution')
    })
  })

  // ============================================
  // workflow_get_executions
  // ============================================
  describe('workflow_get_executions', () => {
    it('should get workflow executions', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success({ id: mockWorkflow.id }))
      supabaseMock.setQueryResultOnce('workflow_executions', mockResults.success(mockExecutionList))

      const result = await workflowTools.workflow_get_executions.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      expectListResult(result, { itemsKey: 'executions', countKey: 'count' })
    })

    it('should return error when workflow not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_get_executions.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
      })

      expectError(result, 'Workflow not found')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('workflows', mockResults.success({ id: mockWorkflow.id }))
      supabaseMock.setQueryResultOnce('workflow_executions', mockResults.error('Query failed'))

      const result = await workflowTools.workflow_get_executions.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // workflow_enable
  // ============================================
  describe('workflow_enable', () => {
    it('should enable workflow successfully', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success({ ...mockWorkflowInactive, is_active: true }))

      const result = await workflowTools.workflow_enable.handler({
        user_id: testUserId,
        workflow_id: mockWorkflowInactive.id,
      })

      const data = expectSuccessWithData<{ message: string; workflow: { is_active: boolean } }>(result)
      expect(data.message).toContain('enabled')
      expect(data.workflow.is_active).toBe(true)
    })

    it('should return error when workflow not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_enable.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
      })

      expectError(result, 'Workflow not found')
    })
  })

  // ============================================
  // workflow_disable
  // ============================================
  describe('workflow_disable', () => {
    it('should disable workflow successfully', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.success({ ...mockWorkflow, is_active: false }))

      const result = await workflowTools.workflow_disable.handler({
        user_id: testUserId,
        workflow_id: mockWorkflow.id,
      })

      const data = expectSuccessWithData<{ message: string; workflow: { is_active: boolean } }>(result)
      expect(data.message).toContain('disabled')
      expect(data.workflow.is_active).toBe(false)
    })

    it('should return error when workflow not found', async () => {
      supabaseMock.setQueryResult('workflows', mockResults.notFound())

      const result = await workflowTools.workflow_disable.handler({
        user_id: testUserId,
        workflow_id: 'non-existent',
      })

      expectError(result, 'Workflow not found')
    })
  })
})
