/**
 * Tests for agents/agents tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { agentTools } from '../../../tools/agents/agents.js'
import { createSupabaseMock, mockResults } from '../../mocks/supabase.js'
import { mockValidAccess } from '../../mocks/auth.js'
import {
  expectSuccess,
  expectSuccessWithData,
  expectError,
  expectListResult,
} from '../../helpers/response-validators.js'
import {
  mockAgent,
  mockAgentInactive,
  mockAgentList,
  mockAgentSkill,
  mockAgentSkillSystem,
  mockSkillAssignment,
  testWorkspaceId,
} from '../../fixtures/agents.js'

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

describe('agents/agents tools', () => {
  const supabaseMock = createSupabaseMock()

  beforeEach(() => {
    supabaseMock.reset()
    vi.mocked(getSupabase).mockReturnValue(supabaseMock.client)
    mockValidAccess(vi.mocked(validateWorkspaceAccess), 'admin')
  })

  // ============================================
  // agent_list
  // ============================================
  describe('agent_list', () => {
    it('should list agents successfully', async () => {
      supabaseMock.setQueryResult('agents', mockResults.success(mockAgentList))

      const result = await agentTools.agent_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectListResult(result, { itemsKey: 'agents', countKey: 'count' })
    })

    it('should filter by active status', async () => {
      supabaseMock.setQueryResult('agents', mockResults.success([mockAgent]))

      const result = await agentTools.agent_list.handler({
        workspace_id: testWorkspaceId,
        is_active: true,
      })

      const data = expectSuccessWithData<{ agents: unknown[]; count: number }>(result)
      expect(data.agents).toHaveLength(1)
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('agents', mockResults.error('Connection failed'))

      const result = await agentTools.agent_list.handler({
        workspace_id: testWorkspaceId,
      })

      expectError(result, 'Database error')
    })
  })

  // ============================================
  // agent_get
  // ============================================
  describe('agent_get', () => {
    it('should get agent by ID', async () => {
      supabaseMock.setQueryResult('agents', mockResults.success({
        ...mockAgent,
        skills: [{ skill: mockAgentSkill }],
        created_by_user: { id: 'profile-123', name: 'John' },
      }))

      const result = await agentTools.agent_get.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectSuccess(result)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentTools.agent_get.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_get.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_create
  // ============================================
  describe('agent_create', () => {
    it('should create agent successfully', async () => {
      supabaseMock.setQueryResult('agents', mockResults.success(mockAgent))

      const result = await agentTools.agent_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Agent',
        description: 'A helpful agent',
        system_prompt: 'You are a helpful assistant.',
        model: 'claude-3-sonnet',
        tools: ['crm_contact_list'],
      })

      const data = expectSuccessWithData<{ message: string; agent: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should create agent with skill assignments', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success(mockAgent))
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.success([mockSkillAssignment]))

      const result = await agentTools.agent_create.handler({
        workspace_id: testWorkspaceId,
        name: 'Agent with Skills',
        skill_ids: [mockAgentSkill.id],
      })

      const data = expectSuccessWithData<{ message: string; agent: unknown }>(result)
      expect(data.message).toContain('created')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Agent',
      })

      expectError(result, 'Access denied')
    })

    it('should handle database errors', async () => {
      supabaseMock.setQueryResult('agents', mockResults.error('Insert failed'))

      const result = await agentTools.agent_create.handler({
        workspace_id: testWorkspaceId,
        name: 'New Agent',
      })

      expectError(result, 'Failed to create')
    })
  })

  // ============================================
  // agent_update
  // ============================================
  describe('agent_update', () => {
    it('should update agent successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ ...mockAgent, name: 'Updated Agent' }))

      const result = await agentTools.agent_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        name: 'Updated Agent',
      })

      const data = expectSuccessWithData<{ message: string; agent: unknown }>(result)
      expect(data.message).toContain('updated')
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentTools.agent_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        name: 'Updated',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when no fields to update', async () => {
      supabaseMock.setQueryResult('agents', mockResults.success({ id: mockAgent.id }))

      const result = await agentTools.agent_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'No fields to update')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_update.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        name: 'Updated',
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_delete
  // ============================================
  describe('agent_delete', () => {
    it('should delete agent successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agents', mockResults.success(null))

      const result = await agentTools.agent_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      const data = expectSuccessWithData<{ message: string; agent_id: string }>(result)
      expect(data.message).toContain('deleted')
      expect(data.agent_id).toBe(mockAgent.id)
    })

    it('should return error when not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentTools.agent_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_delete.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_add_skill
  // ============================================
  describe('agent_add_skill', () => {
    it('should add skill to agent successfully', async () => {
      // Verify agent exists
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      // Verify skill exists
      supabaseMock.setQueryResultOnce('agent_skills', mockResults.success({ id: mockAgentSkill.id }))
      // Check not already assigned
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.notFound())
      // Insert assignment
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.success(null))

      const result = await agentTools.agent_add_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        skill_id: mockAgentSkill.id,
      })

      const data = expectSuccessWithData<{ message: string; agent_id: string; skill_id: string }>(result)
      expect(data.message).toContain('Skill added')
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentTools.agent_add_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        skill_id: mockAgentSkill.id,
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when skill not found', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_skills', mockResults.notFound())

      const result = await agentTools.agent_add_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        skill_id: 'non-existent',
      })

      expectError(result, 'Skill not found')
    })

    it('should return error when skill already assigned', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_skills', mockResults.success({ id: mockAgentSkill.id }))
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.success({ agent_id: mockAgent.id }))

      const result = await agentTools.agent_add_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        skill_id: mockAgentSkill.id,
      })

      expectError(result, 'already assigned')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_add_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        skill_id: mockAgentSkill.id,
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_remove_skill
  // ============================================
  describe('agent_remove_skill', () => {
    it('should remove skill from agent successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.success(null))

      const result = await agentTools.agent_remove_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        skill_id: mockAgentSkill.id,
      })

      const data = expectSuccessWithData<{ message: string; agent_id: string; skill_id: string }>(result)
      expect(data.message).toContain('Skill removed')
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentTools.agent_remove_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
        skill_id: mockAgentSkill.id,
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_remove_skill.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
        skill_id: mockAgentSkill.id,
      })

      expectError(result, 'Access denied')
    })
  })

  // ============================================
  // agent_get_skills
  // ============================================
  describe('agent_get_skills', () => {
    it('should get skills for agent successfully', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.success([
        { skill: mockAgentSkill },
        { skill: mockAgentSkillSystem },
      ]))

      const result = await agentTools.agent_get_skills.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      const data = expectSuccessWithData<{ skills: unknown[]; count: number }>(result)
      expect(data.count).toBe(2)
    })

    it('should return empty list when no skills assigned', async () => {
      supabaseMock.setQueryResultOnce('agents', mockResults.success({ id: mockAgent.id }))
      supabaseMock.setQueryResultOnce('agent_skill_assignments', mockResults.success([]))

      const result = await agentTools.agent_get_skills.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      const data = expectSuccessWithData<{ skills: unknown[]; count: number }>(result)
      expect(data.count).toBe(0)
      expect(data.skills).toHaveLength(0)
    })

    it('should return error when agent not found', async () => {
      supabaseMock.setQueryResult('agents', mockResults.notFound())

      const result = await agentTools.agent_get_skills.handler({
        workspace_id: testWorkspaceId,
        agent_id: 'non-existent',
      })

      expectError(result, 'Agent not found')
    })

    it('should return error when access denied', async () => {
      vi.mocked(validateWorkspaceAccess).mockResolvedValue(null)

      const result = await agentTools.agent_get_skills.handler({
        workspace_id: testWorkspaceId,
        agent_id: mockAgent.id,
      })

      expectError(result, 'Access denied')
    })
  })
})
