import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cloneScheduleTemplatesForDeployment } from '../schedule-templates'

function buildSupabaseMock(options: {
  templates: Array<{
    agent_id: string
    name: string
    description: string | null
    cron_expression: string
    timezone: string | null
    task_prompt: string
    requires_approval: boolean
    output_config: unknown
  }>
  existingSchedules: Array<{ agent_id: string; name: string }>
  insertResponses?: Array<{ error: { code?: string; message?: string } | null }>
}) {
  const insert = vi.fn().mockImplementation(async () => {
    if (options.insertResponses && options.insertResponses.length > 0) {
      return options.insertResponses.shift()
    }
    return { error: null }
  })

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'agent_schedules') {
        throw new Error(`Unexpected table: ${table}`)
      }
      return {
        select: (columns: string) => {
          if (columns === '*') {
            return {
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: options.templates, error: null }),
              }),
            }
          }
          if (columns === 'agent_id, name') {
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({ data: options.existingSchedules, error: null }),
                }),
              }),
            }
          }
          throw new Error(`Unexpected select columns: ${columns}`)
        },
        insert,
      }
    }),
  }

  return { supabase, insert }
}

describe('cloneScheduleTemplatesForDeployment', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    logSpy.mockClear()
    errorSpy.mockClear()
  })

  it('creates schedules when templates exist and no duplicates', async () => {
    const { supabase, insert } = buildSupabaseMock({
      templates: [
        {
          agent_id: 'agent-1',
          name: 'Daily Summary',
          description: null,
          cron_expression: '0 9 * * *',
          timezone: null,
          task_prompt: 'Summarize daily updates',
          requires_approval: false,
          output_config: {},
        },
      ],
      existingSchedules: [],
    })

    await cloneScheduleTemplatesForDeployment(
      supabase as unknown as any,
      ['agent-1'],
      'workspace-1',
      'owner-1'
    )

    expect(insert).toHaveBeenCalledTimes(1)
    const inserted = insert.mock.calls[0][0][0]
    expect(inserted.workspace_id).toBe('workspace-1')
    expect(inserted.is_template).toBe(false)
    expect(inserted.is_enabled).toBe(true)
    expect(inserted.created_by).toBe('owner-1')
    expect(typeof inserted.next_run_at).toBe('string')
  })

  it('skips insert when schedules already exist', async () => {
    const { supabase, insert } = buildSupabaseMock({
      templates: [
        {
          agent_id: 'agent-1',
          name: 'Daily Summary',
          description: null,
          cron_expression: '0 9 * * *',
          timezone: null,
          task_prompt: 'Summarize daily updates',
          requires_approval: false,
          output_config: {},
        },
      ],
      existingSchedules: [
        { agent_id: 'agent-1', name: 'Daily Summary' },
      ],
    })

    await cloneScheduleTemplatesForDeployment(
      supabase as unknown as any,
      ['agent-1'],
      'workspace-1',
      'owner-1'
    )

    expect(insert).not.toHaveBeenCalled()
  })

  it('skips insert when no templates exist', async () => {
    const { supabase, insert } = buildSupabaseMock({
      templates: [],
      existingSchedules: [],
    })

    await cloneScheduleTemplatesForDeployment(
      supabase as unknown as any,
      ['agent-1'],
      'workspace-1',
      'owner-1'
    )

    expect(insert).not.toHaveBeenCalled()
  })

  it('deduplicates templates by (agent_id, name) before inserting', async () => {
    const { supabase, insert } = buildSupabaseMock({
      templates: [
        {
          agent_id: 'agent-1',
          name: 'Daily Summary',
          description: null,
          cron_expression: '0 9 * * *',
          timezone: null,
          task_prompt: 'First',
          requires_approval: false,
          output_config: {},
        },
        {
          agent_id: 'agent-1',
          name: 'Daily Summary',
          description: null,
          cron_expression: '0 10 * * *',
          timezone: null,
          task_prompt: 'Duplicate',
          requires_approval: false,
          output_config: {},
        },
      ],
      existingSchedules: [],
    })

    await cloneScheduleTemplatesForDeployment(
      supabase as unknown as any,
      ['agent-1'],
      'workspace-1',
      'owner-1'
    )

    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0][0]).toHaveLength(1)
  })

  it('falls back to row inserts when batch insert hits duplicate key errors', async () => {
    const { supabase, insert } = buildSupabaseMock({
      templates: [
        {
          agent_id: 'agent-1',
          name: 'Daily Summary',
          description: null,
          cron_expression: '0 9 * * *',
          timezone: null,
          task_prompt: 'One',
          requires_approval: false,
          output_config: {},
        },
        {
          agent_id: 'agent-2',
          name: 'Daily Summary',
          description: null,
          cron_expression: '0 9 * * *',
          timezone: null,
          task_prompt: 'Two',
          requires_approval: false,
          output_config: {},
        },
      ],
      existingSchedules: [],
      insertResponses: [
        { error: { code: '23505', message: 'duplicate key' } }, // batch
        { error: null }, // row 1
        { error: { code: '23505', message: 'duplicate key' } }, // row 2 ignored
      ],
    })

    await cloneScheduleTemplatesForDeployment(
      supabase as unknown as any,
      ['agent-1', 'agent-2'],
      'workspace-1',
      'owner-1'
    )

    expect(insert).toHaveBeenCalledTimes(3)
  })
})
