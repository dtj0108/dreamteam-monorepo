/**
 * Tests for crm/pipelines tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pipelineTools } from '../../../tools/crm/pipelines.js'
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
import { mockPipeline, mockPipelineList, mockStage, mockStageList, testWorkspaceId } from '../../fixtures/crm.js'

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

describe('crm/pipelines tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // pipeline_list
  // ============================================
  describe('pipeline_list', () => {
    it('should list pipelines successfully', async () => {
      const pipelinesWithStages = mockPipelineList.map(p => ({
        ...p,
        stages: mockStageList.filter(s => s.pipeline_id === p.id),
      }))
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success(pipelinesWithStages))

      const result = await pipelineTools.pipeline_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'pipelines', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.error('Connection failed'))

      const result = await pipelineTools.pipeline_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // pipeline_get
  // ============================================
  describe('pipeline_get', () => {
    it('should get pipeline by ID', async () => {
      const pipelineWithStages = {
        ...mockPipeline,
        stages: mockStageList,
      }
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success(pipelineWithStages))
      supabaseMock.setQueryResult('leads', mockResults.success([]))

      const result = await pipelineTools.pipeline_get.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.notFound())

      const result = await pipelineTools.pipeline_get.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: 'non-existent',
      })

      expectNotFound(result, 'Pipeline')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_get.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // pipeline_create
  // ============================================
  describe('pipeline_create', () => {
    it('should create pipeline successfully', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success(mockPipeline))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success(mockStageList))

      const result = await pipelineTools.pipeline_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Sales Pipeline',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'pipeline' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Sales Pipeline',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.error('Constraint violation'))

      const result = await pipelineTools.pipeline_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Sales Pipeline',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // pipeline_update
  // ============================================
  describe('pipeline_update', () => {
    it('should update pipeline successfully', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: mockPipeline.id, stages: [] }))

      const result = await pipelineTools.pipeline_update.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        name: 'Updated Pipeline',
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'pipeline' })
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: mockPipeline.id }))

      const result = await pipelineTools.pipeline_update.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.notFound())

      const result = await pipelineTools.pipeline_update.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: 'non-existent',
        name: 'Updated',
      })

      expectNotFound(result, 'Pipeline')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_update.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // pipeline_delete
  // ============================================
  describe('pipeline_delete', () => {
    it('should delete pipeline successfully', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: mockPipeline.id }))
      supabaseMock.setQueryResult('leads', mockResults.success([]))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success(null))

      const result = await pipelineTools.pipeline_delete.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
      })

      expectDeleteResult(result, 'pipeline_id')
    })

    it('should return error when pipeline has leads', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: mockPipeline.id }))
      supabaseMock.setQueryResult('leads', mockResults.success([{ id: 'lead-1' }]))

      const result = await pipelineTools.pipeline_delete.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
      })

      expectError(result, 'Cannot delete pipeline')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.notFound())

      const result = await pipelineTools.pipeline_delete.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: 'non-existent',
      })

      expectNotFound(result, 'Pipeline')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_delete.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // pipeline_add_stage
  // ============================================
  describe('pipeline_add_stage', () => {
    it('should add stage to pipeline', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: mockPipeline.id }))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success(mockStage))

      const result = await pipelineTools.pipeline_add_stage.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        name: 'New Stage',
      })

      expectMutationResult(result, { messageContains: 'added', entityKey: 'stage' })
    })

    it('should return error when pipeline not found', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.notFound())

      const result = await pipelineTools.pipeline_add_stage.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: 'non-existent',
        name: 'New Stage',
      })

      expectNotFound(result, 'Pipeline')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_add_stage.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        name: 'New Stage',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success({ id: mockPipeline.id }))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.error('Insert failed'))

      const result = await pipelineTools.pipeline_add_stage.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        name: 'New Stage',
      })

      expectError(result, 'Failed to add')
    })
  })

  // ============================================
  // pipeline_update_stage
  // ============================================
  describe('pipeline_update_stage', () => {
    it('should update stage successfully', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success({
        id: mockStage.id,
        pipeline: { id: mockPipeline.id, user_id: 'test-user-id' },
      }))

      const result = await pipelineTools.pipeline_update_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: mockStage.id,
        name: 'Updated Stage',
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'stage' })
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success({
        id: mockStage.id,
        pipeline: { id: mockPipeline.id, user_id: 'test-user-id' },
      }))

      const result = await pipelineTools.pipeline_update_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: mockStage.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.notFound())

      const result = await pipelineTools.pipeline_update_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: 'non-existent',
        name: 'Updated',
      })

      expectNotFound(result, 'Stage')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_update_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: mockStage.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // pipeline_delete_stage
  // ============================================
  describe('pipeline_delete_stage', () => {
    it('should delete stage successfully', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success({
        id: mockStage.id,
        pipeline: { id: mockPipeline.id, user_id: 'test-user-id' },
      }))
      supabaseMock.setQueryResult('leads', mockResults.success([]))

      const result = await pipelineTools.pipeline_delete_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: mockStage.id,
      })

      expectDeleteResult(result, 'stage_id')
    })

    it('should return error when stage has leads', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success({
        id: mockStage.id,
        pipeline: { id: mockPipeline.id, user_id: 'test-user-id' },
      }))
      supabaseMock.setQueryResult('leads', mockResults.success([{ id: 'lead-1' }]))

      const result = await pipelineTools.pipeline_delete_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: mockStage.id,
      })

      expectError(result, 'Cannot delete stage')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.notFound())

      const result = await pipelineTools.pipeline_delete_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: 'non-existent',
      })

      expectNotFound(result, 'Stage')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_delete_stage.handler({
        workspace_id: testWorkspaceId,
        stage_id: mockStage.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // pipeline_reorder_stages
  // ============================================
  describe('pipeline_reorder_stages', () => {
    it('should reorder stages successfully', async () => {
      const pipelineWithStages = {
        ...mockPipeline,
        stages: mockStageList,
      }
      supabaseMock.setQueryResult('lead_pipelines', mockResults.success(pipelineWithStages))
      supabaseMock.setQueryResult('lead_pipeline_stages', mockResults.success(null))

      const result = await pipelineTools.pipeline_reorder_stages.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        stage_ids: ['stage-456', 'stage-123', 'stage-789'],
      })

      expectMutationResult(result, { messageContains: 'reordered', entityKey: 'pipeline' })
    })

    it('should return error when pipeline not found', async () => {
      supabaseMock.setQueryResult('lead_pipelines', mockResults.notFound())

      const result = await pipelineTools.pipeline_reorder_stages.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: 'non-existent',
        stage_ids: ['stage-1', 'stage-2'],
      })

      expectNotFound(result, 'Pipeline')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await pipelineTools.pipeline_reorder_stages.handler({
        workspace_id: testWorkspaceId,
        pipeline_id: mockPipeline.id,
        stage_ids: ['stage-1', 'stage-2'],
      })

      expectAccessDenied(result)
    })
  })
})
