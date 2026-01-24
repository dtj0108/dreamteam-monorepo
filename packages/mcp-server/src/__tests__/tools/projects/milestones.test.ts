/**
 * Tests for projects/milestones tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { milestoneTools } from '../../../tools/projects/milestones.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockMilestone, mockMilestoneList, mockMilestoneTask, testWorkspaceId } from '../../fixtures/projects.js'

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

describe('projects/milestones tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // milestone_list
  // ============================================
  describe('milestone_list', () => {
    it('should list milestones successfully', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: 'project-123' }))
      supabaseMock.setQueryResult('milestones', mockResults.success(mockMilestoneList))

      const result = await milestoneTools.milestone_list.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
      })

      expectListResult(result, { itemsKey: 'milestones', countKey: 'count' })
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await milestoneTools.milestone_list.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_list.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: 'project-123' }))
      supabaseMock.setQueryResult('milestones', mockResults.error('Connection failed'))

      const result = await milestoneTools.milestone_list.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // milestone_get
  // ============================================
  describe('milestone_get', () => {
    it('should get milestone by ID', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.success(mockMilestone))

      const result = await milestoneTools.milestone_get.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.notFound())

      const result = await milestoneTools.milestone_get.handler({
        workspace_id: testWorkspaceId,
        milestone_id: 'non-existent',
      })

      expectError(result, 'Milestone not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_get.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // milestone_create
  // ============================================
  describe('milestone_create', () => {
    it('should create milestone successfully', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: 'project-123' }))
      supabaseMock.setQueryResult('milestones', mockResults.success(mockMilestone))

      const result = await milestoneTools.milestone_create.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
        name: 'Phase 1',
        target_date: '2024-03-31',
      })

      const data = expectSuccessWithData<{ message: string; milestone: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await milestoneTools.milestone_create.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
        name: 'Phase 1',
        target_date: '2024-03-31',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_create.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
        name: 'Phase 1',
        target_date: '2024-03-31',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // milestone_update
  // ============================================
  describe('milestone_update', () => {
    it('should update milestone successfully', async () => {
      supabaseMock.setQueryResultOnce('milestones', mockResults.success(mockMilestone))
      supabaseMock.setQueryResultOnce('milestones', mockResults.success({ ...mockMilestone, name: 'Updated' }))

      const result = await milestoneTools.milestone_update.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        name: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; milestone: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.notFound())

      const result = await milestoneTools.milestone_update.handler({
        workspace_id: testWorkspaceId,
        milestone_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Milestone not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.success(mockMilestone))

      const result = await milestoneTools.milestone_update.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_update.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // milestone_delete
  // ============================================
  describe('milestone_delete', () => {
    it('should delete milestone successfully', async () => {
      supabaseMock.setQueryResultOnce('milestones', mockResults.success(mockMilestone))
      supabaseMock.setQueryResultOnce('milestones', mockResults.success(null))

      const result = await milestoneTools.milestone_delete.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      const data = expectSuccessWithData<{ message: string; milestone_id: string }>(result)
      expect(data.message).toContain('deleted')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.notFound())

      const result = await milestoneTools.milestone_delete.handler({
        workspace_id: testWorkspaceId,
        milestone_id: 'non-existent',
      })

      expectError(result, 'Milestone not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_delete.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // milestone_add_task
  // ============================================
  describe('milestone_add_task', () => {
    it('should add task to milestone', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.success({ ...mockMilestone, project_id: 'project-123' }))
      supabaseMock.setQueryResult('tasks', mockResults.success({ id: 'task-123' }))
      supabaseMock.setQueryResultOnce('milestone_tasks', mockResults.notFound())
      supabaseMock.setQueryResultOnce('milestone_tasks', mockResults.success(mockMilestoneTask))

      const result = await milestoneTools.milestone_add_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        task_id: 'task-123',
      })

      const data = expectSuccessWithData<{ message: string; milestone_task: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when milestone not found', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.notFound())

      const result = await milestoneTools.milestone_add_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: 'non-existent',
        task_id: 'task-123',
      })

      expectError(result, 'Milestone not found')
    })

    it('should return error when task not in same project', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.success({ ...mockMilestone, project_id: 'project-123' }))
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await milestoneTools.milestone_add_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        task_id: 'task-from-other-project',
      })

      expectError(result, 'Task not found in the same project')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_add_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        task_id: 'task-123',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // milestone_remove_task
  // ============================================
  describe('milestone_remove_task', () => {
    it('should remove task from milestone', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.success(mockMilestone))
      supabaseMock.setQueryResult('milestone_tasks', mockResults.success(null))

      const result = await milestoneTools.milestone_remove_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        task_id: 'task-123',
      })

      const data = expectSuccessWithData<{ message: string; milestone_id: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when milestone not found', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.notFound())

      const result = await milestoneTools.milestone_remove_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: 'non-existent',
        task_id: 'task-123',
      })

      expectError(result, 'Milestone not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_remove_task.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
        task_id: 'task-123',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // milestone_get_progress
  // ============================================
  describe('milestone_get_progress', () => {
    it('should get milestone progress', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.success({
        ...mockMilestone,
        tasks: [
          { task: { id: 'task-1', status: 'done' } },
          { task: { id: 'task-2', status: 'in_progress' } },
        ],
      }))

      const result = await milestoneTools.milestone_get_progress.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      const data = expectSuccessWithData<{ completion_percentage: number; tasks: unknown }>(result)
      expect(data.completion_percentage).toBe(50)
    })

    it('should return error when milestone not found', async () => {
      supabaseMock.setQueryResult('milestones', mockResults.notFound())

      const result = await milestoneTools.milestone_get_progress.handler({
        workspace_id: testWorkspaceId,
        milestone_id: 'non-existent',
      })

      expectError(result, 'Milestone not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await milestoneTools.milestone_get_progress.handler({
        workspace_id: testWorkspaceId,
        milestone_id: mockMilestone.id,
      })

      expectAccessDenied(result)
    })
  })
})
