/**
 * Tests for goals/kpis tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { kpiTools } from '../../../tools/goals/kpis.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockKpiInput,
  mockKpiInputList,
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

describe('goals/kpis tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
  })

  // ============================================
  // kpi_list
  // ============================================
  describe('kpi_list', () => {
    it('should list KPI inputs successfully', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success(mockKpiInputList))

      const result = await kpiTools.kpi_list.handler({
        profile_id: testProfileId,
      })

      expectListResult(result, { itemsKey: 'kpi_inputs', countKey: 'count' })
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.error('Connection failed'))

      const result = await kpiTools.kpi_list.handler({
        profile_id: testProfileId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // kpi_get
  // ============================================
  describe('kpi_get', () => {
    it('should get KPI input by ID', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success(mockKpiInput))

      const result = await kpiTools.kpi_get.handler({
        profile_id: testProfileId,
        kpi_id: mockKpiInput.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.notFound())

      const result = await kpiTools.kpi_get.handler({
        profile_id: testProfileId,
        kpi_id: 'non-existent',
      })

      expectError(result, 'KPI input not found')
    })
  })

  // ============================================
  // kpi_record
  // ============================================
  describe('kpi_record', () => {
    it('should record KPI successfully', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success(mockKpiInput))

      const result = await kpiTools.kpi_record.handler({
        profile_id: testProfileId,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        revenue: 25000,
      })

      const data = expectSuccessWithData<{ message: string; kpi: unknown }>(result)
      expect(data.message).toContain('recorded')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.error('Insert failed'))

      const result = await kpiTools.kpi_record.handler({
        profile_id: testProfileId,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
      })

      expectError(result, 'Failed to record')
    })
  })

  // ============================================
  // kpi_update
  // ============================================
  describe('kpi_update', () => {
    it('should update KPI successfully', async () => {
      supabaseMock.setQueryResultOnce('kpi_inputs', mockResults.success({ id: mockKpiInput.id }))
      supabaseMock.setQueryResultOnce('kpi_inputs', mockResults.success({ ...mockKpiInput, revenue: 30000 }))

      const result = await kpiTools.kpi_update.handler({
        profile_id: testProfileId,
        kpi_id: mockKpiInput.id,
        revenue: 30000,
      })

      const data = expectSuccessWithData<{ message: string; kpi: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.notFound())

      const result = await kpiTools.kpi_update.handler({
        profile_id: testProfileId,
        kpi_id: 'non-existent',
        revenue: 30000,
      })

      expectError(result, 'KPI input not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success({ id: mockKpiInput.id }))

      const result = await kpiTools.kpi_update.handler({
        profile_id: testProfileId,
        kpi_id: mockKpiInput.id,
      })

      expectError(result, 'No fields to update')
    })
  })

  // ============================================
  // kpi_delete
  // ============================================
  describe('kpi_delete', () => {
    it('should delete KPI successfully', async () => {
      supabaseMock.setQueryResultOnce('kpi_inputs', mockResults.success({ id: mockKpiInput.id }))
      supabaseMock.setQueryResultOnce('kpi_inputs', mockResults.success(null))

      const result = await kpiTools.kpi_delete.handler({
        profile_id: testProfileId,
        kpi_id: mockKpiInput.id,
      })

      const data = expectSuccessWithData<{ message: string; kpi_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.kpi_id).toBe(mockKpiInput.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.notFound())

      const result = await kpiTools.kpi_delete.handler({
        profile_id: testProfileId,
        kpi_id: 'non-existent',
      })

      expectError(result, 'KPI input not found')
    })
  })

  // ============================================
  // kpi_get_trends
  // ============================================
  describe('kpi_get_trends', () => {
    it('should get KPI trends', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success(mockKpiInputList))

      const result = await kpiTools.kpi_get_trends.handler({
        profile_id: testProfileId,
        metric_name: 'revenue',
      })

      const data = expectSuccessWithData<{ metric: string; periods: unknown[]; summary: unknown }>(result)
      expect(data.metric).toBe('revenue')
    })

    it('should handle no data', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success([]))

      const result = await kpiTools.kpi_get_trends.handler({
        profile_id: testProfileId,
        metric_name: 'revenue',
      })

      const data = expectSuccessWithData<{ message: string; trends: unknown[] }>(result)
      expect(data.message).toContain('No KPI data')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.error('Connection failed'))

      const result = await kpiTools.kpi_get_trends.handler({
        profile_id: testProfileId,
        metric_name: 'revenue',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // kpi_get_saas_metrics
  // ============================================
  describe('kpi_get_saas_metrics', () => {
    it('should calculate SaaS metrics', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success(mockKpiInputList))

      const result = await kpiTools.kpi_get_saas_metrics.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; metrics: unknown }>(result)
      expect(data.message).toContain('SaaS metrics')
    })

    it('should handle no data', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success([]))

      const result = await kpiTools.kpi_get_saas_metrics.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; metrics: unknown }>(result)
      expect(data.message).toContain('No KPI data')
    })
  })

  // ============================================
  // kpi_get_retail_metrics
  // ============================================
  describe('kpi_get_retail_metrics', () => {
    it('should calculate retail metrics', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success(mockKpiInputList))

      const result = await kpiTools.kpi_get_retail_metrics.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; metrics: unknown }>(result)
      expect(data.message).toContain('Retail metrics')
    })

    it('should handle no data', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success([]))

      const result = await kpiTools.kpi_get_retail_metrics.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; metrics: unknown }>(result)
      expect(data.message).toContain('No KPI data')
    })
  })

  // ============================================
  // kpi_get_service_metrics
  // ============================================
  describe('kpi_get_service_metrics', () => {
    it('should calculate service metrics', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success([mockKpiInput]))

      const result = await kpiTools.kpi_get_service_metrics.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; metrics: unknown }>(result)
      expect(data.message).toContain('Service metrics')
    })

    it('should handle no data', async () => {
      supabaseMock.setQueryResult('kpi_inputs', mockResults.success([]))

      const result = await kpiTools.kpi_get_service_metrics.handler({
        profile_id: testProfileId,
      })

      const data = expectSuccessWithData<{ message: string; metrics: unknown }>(result)
      expect(data.message).toContain('No KPI data')
    })
  })
})
