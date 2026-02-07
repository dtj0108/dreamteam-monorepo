import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../schedule-templates', () => ({
  cloneScheduleTemplatesForDeployment: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../agent-resources', () => ({
  ensureAgentResourcesForDeployment: vi.fn().mockResolvedValue(undefined),
}))

import { getProvisioningIssues, provisionDeploymentResources } from '../deployment-resources'
import { cloneScheduleTemplatesForDeployment } from '../schedule-templates'
import { ensureAgentResourcesForDeployment } from '../agent-resources'

const mockCloneScheduleTemplatesForDeployment =
  cloneScheduleTemplatesForDeployment as unknown as ReturnType<typeof vi.fn>
const mockEnsureAgentResourcesForDeployment =
  ensureAgentResourcesForDeployment as unknown as ReturnType<typeof vi.fn>

function createProvisioningSupabaseMock() {
  const inCalls: {
    profiles: string[][]
    channels: string[][]
    schedules: string[][]
    templates: string[][]
  } = {
    profiles: [],
    channels: [],
    schedules: [],
    templates: [],
  }

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockImplementation((_: string, ids: string[]) => {
                  inCalls.profiles.push(ids)
                  return Promise.resolve({ count: 0 })
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'channels') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockImplementation((_: string, ids: string[]) => {
                  inCalls.channels.push(ids)
                  return Promise.resolve({ count: 0 })
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'agent_schedules') {
        return {
          select: vi.fn().mockImplementation((columns: string) => {
            if (columns === 'id') {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    in: vi.fn().mockImplementation((_: string, ids: string[]) => {
                      inCalls.schedules.push(ids)
                      return Promise.resolve({ count: 0 })
                    }),
                  }),
                }),
              }
            }

            if (columns === 'agent_id') {
              return {
                in: vi.fn().mockImplementation((_: string, ids: string[]) => {
                  inCalls.templates.push(ids)
                  return {
                    eq: vi.fn().mockResolvedValue({ data: [] }),
                  }
                }),
              }
            }

            throw new Error(`Unexpected columns: ${columns}`)
          }),
        }
      }

      if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { supabase, inCalls }
}

describe('getProvisioningIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns no_schedules when expected agents exist but workspace has zero schedules', () => {
    const issues = getProvisioningIssues(2, {
      profiles: 2,
      channels: 2,
      schedules: 0,
    })

    expect(issues).toEqual(['no_schedules'])
  })

  it('returns profile/channel issues when provisioned resources are below expected count', () => {
    const issues = getProvisioningIssues(3, {
      profiles: 1,
      channels: 2,
      schedules: 5,
    })

    expect(issues).toEqual(['profiles_missing', 'channels_missing'])
  })

  it('returns empty issues for complete provisioning', () => {
    const issues = getProvisioningIssues(2, {
      profiles: 2,
      channels: 2,
      schedules: 1,
    })

    expect(issues).toEqual([])
  })

  it('does not flag no_schedules when expected agents is zero', () => {
    const issues = getProvisioningIssues(0, {
      profiles: 0,
      channels: 0,
      schedules: 0,
    })

    expect(issues).toEqual([])
  })

  it('scopes profile/channel/schedule counts to enabled agent IDs during provisioning', async () => {
    const { supabase, inCalls } = createProvisioningSupabaseMock()

    const deployedConfig = {
      team: { id: 'team-1', name: 'Starter Team', slug: 'starter', head_agent_id: null },
      agents: [
        {
          id: 'agent-a',
          slug: 'agent-a',
          name: 'Agent A',
          description: null,
          avatar_url: null,
          system_prompt: '',
          model: 'sonnet',
          is_enabled: true,
          tools: [],
          skills: [],
          mind: [],
          rules: [],
        },
      ],
      delegations: [],
      team_mind: [],
    } as any

    const summary = await provisionDeploymentResources(
      supabase as any,
      'workspace-1',
      deployedConfig,
      { retryOnce: false }
    )

    expect(summary.isComplete).toBe(false)
    expect(summary.issues).toEqual(['profiles_missing', 'channels_missing', 'no_schedules'])
    expect(inCalls.profiles).toEqual([['agent-a']])
    expect(inCalls.channels).toEqual([['agent-a']])
    expect(inCalls.schedules).toEqual([['agent-a']])
    expect(inCalls.templates).toEqual([['agent-a']])
    expect(mockCloneScheduleTemplatesForDeployment).toHaveBeenCalledTimes(1)
    expect(mockEnsureAgentResourcesForDeployment).toHaveBeenCalledTimes(1)
  })
})
