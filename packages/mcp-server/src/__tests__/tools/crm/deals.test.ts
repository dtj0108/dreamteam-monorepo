/**
 * Tests for crm/deals tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dealTools } from '../../../tools/crm/deals.js'
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
import { mockDeal, mockDealList, mockLead, mockContact, testWorkspaceId } from '../../fixtures/crm.js'

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

describe('crm/deals tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // deal_list
  // ============================================
  describe('deal_list', () => {
    it('should list deals successfully', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success(mockDealList))

      const result = await dealTools.deal_list.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ deals: unknown[]; total_value: number }>(result)
      expect(data.total_value).toBe(60000) // 50000 + 10000
    })

    it('should filter by status', async () => {
      const activeDeals = mockDealList.filter(d => d.status === 'active')
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success(activeDeals))

      const result = await dealTools.deal_list.handler({
        workspace_id: testWorkspaceId,
        status: 'active',
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.error('Connection failed'))

      const result = await dealTools.deal_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // deal_get
  // ============================================
  describe('deal_get', () => {
    it('should get deal by ID', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success(mockDeal))

      const result = await dealTools.deal_get.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_get.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
      })

      expectNotFound(result, 'Deal')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_get.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_create
  // ============================================
  describe('deal_create', () => {
    it('should create deal successfully', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success(mockDeal))

      const result = await dealTools.deal_create.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        name: 'Enterprise License',
        value: 50000,
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'deal' })
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await dealTools.deal_create.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
        name: 'Enterprise License',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when contact not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await dealTools.deal_create.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        name: 'Enterprise License',
        contact_id: 'non-existent',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_create.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        name: 'Enterprise License',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: mockLead.id }))
      supabaseMock.setQueryResult('lead_opportunities', mockResults.error('Constraint violation'))

      const result = await dealTools.deal_create.handler({
        workspace_id: testWorkspaceId,
        lead_id: mockLead.id,
        name: 'Enterprise License',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // deal_update
  // ============================================
  describe('deal_update', () => {
    it('should update deal successfully', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id }))

      const result = await dealTools.deal_update.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
        value: 75000,
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'deal' })
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id }))

      const result = await dealTools.deal_update.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_update.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
        value: 75000,
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_update.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
        value: 75000,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_delete
  // ============================================
  describe('deal_delete', () => {
    it('should delete deal successfully', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id }))

      const result = await dealTools.deal_delete.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectDeleteResult(result, 'deal_id')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_delete.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_delete.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_move_stage
  // ============================================
  describe('deal_move_stage', () => {
    it('should move deal to new stage', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id, stage: 'proposal' }))

      const result = await dealTools.deal_move_stage.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
        stage: 'negotiation',
      })

      const data = expectSuccessWithData<{ old_stage: string; new_stage: string }>(result)
      expect(data.old_stage).toBe('proposal')
      expect(data.new_stage).toBe('negotiation')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_move_stage.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
        stage: 'negotiation',
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_move_stage.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
        stage: 'negotiation',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_mark_won
  // ============================================
  describe('deal_mark_won', () => {
    it('should mark deal as won', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id, value: 50000 }))

      const result = await dealTools.deal_mark_won.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      const data = expectSuccessWithData<{ value_won: number; message: string }>(result)
      expect(data.value_won).toBe(50000)
      expect(data.message).toContain('won')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_mark_won.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_mark_won.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_mark_lost
  // ============================================
  describe('deal_mark_lost', () => {
    it('should mark deal as lost', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id, notes: '' }))

      const result = await dealTools.deal_mark_lost.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
        reason: 'Budget constraints',
      })

      const data = expectSuccessWithData<{ reason: string; message: string }>(result)
      expect(data.reason).toBe('Budget constraints')
      expect(data.message).toContain('lost')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_mark_lost.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_mark_lost.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_get_activities
  // ============================================
  describe('deal_get_activities', () => {
    it('should get deal activities', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success({ id: mockDeal.id }))
      supabaseMock.setQueryResult('activities', mockResults.success([]))

      const result = await dealTools.deal_get_activities.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      const data = expectSuccessWithData<{ activities: unknown[]; deal_id: string }>(result)
      expect(data.deal_id).toBe(mockDeal.id)
    })

    it('should return error when deal not found', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.notFound())

      const result = await dealTools.deal_get_activities.handler({
        workspace_id: testWorkspaceId,
        deal_id: 'non-existent',
      })

      expectError(result, 'Deal not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_get_activities.handler({
        workspace_id: testWorkspaceId,
        deal_id: mockDeal.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // deal_get_value_by_stage
  // ============================================
  describe('deal_get_value_by_stage', () => {
    it('should get deal value by stage', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success(mockDealList))

      const result = await dealTools.deal_get_value_by_stage.handler({
        workspace_id: testWorkspaceId,
      })

      const data = expectSuccessWithData<{ by_stage: Record<string, unknown>; total_value: number }>(result)
      expect(data.total_value).toBe(60000)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_get_value_by_stage.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.error('Query failed'))

      const result = await dealTools.deal_get_value_by_stage.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // deal_get_forecast
  // ============================================
  describe('deal_get_forecast', () => {
    it('should get sales forecast', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success(mockDealList))

      const result = await dealTools.deal_get_forecast.handler({
        workspace_id: testWorkspaceId,
        months_ahead: 3,
      })

      const data = expectSuccessWithData<{ forecast_by_month: unknown; months_ahead: number }>(result)
      expect(data.months_ahead).toBe(3)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await dealTools.deal_get_forecast.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('lead_opportunities', mockResults.error('Query failed'))

      const result = await dealTools.deal_get_forecast.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })
})
