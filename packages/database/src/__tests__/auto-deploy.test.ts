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

// Mock deployment provisioning to control completion/failure outcomes
vi.mock('../deployment-resources', () => ({
  provisionDeploymentResources: vi.fn(),
}))

import { createAdminClient } from '../server'
import { provisionDeploymentResources } from '../deployment-resources'

const mockSupabase = createAdminClient as unknown as ReturnType<typeof vi.fn>
const mockProvisionDeploymentResources = provisionDeploymentResources as unknown as ReturnType<typeof vi.fn>

function completeProvisioningSummary() {
  return {
    expectedAgents: 1,
    profiles: 1,
    channels: 1,
    schedules: 1,
    templates: 1,
    isComplete: true,
    issues: [],
  }
}

function incompleteProvisioningSummary() {
  return {
    expectedAgents: 1,
    profiles: 1,
    channels: 1,
    schedules: 0,
    templates: 1,
    isComplete: false,
    issues: ['no_schedules'],
  }
}

function createSupabaseForNewDeployment() {
  const teamsSingleResponses = [
    { data: { current_version: 2 }, error: null }, // team version lookup
    { // buildConfigSnapshot team lookup
      data: { id: 'team-1', name: 'Starter Team', slug: 'starter', head_agent_id: null },
      error: null,
    },
  ]

  const teamsSingle = vi.fn().mockImplementation(async () => {
    const next = teamsSingleResponses.shift()
    return next || { data: null, error: new Error('Unexpected teams single call') }
  })

  const from = vi.fn().mockImplementation((table: string) => {
    switch (table) {
      case 'plans':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'plan-1', team_id: 'team-1' }, error: null }),
              }),
            }),
          }),
        }

      case 'workspace_deployed_teams':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'deployment-new' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }

      case 'workspaces':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        }

      case 'teams':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: teamsSingle,
            }),
          }),
        }

      case 'team_agents':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }

      case 'team_delegations':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }

      case 'team_mind':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }

      default:
        throw new Error(`Unexpected table in test mock: ${table}`)
    }
  })

  return { from }
}

function createSupabaseForReplacementDeployment() {
  const teamsSingleResponses = [
    { data: { current_version: 3 }, error: null }, // team version lookup for replacement team
    {
      data: { id: 'team-2', name: 'Growth Team', slug: 'growth', head_agent_id: null },
      error: null,
    }, // buildConfigSnapshot team lookup
  ]

  const teamsSingle = vi.fn().mockImplementation(async () => {
    const next = teamsSingleResponses.shift()
    return next || { data: null, error: new Error('Unexpected teams single call') }
  })

  const deploymentUpdates: Array<{ id: string; status: string }> = []

  const from = vi.fn().mockImplementation((table: string) => {
    switch (table) {
      case 'plans':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'plan-2', team_id: 'team-2' }, error: null }),
              }),
            }),
          }),
        }

      case 'workspace_deployed_teams':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'existing-deployment', source_team_id: 'team-1', active_config: null },
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'deployment-new' }, error: null }),
            }),
          }),
          update: vi.fn().mockImplementation((payload: { status: string }) => ({
            eq: vi.fn().mockImplementation(async (_column: string, id: string) => {
              deploymentUpdates.push({ id, status: payload.status })
              return { error: null }
            }),
          })),
        }

      case 'workspaces':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        }

      case 'teams':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: teamsSingle,
            }),
          }),
        }

      case 'team_agents':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }

      case 'team_delegations':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }

      case 'team_mind':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }

      case 'workspace_deployed_agents':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ agent_id: 'old-agent-1' }], error: null }),
          }),
        }

      case 'agent_schedules':
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            }),
          }),
        }

      default:
        throw new Error(`Unexpected table in replacement test mock: ${table}`)
    }
  })

  return { from, deploymentUpdates }
}

describe('Auto-Deploy Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProvisionDeploymentResources.mockResolvedValue(completeProvisioningSummary())
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
      const activeConfig = {
        team: { id: 'team-1', name: 'Starter Team', slug: 'starter', head_agent_id: null },
        agents: [],
        delegations: [],
        team_mind: [],
      }
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'plan-1', team_id: 'team-1' }, error: null }) // plan lookup
          .mockResolvedValueOnce({
            data: { id: 'existing-deployment', source_team_id: 'team-1', active_config: activeConfig },
            error: null,
          }) // existing deployment
          .mockResolvedValueOnce({ data: { owner_id: 'owner-1' }, error: null }), // workspace lookup
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await autoDeployTeamForPlan('workspace-1', 'starter')

      expect(result.deployed).toBe(true)
      expect(result.teamId).toBe('team-1')
      expect(result.deploymentId).toBe('existing-deployment')
    })

    it('should return provisioning_incomplete when same-team deployment has zero schedules', async () => {
      mockProvisionDeploymentResources.mockResolvedValueOnce(incompleteProvisioningSummary())

      const activeConfig = {
        team: { id: 'team-1', name: 'Starter Team', slug: 'starter', head_agent_id: null },
        agents: [],
        delegations: [],
        team_mind: [],
      }
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'plan-1', team_id: 'team-1' }, error: null }) // plan lookup
          .mockResolvedValueOnce({
            data: { id: 'existing-deployment', source_team_id: 'team-1', active_config: activeConfig },
            error: null,
          }) // existing deployment
          .mockResolvedValueOnce({ data: { owner_id: 'owner-1' }, error: null }), // workspace lookup
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await autoDeployTeamForPlan('workspace-1', 'starter')

      expect(result.deployed).toBe(false)
      expect(result.errorCode).toBe('provisioning_incomplete')
      expect(result.error).toContain('provisioning_incomplete:')
      expect(result.provisioning?.issues).toEqual(['no_schedules'])
      expect(result.deploymentId).toBe('existing-deployment')
    })

    it('should return provisioning_incomplete when new deployment has zero schedules', async () => {
      mockProvisionDeploymentResources.mockResolvedValueOnce(incompleteProvisioningSummary())
      mockSupabase.mockReturnValue(createSupabaseForNewDeployment())

      const result = await autoDeployTeamForPlan('workspace-1', 'starter')

      expect(result.deployed).toBe(false)
      expect(result.errorCode).toBe('provisioning_incomplete')
      expect(result.error).toContain('provisioning_incomplete:')
      expect(result.provisioning?.issues).toEqual(['no_schedules'])
      expect(result.deploymentId).toBe('deployment-new')
    })

    it('should not replace existing deployment when replacement provisioning is incomplete', async () => {
      mockProvisionDeploymentResources.mockResolvedValueOnce(incompleteProvisioningSummary())

      const replacementMock = createSupabaseForReplacementDeployment()
      mockSupabase.mockReturnValue(replacementMock)

      const result = await autoDeployTeamForPlan('workspace-1', 'teams')

      expect(result.deployed).toBe(false)
      expect(result.errorCode).toBe('provisioning_incomplete')
      expect(replacementMock.deploymentUpdates).toContainEqual({
        id: 'deployment-new',
        status: 'failed',
      })
      expect(replacementMock.deploymentUpdates).not.toContainEqual({
        id: 'existing-deployment',
        status: 'replaced',
      })
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
