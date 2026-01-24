/**
 * Tests for crm/contacts tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { contactTools } from '../../../tools/crm/contacts.js'
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
import { mockContact, mockContactList, mockLead, testWorkspaceId } from '../../fixtures/crm.js'

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

describe('crm/contacts tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess))
  })

  // ============================================
  // contact_list
  // ============================================
  describe('contact_list', () => {
    it('should list contacts successfully', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContactList))

      const result = await contactTools.contact_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'contacts', countKey: 'count' })
    })

    it('should filter by lead_id', async () => {
      const filteredContacts = mockContactList.filter(c => c.lead_id === 'lead-123')
      supabaseMock.setQueryResult('contacts', mockResults.success(filteredContacts))

      const result = await contactTools.contact_list.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'lead-123',
      })

      expectSuccess(result)
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.error('Connection failed'))

      const result = await contactTools.contact_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // contact_get
  // ============================================
  describe('contact_get', () => {
    it('should get contact by ID', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContact))

      const result = await contactTools.contact_get.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await contactTools.contact_get.handler({
        workspace_id: testWorkspaceId,
        contact_id: 'non-existent',
      })

      expectNotFound(result, 'Contact')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_get.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // contact_create
  // ============================================
  describe('contact_create', () => {
    it('should create contact successfully', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContact))

      const result = await contactTools.contact_create.handler({
        workspace_id: testWorkspaceId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'contact' })
    })

    it('should create contact with lead_id', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: 'lead-123' }))
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContact))

      const result = await contactTools.contact_create.handler({
        workspace_id: testWorkspaceId,
        first_name: 'John',
        lead_id: 'lead-123',
      })

      expectMutationResult(result, { messageContains: 'created', entityKey: 'contact' })
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await contactTools.contact_create.handler({
        workspace_id: testWorkspaceId,
        first_name: 'John',
        lead_id: 'non-existent',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_create.handler({
        workspace_id: testWorkspaceId,
        first_name: 'John',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.error('Constraint violation'))

      const result = await contactTools.contact_create.handler({
        workspace_id: testWorkspaceId,
        first_name: 'John',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // contact_update
  // ============================================
  describe('contact_update', () => {
    it('should update contact successfully', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success({ id: mockContact.id }))

      const result = await contactTools.contact_update.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
        first_name: 'Jane',
      })

      expectMutationResult(result, { messageContains: 'updated', entityKey: 'contact' })
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success({ id: mockContact.id }))

      const result = await contactTools.contact_update.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await contactTools.contact_update.handler({
        workspace_id: testWorkspaceId,
        contact_id: 'non-existent',
        first_name: 'Jane',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_update.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
        first_name: 'Jane',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // contact_delete
  // ============================================
  describe('contact_delete', () => {
    it('should delete contact successfully', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success({ id: mockContact.id }))

      const result = await contactTools.contact_delete.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectDeleteResult(result, 'contact_id')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await contactTools.contact_delete.handler({
        workspace_id: testWorkspaceId,
        contact_id: 'non-existent',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_delete.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // contact_search
  // ============================================
  describe('contact_search', () => {
    it('should search contacts successfully', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContactList))

      const result = await contactTools.contact_search.handler({
        workspace_id: testWorkspaceId,
        query: 'John',
      })

      const data = expectSuccessWithData<{ contacts: unknown[]; query: string }>(result)
      expect(data.query).toBe('John')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_search.handler({
        workspace_id: testWorkspaceId,
        query: 'John',
      })

      expectAccessDenied(result)
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.error('Search failed'))

      const result = await contactTools.contact_search.handler({
        workspace_id: testWorkspaceId,
        query: 'John',
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // contact_get_activities
  // ============================================
  describe('contact_get_activities', () => {
    it('should get contact activities', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success({ id: mockContact.id }))
      supabaseMock.setQueryResult('activities', mockResults.success([]))

      const result = await contactTools.contact_get_activities.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      const data = expectSuccessWithData<{ activities: unknown[]; contact_id: string }>(result)
      expect(data.contact_id).toBe(mockContact.id)
    })

    it('should return error when contact not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await contactTools.contact_get_activities.handler({
        workspace_id: testWorkspaceId,
        contact_id: 'non-existent',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_get_activities.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // contact_get_deals
  // ============================================
  describe('contact_get_deals', () => {
    it('should get contact deals', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success({ id: mockContact.id }))
      supabaseMock.setQueryResult('lead_opportunities', mockResults.success([]))

      const result = await contactTools.contact_get_deals.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      const data = expectSuccessWithData<{ deals: unknown[]; contact_id: string }>(result)
      expect(data.contact_id).toBe(mockContact.id)
    })

    it('should return error when contact not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await contactTools.contact_get_deals.handler({
        workspace_id: testWorkspaceId,
        contact_id: 'non-existent',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_get_deals.handler({
        workspace_id: testWorkspaceId,
        contact_id: mockContact.id,
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // contact_get_by_lead
  // ============================================
  describe('contact_get_by_lead', () => {
    it('should get contacts by lead', async () => {
      supabaseMock.setQueryResult('leads', mockResults.success({ id: 'lead-123', name: 'Acme Corp' }))
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContactList))

      const result = await contactTools.contact_get_by_lead.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'lead-123',
      })

      const data = expectSuccessWithData<{ contacts: unknown[]; lead: { id: string } }>(result)
      expect(data.lead.id).toBe('lead-123')
    })

    it('should return error when lead not found', async () => {
      supabaseMock.setQueryResult('leads', mockResults.notFound())

      const result = await contactTools.contact_get_by_lead.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'non-existent',
      })

      expectError(result, 'Lead not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_get_by_lead.handler({
        workspace_id: testWorkspaceId,
        lead_id: 'lead-123',
      })

      expectAccessDenied(result)
    })
  })

  // ============================================
  // contact_get_by_email
  // ============================================
  describe('contact_get_by_email', () => {
    it('should get contact by email', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.success(mockContact))

      const result = await contactTools.contact_get_by_email.handler({
        workspace_id: testWorkspaceId,
        email: 'john.doe@example.com',
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('contacts', mockResults.notFound())

      const result = await contactTools.contact_get_by_email.handler({
        workspace_id: testWorkspaceId,
        email: 'unknown@example.com',
      })

      expectError(result, 'Contact not found')
    })

    it('should return error when access denied', async () => {
      mockDeniedAccess(vi.mocked(validateWorkspaceAccess))

      const result = await contactTools.contact_get_by_email.handler({
        workspace_id: testWorkspaceId,
        email: 'john.doe@example.com',
      })

      expectAccessDenied(result)
    })
  })
})
