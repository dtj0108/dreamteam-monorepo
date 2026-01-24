/**
 * Tests for team/workspace tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workspaceTools } from '../../../tools/team/workspace.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockWorkspace, mockWorkspaceMember, mockWorkspaceMemberList, testWorkspaceId } from '../../fixtures/team.js'

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

describe('team/workspace tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    // Use admin access for most tests since many workspace operations require admin/owner
    mockValidAccess(vi.mocked(validateWorkspaceAccess), 'admin')
  })

  // ============================================
  // workspace_get
  // ============================================
  describe('workspace_get', () => {
    it('should get workspace details', async () => {
      supabaseMock.setQueryResultOnce('workspaces', mockResults.success(mockWorkspace))
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success([]))

      const result = await workspaceTools.workspace_get.handler({
        workspace_id: testWorkspaceId,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('workspaces', mockResults.notFound())

      const result = await workspaceTools.workspace_get.handler({
        workspace_id: 'non-existent',
      })

      expectError(result, 'Workspace not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_get.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // workspace_update
  // ============================================
  describe('workspace_update', () => {
    it('should update workspace successfully', async () => {
      supabaseMock.setQueryResult('workspaces', mockResults.success({ ...mockWorkspace, name: 'Updated Workspace' }))

      const result = await workspaceTools.workspace_update.handler({
        workspace_id: testWorkspaceId,
        name: 'Updated Workspace',
      })

      const data = expectSuccessWithData<{ message: string; workspace: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when no fields to update', async () => {
      const result = await workspaceTools.workspace_update.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not admin/owner', async () => {
      mockValidAccess(vi.mocked(validateWorkspaceAccess), 'member')

      const result = await workspaceTools.workspace_update.handler({
        workspace_id: testWorkspaceId,
        name: 'Updated',
      })

      expectError(result, 'Only admins and owners')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_update.handler({
        workspace_id: testWorkspaceId,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // workspace_member_list
  // ============================================
  describe('workspace_member_list', () => {
    it('should list workspace members', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.success(mockWorkspaceMemberList))

      const result = await workspaceTools.workspace_member_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'members', countKey: 'count' })
    })

    it('should filter by role', async () => {
      const admins = mockWorkspaceMemberList.filter(m => m.role === 'admin')
      supabaseMock.setQueryResult('workspace_members', mockResults.success(admins))

      const result = await workspaceTools.workspace_member_list.handler({
        workspace_id: testWorkspaceId,
        role: 'admin',
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_member_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.error('Connection failed'))

      const result = await workspaceTools.workspace_member_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // workspace_member_get
  // ============================================
  describe('workspace_member_get', () => {
    it('should get member by ID', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.success(mockWorkspaceMember))

      const result = await workspaceTools.workspace_member_get.handler({
        workspace_id: testWorkspaceId,
        member_id: mockWorkspaceMember.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await workspaceTools.workspace_member_get.handler({
        workspace_id: testWorkspaceId,
        member_id: 'non-existent',
      })

      expectError(result, 'Member not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_member_get.handler({
        workspace_id: testWorkspaceId,
        member_id: mockWorkspaceMember.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // workspace_member_invite
  // ============================================
  describe('workspace_member_invite', () => {
    it('should invite member successfully', async () => {
      supabaseMock.setQueryResult('profiles', mockResults.success({ id: 'user-new', name: 'New User', email: 'new@example.com' }))
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.notFound()) // Not already a member
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success(mockWorkspaceMember))

      const result = await workspaceTools.workspace_member_invite.handler({
        workspace_id: testWorkspaceId,
        email: 'new@example.com',
      })

      const data = expectSuccessWithData<{ message: string; member: unknown }>(result)
      expect(data.message).toContain('invited')
    })

    it('should return error when user not found', async () => {
      supabaseMock.setQueryResult('profiles', mockResults.notFound())

      const result = await workspaceTools.workspace_member_invite.handler({
        workspace_id: testWorkspaceId,
        email: 'unknown@example.com',
      })

      expectError(result, 'User not found')
    })

    it('should return error when not admin/owner', async () => {
      mockValidAccess(vi.mocked(validateWorkspaceAccess), 'member')

      const result = await workspaceTools.workspace_member_invite.handler({
        workspace_id: testWorkspaceId,
        email: 'new@example.com',
      })

      expectError(result, 'Only admins and owners')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_member_invite.handler({
        workspace_id: testWorkspaceId,
        email: 'new@example.com',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // workspace_member_update_role
  // ============================================
  describe('workspace_member_update_role', () => {
    it('should update member role', async () => {
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success({ id: 'ws-member-456', role: 'member', profile_id: 'user-456' }))
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success({ ...mockWorkspaceMember, role: 'admin' }))

      const result = await workspaceTools.workspace_member_update_role.handler({
        workspace_id: testWorkspaceId,
        member_id: 'ws-member-456',
        role: 'admin',
      })

      const data = expectSuccessWithData<{ message: string; old_role: string; new_role: string }>(result)
      expect(data.message).toContain('updated')
      expect(data.new_role).toBe('admin')
    })

    it('should return error when member not found', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await workspaceTools.workspace_member_update_role.handler({
        workspace_id: testWorkspaceId,
        member_id: 'non-existent',
        role: 'admin',
      })

      expectError(result, 'Member not found')
    })

    it('should return error when not admin/owner', async () => {
      mockValidAccess(vi.mocked(validateWorkspaceAccess), 'member')

      const result = await workspaceTools.workspace_member_update_role.handler({
        workspace_id: testWorkspaceId,
        member_id: 'ws-member-456',
        role: 'admin',
      })

      expectError(result, 'Only admins and owners')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_member_update_role.handler({
        workspace_id: testWorkspaceId,
        member_id: 'ws-member-456',
        role: 'admin',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // workspace_member_remove
  // ============================================
  describe('workspace_member_remove', () => {
    it('should remove member successfully', async () => {
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success({ id: 'ws-member-456', role: 'member' }))
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success(null))

      const result = await workspaceTools.workspace_member_remove.handler({
        workspace_id: testWorkspaceId,
        member_id: 'ws-member-456',
      })

      const data = expectSuccessWithData<{ message: string; member_id: string }>(result)
      expect(data.message).toContain('removed')
    })

    it('should return error when trying to remove owner', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.success({ id: 'ws-member-789', role: 'owner' }))

      const result = await workspaceTools.workspace_member_remove.handler({
        workspace_id: testWorkspaceId,
        member_id: 'ws-member-789',
      })

      expectError(result, 'Cannot remove the workspace owner')
    })

    it('should return error when member not found', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await workspaceTools.workspace_member_remove.handler({
        workspace_id: testWorkspaceId,
        member_id: 'non-existent',
      })

      expectError(result, 'Member not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_member_remove.handler({
        workspace_id: testWorkspaceId,
        member_id: 'ws-member-456',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // workspace_member_set_status
  // ============================================
  describe('workspace_member_set_status', () => {
    it('should set member status', async () => {
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success({ id: mockWorkspaceMember.id, profile_id: 'test-user-id' }))
      supabaseMock.setQueryResultOnce('workspace_members', mockResults.success({ ...mockWorkspaceMember, status: 'away' }))

      const result = await workspaceTools.workspace_member_set_status.handler({
        workspace_id: testWorkspaceId,
        member_id: mockWorkspaceMember.id,
        status: 'away',
      })

      const data = expectSuccessWithData<{ message: string; member: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when member not found', async () => {
      supabaseMock.setQueryResult('workspace_members', mockResults.notFound())

      const result = await workspaceTools.workspace_member_set_status.handler({
        workspace_id: testWorkspaceId,
        member_id: 'non-existent',
        status: 'away',
      })

      expectError(result, 'Member not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await workspaceTools.workspace_member_set_status.handler({
        workspace_id: testWorkspaceId,
        member_id: mockWorkspaceMember.id,
        status: 'away',
      })

      expectAccessDenied(result)
    })
  })
})
