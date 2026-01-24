/**
 * Tests for projects/departments tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { departmentTools } from '../../../tools/projects/departments.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess, mockDeniedAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectAccessDenied,
  expectListResult,
} from '../../helpers/response-validators.js'
import { mockDepartment, mockDepartmentList, testWorkspaceId } from '../../fixtures/projects.js'

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

describe('projects/departments tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // department_list
  // ============================================
  describe('department_list', () => {
    it('should list departments successfully', async () => {
      supabaseMock.setQueryResult('departments', mockResults.success(mockDepartmentList))

      const result = await departmentTools.department_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'departments', countKey: 'count' })
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await departmentTools.department_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('departments', mockResults.error('Connection failed'))

      const result = await departmentTools.department_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // department_get
  // ============================================
  describe('department_get', () => {
    it('should get department by ID', async () => {
      supabaseMock.setQueryResult('departments', mockResults.success(mockDepartment))

      const result = await departmentTools.department_get.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('departments', mockResults.notFound())

      const result = await departmentTools.department_get.handler({
        workspace_id: testWorkspaceId,
        department_id: 'non-existent',
      })

      expectError(result, 'Department not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await departmentTools.department_get.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // department_create
  // ============================================
  describe('department_create', () => {
    it('should create department successfully', async () => {
      supabaseMock.setQueryResultOnce('departments', mockResults.success([{ position: 0 }]))
      supabaseMock.setQueryResultOnce('departments', mockResults.success(mockDepartment))

      const result = await departmentTools.department_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Engineering',
      })

      const data = expectSuccessWithData<{ message: string; department: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await departmentTools.department_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Engineering',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResultOnce('departments', mockResults.success([]))
      supabaseMock.setQueryResultOnce('departments', mockResults.error('Insert failed'))

      const result = await departmentTools.department_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Engineering',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // department_update
  // ============================================
  describe('department_update', () => {
    it('should update department successfully', async () => {
      supabaseMock.setQueryResultOnce('departments', mockResults.success({ id: mockDepartment.id }))
      supabaseMock.setQueryResultOnce('departments', mockResults.success({ ...mockDepartment, name: 'Updated' }))

      const result = await departmentTools.department_update.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
        name: 'Updated',
      })

      const data = expectSuccessWithData<{ message: string; department: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('departments', mockResults.notFound())

      const result = await departmentTools.department_update.handler({
        workspace_id: testWorkspaceId,
        department_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Department not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('departments', mockResults.success({ id: mockDepartment.id }))

      const result = await departmentTools.department_update.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await departmentTools.department_update.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
        name: 'Updated',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // department_delete
  // ============================================
  describe('department_delete', () => {
    it('should delete department successfully', async () => {
      supabaseMock.setQueryResultOnce('departments', mockResults.success({ id: mockDepartment.id }))
      supabaseMock.setQueryResultOnce('departments', mockResults.success(null))

      const result = await departmentTools.department_delete.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
      })

      const data = expectSuccessWithData<{ message: string; department_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.department_id).toBe(mockDepartment.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('departments', mockResults.notFound())

      const result = await departmentTools.department_delete.handler({
        workspace_id: testWorkspaceId,
        department_id: 'non-existent',
      })

      expectError(result, 'Department not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await departmentTools.department_delete.handler({
        workspace_id: testWorkspaceId,
        department_id: mockDepartment.id,
      })

      expectAccessDenied(result)
    })
  })
})
