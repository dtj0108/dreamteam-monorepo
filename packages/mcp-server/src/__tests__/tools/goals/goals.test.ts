/**
 * Tests for goals/goals tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { goalTools } from '../../../tools/goals/goals.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockGoal,
  mockGoalList,
  testProfileId,
} from '../../fixtures/goals.js'

vi.mock('../../../auth.js', () => ({
  getSupabase: vi.fn(),
}))

vi.mock('../../../lib/context.js', () => ({
  resolveWorkspaceId: vi.fn(() => 'workspace-123'),
  getWorkspaceId: vi.fn(() => 'workspace-123'),
  getUserId: vi.fn(() => 'test-user-id'),
  getAuthenticatedUserId: vi.fn(() => 'test-user-id'),
}))

import { getSupabase } from '../../../auth.js'

describe('goals/goals tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // goal_list
  // ============================================
  describe('goal_list', () => {
    it('should list goals successfully', async () => {
      supabaseMock.setQueryResult('goals', mockResults.success(mockGoalList))

      const result = await goalTools.goal_list.handler({
        profile_id: testProfileId,
      })

      expectListResult(result, { itemsKey: 'goals', countKey: 'count' })
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('goals', mockResults.error('Connection failed'))

      const result = await goalTools.goal_list.handler({
        profile_id: testProfileId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // goal_get
  // ============================================
  describe('goal_get', () => {
    it('should get goal by ID', async () => {
      supabaseMock.setQueryResult('goals', mockResults.success(mockGoal))

      const result = await goalTools.goal_get.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
      })

      const data = expectSuccessWithData<{ progress_percent: number }>(result)
      expect(data.progress_percent).toBe(45)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('goals', mockResults.notFound())

      const result = await goalTools.goal_get.handler({
        profile_id: testProfileId,
        goal_id: 'non-existent',
      })

      expectError(result, 'Goal not found')
    })
  })

  // ============================================
  // goal_create
  // ============================================
  describe('goal_create', () => {
    it('should create goal successfully', async () => {
      supabaseMock.setQueryResult('goals', mockResults.success(mockGoal))

      const result = await goalTools.goal_create.handler({
        profile_id: testProfileId,
        name: 'Revenue Target Q1',
        type: 'revenue',
        target_amount: 100000,
        target_date: '2024-03-31',
      })

      const data = expectSuccessWithData<{ message: string; goal: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('goals', mockResults.error('Insert failed'))

      const result = await goalTools.goal_create.handler({
        profile_id: testProfileId,
        name: 'Revenue Target Q1',
        type: 'revenue',
        target_amount: 100000,
        target_date: '2024-03-31',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // goal_update
  // ============================================
  describe('goal_update', () => {
    it('should update goal successfully', async () => {
      supabaseMock.setQueryResultOnce('goals', mockResults.success({ id: mockGoal.id }))
      supabaseMock.setQueryResultOnce('goals', mockResults.success({ ...mockGoal, name: 'Updated Goal' }))

      const result = await goalTools.goal_update.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
        name: 'Updated Goal',
      })

      const data = expectSuccessWithData<{ message: string; goal: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('goals', mockResults.notFound())

      const result = await goalTools.goal_update.handler({
        profile_id: testProfileId,
        goal_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Goal not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('goals', mockResults.success({ id: mockGoal.id }))

      const result = await goalTools.goal_update.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
      })

      expectError(result, 'No fields to update')
    })
  })

  // ============================================
  // goal_delete
  // ============================================
  describe('goal_delete', () => {
    it('should delete goal successfully', async () => {
      supabaseMock.setQueryResultOnce('goals', mockResults.success({ id: mockGoal.id }))
      supabaseMock.setQueryResultOnce('goals', mockResults.success(null))

      const result = await goalTools.goal_delete.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
      })

      const data = expectSuccessWithData<{ message: string; goal_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.goal_id).toBe(mockGoal.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('goals', mockResults.notFound())

      const result = await goalTools.goal_delete.handler({
        profile_id: testProfileId,
        goal_id: 'non-existent',
      })

      expectError(result, 'Goal not found')
    })
  })

  // ============================================
  // goal_get_progress
  // ============================================
  describe('goal_get_progress', () => {
    it('should get goal progress', async () => {
      supabaseMock.setQueryResult('goals', mockResults.success(mockGoal))

      const result = await goalTools.goal_get_progress.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
      })

      const data = expectSuccessWithData<{
        goal_id: string
        progress_percent: number
        remaining_amount: number
        status: string
      }>(result)
      expect(data.goal_id).toBe(mockGoal.id)
      expect(data.progress_percent).toBe(45)
      expect(data.remaining_amount).toBe(55000)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('goals', mockResults.notFound())

      const result = await goalTools.goal_get_progress.handler({
        profile_id: testProfileId,
        goal_id: 'non-existent',
      })

      expectError(result, 'Goal not found')
    })
  })

  // ============================================
  // goal_update_progress
  // ============================================
  describe('goal_update_progress', () => {
    it('should update progress successfully', async () => {
      supabaseMock.setQueryResultOnce('goals', mockResults.success({ id: mockGoal.id, target_amount: 100000 }))
      supabaseMock.setQueryResultOnce('goals', mockResults.success({ ...mockGoal, current_amount: 60000, target_amount: 100000 }))

      const result = await goalTools.goal_update_progress.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
        current_amount: 60000,
      })

      const data = expectSuccessWithData<{
        message: string
        progress_percent: number
        is_achieved: boolean
      }>(result)
      expect(data.progress_percent).toBe(60)
      expect(data.is_achieved).toBe(false)
    })

    it('should mark goal as achieved when target reached', async () => {
      supabaseMock.setQueryResultOnce('goals', mockResults.success({ id: mockGoal.id, target_amount: 100000 }))
      supabaseMock.setQueryResultOnce('goals', mockResults.success({
        ...mockGoal,
        current_amount: 100000,
        target_amount: 100000,
        is_achieved: true,
      }))

      const result = await goalTools.goal_update_progress.handler({
        profile_id: testProfileId,
        goal_id: mockGoal.id,
        current_amount: 100000,
      })

      const data = expectSuccessWithData<{
        message: string
        is_achieved: boolean
      }>(result)
      expect(data.message).toContain('achieved')
      expect(data.is_achieved).toBe(true)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('goals', mockResults.notFound())

      const result = await goalTools.goal_update_progress.handler({
        profile_id: testProfileId,
        goal_id: 'non-existent',
        current_amount: 50000,
      })

      expectError(result, 'Goal not found')
    })
  })
})
