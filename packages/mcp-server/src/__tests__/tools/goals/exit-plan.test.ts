/**
 * Tests for goals/exit-plan tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exitPlanTools } from '../../../tools/goals/exit-plan.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
} from '../../helpers/response-validators.js'
import {
  mockExitPlan,
  mockKpiInput,
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

describe('goals/exit-plan tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // exit_plan_get
  // ============================================
  describe('exit_plan_get', () => {
    it('should get exit plan', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.success(mockExitPlan))

      const result = await exitPlanTools.exit_plan_get.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ progress_percent: number; days_remaining: number }>(result)
      expect(data.progress_percent).toBe(30) // 3M / 10M = 30%
    })

    it('should return success with null when no exit plan found', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.notFound())

      const result = await exitPlanTools.exit_plan_get.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; exit_plan: null }>(result)
      expect(data.message).toContain('No exit plan')
      expect(data.exit_plan).toBeNull()
    })
  })

  // ============================================
  // exit_plan_create
  // ============================================
  describe('exit_plan_create', () => {
    it('should create exit plan', async () => {
      // Check existing - none found
      supabaseMock.setQueryResultOnce('exit_plans', mockResults.notFound())
      // Insert
      supabaseMock.setQueryResultOnce('exit_plans', mockResults.success(mockExitPlan))

      const result = await exitPlanTools.exit_plan_create.handler({
        profile_id: testProfileId,
        target_valuation: 10000000,
        target_date: '2026-06-30',
      })

      const data = expectSuccessWithData<{ message: string; exit_plan: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when exit plan already exists', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.success({ id: mockExitPlan.id }))

      const result = await exitPlanTools.exit_plan_create.handler({
        profile_id: testProfileId,
        target_valuation: 10000000,
        target_date: '2026-06-30',
      })

      expectError(result, 'already exists')
    })
  })

  // ============================================
  // exit_plan_update
  // ============================================
  describe('exit_plan_update', () => {
    it('should update exit plan', async () => {
      supabaseMock.setQueryResultOnce('exit_plans', mockResults.success({ id: mockExitPlan.id }))
      supabaseMock.setQueryResultOnce('exit_plans', mockResults.success({ ...mockExitPlan, target_valuation: 15000000 }))

      const result = await exitPlanTools.exit_plan_update.handler({
        profile_id: testProfileId,
        target_valuation: 15000000,
      })

      const data = expectSuccessWithData<{ message: string; exit_plan: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.notFound())

      const result = await exitPlanTools.exit_plan_update.handler({
        profile_id: testProfileId,
        target_valuation: 15000000,
      })

      expectError(result, 'not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.success({ id: mockExitPlan.id }))

      const result = await exitPlanTools.exit_plan_update.handler({
        profile_id: testProfileId,
      })

      expectError(result, 'No fields to update')
    })
  })

  // ============================================
  // exit_plan_delete
  // ============================================
  describe('exit_plan_delete', () => {
    it('should delete exit plan', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.success(null))

      const result = await exitPlanTools.exit_plan_delete.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string }>(result)
      expect(data.message).toContain('deleted')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.error('Delete failed'))

      const result = await exitPlanTools.exit_plan_delete.handler({
        profile_id: testProfileId,
      })

      expectError(result, 'Failed to delete')
    })
  })

  // ============================================
  // exit_plan_get_scenarios
  // ============================================
  describe('exit_plan_get_scenarios', () => {
    it('should get exit scenarios', async () => {
      // Get exit plan
      supabaseMock.setQueryResultOnce('exit_plans', mockResults.success(mockExitPlan))
      // Get KPI inputs
      supabaseMock.setQueryResultOnce('kpi_inputs', mockResults.success([mockKpiInput]))

      const result = await exitPlanTools.exit_plan_get_scenarios.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{
        exit_plan: unknown
        revenue_multiples: unknown
        runway_analysis: unknown
      }>(result)
      expect(data.exit_plan).toBeDefined()
    })

    it('should return error when no exit plan', async () => {
      supabaseMock.setQueryResult('exit_plans', mockResults.notFound())

      const result = await exitPlanTools.exit_plan_get_scenarios.handler({
        profile_id: testProfileId,
      })

      expectError(result, 'Exit plan not found')
    })
  })
})
