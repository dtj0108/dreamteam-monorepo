/**
 * Tests for projects/tasks tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { taskTools } from '../../../tools/projects/tasks.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockTask, mockTaskList, mockTaskAssignee, mockTaskComment, mockTaskDependency, testWorkspaceId } from '../../fixtures/projects.js'

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

describe('projects/tasks tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // task_list
  // ============================================
  describe('task_list', () => {
    it('should list tasks successfully', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTaskList))

      const result = await taskTools.task_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'tasks', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.error('Connection failed'))

      const result = await taskTools.task_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // task_get
  // ============================================
  describe('task_get', () => {
    it('should get task by ID', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))

      const result = await taskTools.task_get.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_get.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_get.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_create
  // ============================================
  describe('task_create', () => {
    it('should create task successfully', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: 'project-123' }))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success([{ position: 0 }]))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))

      const result = await taskTools.task_create.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
        title: 'New Task',
      })

      const data = expectSuccessWithData<{ message: string; task: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await taskTools.task_create.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
        title: 'New Task',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_create.handler({
        workspace_id: testWorkspaceId,
        project_id: 'project-123',
        title: 'New Task',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_update
  // ============================================
  describe('task_update', () => {
    it('should update task successfully', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success({ ...mockTask, title: 'Updated' }))

      const result = await taskTools.task_update.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        title: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; task: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_update.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        title: 'Updated',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))

      const result = await taskTools.task_update.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_update.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        title: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_delete
  // ============================================
  describe('task_delete', () => {
    it('should delete task successfully', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(null))

      const result = await taskTools.task_delete.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      const data = expectSuccessWithData<{ message: string; task_id: string }>(result)
      expect(data.message).toContain('deleted')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_delete.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_delete.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_assign
  // ============================================
  describe('task_assign', () => {
    it('should assign task successfully', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('workspace_members', mockResults.success({ id: 'member-456' }))
      supabaseMock.setQueryResultOnce('task_assignees', mockResults.notFound())
      supabaseMock.setQueryResultOnce('task_assignees', mockResults.success(mockTaskAssignee))

      const result = await taskTools.task_assign.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        assignee_id: 'user-456',
      })

      const data = expectSuccessWithData<{ message: string; assignment: unknown }>(result)
      expect(data.message).toContain('assigned')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_assign.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        assignee_id: 'user-456',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when user not in workspace', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await taskTools.task_assign.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        assignee_id: 'non-existent',
      })

      expectError(result, 'not a member of this workspace')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_assign.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        assignee_id: 'user-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_unassign
  // ============================================
  describe('task_unassign', () => {
    it('should unassign task successfully', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('task_assignees', mockResults.success(null))

      const result = await taskTools.task_unassign.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        assignee_id: 'user-456',
      })

      const data = expectSuccessWithData<{ message: string; task_id: string }>(result)
      expect(data.message).toContain('unassigned')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_unassign.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        assignee_id: 'user-456',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_unassign.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        assignee_id: 'user-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_change_status
  // ============================================
  describe('task_change_status', () => {
    it('should change task status', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success({ ...mockTask, status: 'done' }))

      const result = await taskTools.task_change_status.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        status: 'done',
      })

      const data = expectSuccessWithData<{ message: string; task: unknown }>(result)
      expect(data.message).toContain('changed')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_change_status.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        status: 'done',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_change_status.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        status: 'done',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_add_dependency
  // ============================================
  describe('task_add_dependency', () => {
    it('should add dependency successfully', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success({ ...mockTask, id: 'task-456' }))
      supabaseMock.setQueryResult('task_dependencies', mockResults.success(mockTaskDependency))

      const result = await taskTools.task_add_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        depends_on_task_id: 'task-456',
      })

      const data = expectSuccessWithData<{ message: string; dependency: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_add_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        depends_on_task_id: 'task-456',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when depends on self', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))

      const result = await taskTools.task_add_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        depends_on_task_id: mockTask.id,
      })

      expectError(result, 'cannot depend on itself')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_add_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        depends_on_task_id: 'task-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_remove_dependency
  // ============================================
  describe('task_remove_dependency', () => {
    it('should remove dependency successfully', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('task_dependencies', mockResults.success(null))

      const result = await taskTools.task_remove_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        depends_on_task_id: 'task-456',
      })

      const data = expectSuccessWithData<{ message: string; task_id: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_remove_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        depends_on_task_id: 'task-456',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_remove_dependency.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        depends_on_task_id: 'task-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_add_label
  // ============================================
  describe('task_add_label', () => {
    it('should add label successfully', async () => {
      supabaseMock.setQueryResultOnce('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('project_labels', mockResults.success({ id: 'label-123' }))
      supabaseMock.setQueryResult('task_labels', mockResults.success({ id: 'task-label-123' }))

      const result = await taskTools.task_add_label.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        label_id: 'label-123',
      })

      const data = expectSuccessWithData<{ message: string; task_label: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_add_label.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        label_id: 'label-123',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_add_label.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        label_id: 'label-123',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_remove_label
  // ============================================
  describe('task_remove_label', () => {
    it('should remove label successfully', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('task_labels', mockResults.success(null))

      const result = await taskTools.task_remove_label.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        label_id: 'label-123',
      })

      const data = expectSuccessWithData<{ message: string; task_id: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_remove_label.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        label_id: 'label-123',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_remove_label.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        label_id: 'label-123',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_add_comment
  // ============================================
  describe('task_add_comment', () => {
    it('should add comment successfully', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('task_comments', mockResults.success(mockTaskComment))

      const result = await taskTools.task_add_comment.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        content: 'Great progress!',
      })

      const data = expectSuccessWithData<{ message: string; comment: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_add_comment.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
        content: 'Great progress!',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_add_comment.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
        content: 'Great progress!',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_get_comments
  // ============================================
  describe('task_get_comments', () => {
    it('should get comments successfully', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success(mockTask))
      supabaseMock.setQueryResult('task_comments', mockResults.success([mockTaskComment]))

      const result = await taskTools.task_get_comments.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      const data = expectSuccessWithData<{ comments: unknown[]; count: number }>(result)
      expect(data.count).toBe(1)
    })

    it('should return error when task not found', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.notFound())

      const result = await taskTools.task_get_comments.handler({
        workspace_id: testWorkspaceId,
        task_id: 'non-existent',
      })

      expectError(result, 'Task not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_get_comments.handler({
        workspace_id: testWorkspaceId,
        task_id: mockTask.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_get_my_tasks
  // ============================================
  describe('task_get_my_tasks', () => {
    it('should get my tasks', async () => {
      supabaseMock.setQueryResult('task_assignees', mockResults.success([{ task_id: 'task-123' }]))
      supabaseMock.setQueryResult('tasks', mockResults.success([mockTask]))

      const result = await taskTools.task_get_my_tasks.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'tasks', countKey: 'count' })
    })

    it('should return empty when no tasks assigned', async () => {
      supabaseMock.setQueryResult('task_assignees', mockResults.success([]))

      const result = await taskTools.task_get_my_tasks.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ tasks: unknown[]; count: number }>(result)
      expect(data.count).toBe(0)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_get_my_tasks.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // task_get_overdue
  // ============================================
  describe('task_get_overdue', () => {
    it('should get overdue tasks', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.success([mockTask]))

      const result = await taskTools.task_get_overdue.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'tasks', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await taskTools.task_get_overdue.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('tasks', mockResults.error('Connection failed'))

      const result = await taskTools.task_get_overdue.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })
})
