import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  autoDeployTeamForPlan,
  getWorkspaceDeployment,
  toggleAgentEnabled,
} from '../auto-deploy'

// Mock the server module
vi.mock('../server', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '../server'

const mockSupabase = createAdminClient as unknown as ReturnType<typeof vi.fn>

describe('Auto-Deploy Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('autoDeployTeamForPlan', () => {
    it('should return error when plan not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('Not found') }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await autoDeployTeamForPlan('workspace-1', 'nonexistent')

      expect(result.deployed).toBe(false)
      expect(result.error).toContain('Plan not found')
    })

    it('should return error when plan has no team_id', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: { id: 'plan-1', team_id: null }, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await autoDeployTeamForPlan('workspace-1', 'starter')

      expect(result.deployed).toBe(false)
      expect(result.error).toContain('no associated team')
    })

    it('should skip deployment if same team already deployed', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'plan-1', team_id: 'team-1' }, error: null }) // plan lookup
          .mockResolvedValueOnce({ data: { id: 'existing-deployment', source_team_id: 'team-1' }, error: null }), // existing deployment
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await autoDeployTeamForPlan('workspace-1', 'starter')

      expect(result.deployed).toBe(true)
      expect(result.teamId).toBe('team-1')
      expect(result.deploymentId).toBe('existing-deployment')
    })
  })

  describe('getWorkspaceDeployment', () => {
    it('should return active deployment for workspace', async () => {
      const mockDeployment = {
        id: 'deployment-1',
        workspace_id: 'workspace-1',
        source_team_id: 'team-1',
        status: 'active',
        base_config: { team: { id: 'team-1', name: 'Test Team' } },
        customizations: {},
        active_config: { team: { id: 'team-1', name: 'Test Team' } },
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDeployment, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getWorkspaceDeployment('workspace-1')

      expect(mockChain.from).toHaveBeenCalledWith('workspace_deployed_teams')
      expect(mockChain.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1')
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'active')
      expect(result).toEqual(mockDeployment)
    })

    it('should return null when no active deployment exists', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getWorkspaceDeployment('workspace-1')

      expect(result).toBeNull()
    })

    it('should return null on database error', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getWorkspaceDeployment('workspace-1')

      expect(result).toBeNull()
    })
  })

  describe('toggleAgentEnabled', () => {
    it('should return error when no active deployment exists', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await toggleAgentEnabled('workspace-1', 'agent-1', false)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active deployment found for workspace')
    })

    it('should handle missing customizations gracefully', async () => {
      const mockDeployment = {
        id: 'deployment-1',
        // No customizations field - should default to empty
        base_config: {
          team: { id: 'team-1' },
          agents: [],
          delegations: [],
          team_mind: [],
        },
      }

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDeployment, error: null }),
      }
      
      // Need to handle the update call
      mockUpdateChain.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      
      mockSupabase.mockReturnValue(mockUpdateChain)

      const result = await toggleAgentEnabled('workspace-1', 'agent-1', false)

      expect(result.success).toBe(true)
    })

    it('should return error when update fails', async () => {
      const mockDeployment = {
        id: 'deployment-1',
        customizations: { disabled_agents: [], disabled_delegations: [], added_mind: [], agent_overrides: {} },
        base_config: { team: { id: 'team-1' }, agents: [], delegations: [], team_mind: [] },
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDeployment, error: null }),
      }
      
      // Make update fail
      mockChain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      })
      
      mockSupabase.mockReturnValue(mockChain)

      const result = await toggleAgentEnabled('workspace-1', 'agent-1', false)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })
})
