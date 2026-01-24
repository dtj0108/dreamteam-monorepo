/**
 * Tests for projects/projects tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { projectTools } from '../../../tools/projects/projects.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockProject, mockProjectList, mockProjectMember, testWorkspaceId } from '../../fixtures/projects.js'

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

describe('projects/projects tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // project_list
  // ============================================
  describe('project_list', () => {
    it('should list projects successfully', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success(mockProjectList))

      const result = await projectTools.project_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'projects', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('projects', mockResults.error('Connection failed'))

      const result = await projectTools.project_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // project_get
  // ============================================
  describe('project_get', () => {
    it('should get project by ID', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success(mockProject))

      const result = await projectTools.project_get.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_get.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_get.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_create
  // ============================================
  describe('project_create', () => {
    it('should create project successfully', async () => {
      supabaseMock.setQueryResultOnce('projects', mockResults.success(mockProject))
      supabaseMock.setQueryResult('project_members', mockResults.success(mockProjectMember))

      const result = await projectTools.project_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Project',
      })

      const data = expectSuccessWithData<{ message: string; project: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should create project with department', async () => {
      supabaseMock.setQueryResult('departments', mockResults.success({ id: 'department-123' }))
      supabaseMock.setQueryResultOnce('projects', mockResults.success(mockProject))
      supabaseMock.setQueryResult('project_members', mockResults.success(mockProjectMember))

      const result = await projectTools.project_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Project',
        department_id: 'department-123',
      })

      const data = expectSuccessWithData<{ message: string; project: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when department not found', async () => {
      supabaseMock.setQueryResult('departments', mockResults.notFound())

      const result = await projectTools.project_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Project',
        department_id: 'non-existent',
      })

      expectError(result, 'Department not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Project',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_update
  // ============================================
  describe('project_update', () => {
    it('should update project successfully', async () => {
      supabaseMock.setQueryResultOnce('projects', mockResults.success({ id: mockProject.id }))
      supabaseMock.setQueryResultOnce('projects', mockResults.success({ ...mockProject, name: 'Updated' }))

      const result = await projectTools.project_update.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        name: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; project: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_update.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id }))

      const result = await projectTools.project_update.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_update.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_delete
  // ============================================
  describe('project_delete', () => {
    it('should delete project successfully', async () => {
      supabaseMock.setQueryResultOnce('projects', mockResults.success({ id: mockProject.id }))
      supabaseMock.setQueryResultOnce('projects', mockResults.success(null))

      const result = await projectTools.project_delete.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      const data = expectSuccessWithData<{ message: string; project_id: string }>(result)
      expect(data.message).toContain('deleted')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_delete.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_delete.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_archive
  // ============================================
  describe('project_archive', () => {
    it('should archive project successfully', async () => {
      supabaseMock.setQueryResultOnce('projects', mockResults.success({ id: mockProject.id, status: 'active' }))
      supabaseMock.setQueryResultOnce('projects', mockResults.success({ ...mockProject, status: 'archived' }))

      const result = await projectTools.project_archive.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      const data = expectSuccessWithData<{ message: string; project: unknown }>(result)
      expect(data.message).toContain('archived')
    })

    it('should return error when already archived', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id, status: 'archived' }))

      const result = await projectTools.project_archive.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectError(result, 'already archived')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_archive.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_archive.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_add_member
  // ============================================
  describe('project_add_member', () => {
    it('should add member to project', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id }))
      supabaseMock.setQueryResult('workspace_members', mockResults.success({ id: 'ws-member-456' }))
      supabaseMock.setQueryResultOnce('project_members', mockResults.notFound())
      supabaseMock.setQueryResultOnce('project_members', mockResults.success(mockProjectMember))

      const result = await projectTools.project_add_member.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        user_id: 'user-456',
      })

      const data = expectSuccessWithData<{ message: string; member: unknown }>(result)
      expect(data.message).toContain('added')
    })

    it('should return error when user not in workspace', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id }))
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await projectTools.project_add_member.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        user_id: 'non-existent',
      })

      expectError(result, 'not a member of this workspace')
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_add_member.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
        user_id: 'user-456',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_add_member.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        user_id: 'user-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_remove_member
  // ============================================
  describe('project_remove_member', () => {
    it('should remove member from project', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id, owner_id: 'different-user' }))
      supabaseMock.setQueryResult('project_members', mockResults.success(null))

      const result = await projectTools.project_remove_member.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        user_id: 'user-456',
      })

      const data = expectSuccessWithData<{ message: string; project_id: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when trying to remove owner', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id, owner_id: 'user-456' }))

      const result = await projectTools.project_remove_member.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        user_id: 'user-456',
      })

      expectError(result, 'Cannot remove the project owner')
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_remove_member.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
        user_id: 'user-456',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_remove_member.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
        user_id: 'user-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_get_members
  // ============================================
  describe('project_get_members', () => {
    it('should get project members', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id }))
      supabaseMock.setQueryResult('project_members', mockResults.success([mockProjectMember]))

      const result = await projectTools.project_get_members.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      const data = expectSuccessWithData<{ members: unknown[]; count: number }>(result)
      expect(data.count).toBe(1)
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_get_members.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_get_members.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_get_progress
  // ============================================
  describe('project_get_progress', () => {
    it('should get project progress', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success(mockProject))
      supabaseMock.setQueryResult('tasks', mockResults.success([
        { status: 'done' },
        { status: 'in_progress' },
        { status: 'todo' },
      ]))
      supabaseMock.setQueryResult('milestones', mockResults.success([{ status: 'upcoming' }]))

      const result = await projectTools.project_get_progress.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      const data = expectSuccessWithData<{ completion_percentage: number; tasks: unknown }>(result)
      expect(data.completion_percentage).toBe(33) // 1/3 done
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_get_progress.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_get_progress.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // project_get_activity
  // ============================================
  describe('project_get_activity', () => {
    it('should get project activity', async () => {
      supabaseMock.setQueryResult('projects', mockResults.success({ id: mockProject.id }))
      supabaseMock.setQueryResult('project_activity', mockResults.success([]))

      const result = await projectTools.project_get_activity.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      const data = expectSuccessWithData<{ activities: unknown[]; count: number }>(result)
      expect(data.count).toBe(0)
    })

    it('should return error when project not found', async () => {
      supabaseMock.setQueryResult('projects', mockResults.notFound())

      const result = await projectTools.project_get_activity.handler({
        workspace_id: testWorkspaceId,
        project_id: 'non-existent',
      })

      expectError(result, 'Project not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await projectTools.project_get_activity.handler({
        workspace_id: testWorkspaceId,
        project_id: mockProject.id,
      })

      expectAccessDenied(result)
    })
  })
})
