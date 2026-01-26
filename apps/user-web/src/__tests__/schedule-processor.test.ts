/**
 * Unit tests for Schedule Processor
 *
 * Tests the critical schedule execution path including:
 * - Finding due schedules
 * - Approval workflow (pending_approval vs running)
 * - Execution record creation
 * - Next run time calculation
 * - Timezone handling
 * - Notification delivery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing the module under test
vi.mock('croner', () => {
  const MockCron = vi.fn(function(this: { nextRun: () => Date }) {
    this.nextRun = () => new Date('2024-02-01T09:00:00Z')
  })
  return { Cron: MockCron }
})

vi.mock('@/lib/agent-executor', () => ({
  executeAgentTask: vi.fn(),
}))

vi.mock('@/lib/agent-messaging', () => ({
  sendAgentMessage: vi.fn(() => Promise.resolve({ success: true })),
  formatTaskCompletionMessage: vi.fn((params) => `Task ${params.status}: ${params.scheduleName}`),
  getWorkspaceAdminIds: vi.fn(() => Promise.resolve([])),
  getWorkspaceOwnerId: vi.fn(() => Promise.resolve('owner-123')),
}))

// Mock database - will be overridden per test
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

vi.mock('@dreamteam/database/server', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
}))

import { processAgentSchedules, processApprovedExecutions } from '@/lib/schedule-processor'
import { executeAgentTask } from '@/lib/agent-executor'
import { sendAgentMessage, formatTaskCompletionMessage, getWorkspaceAdminIds, getWorkspaceOwnerId } from '@/lib/agent-messaging'
import { Cron } from 'croner'

// Sample data for tests
const mockSchedule = {
  id: 'schedule-123',
  agent_id: 'ai-agent-456',
  name: 'Daily Report',
  cron_expression: '0 9 * * *',
  timezone: 'America/New_York',
  task_prompt: 'Generate daily report',
  requires_approval: false,
  is_enabled: true,
  next_run_at: '2024-01-15T09:00:00Z',
  created_by: 'user-789',
  ai_agent: {
    id: 'ai-agent-456',
    name: 'Report Agent',
    system_prompt: 'You generate reports',
    provider: 'anthropic',
    model: 'sonnet',
  },
}

const mockLocalAgent = {
  id: 'local-agent-123',
  workspace_id: 'ws-456',
  tools: ['tool1', 'tool2'],
  system_prompt: 'Custom prompt',
  reports_to: null,
  style_presets: null,
  custom_instructions: null,
}

const mockExecution = {
  id: 'exec-123',
  schedule_id: 'schedule-123',
  agent_id: 'ai-agent-456',
  scheduled_for: '2024-01-15T09:00:00Z',
  status: 'running',
  started_at: '2024-01-15T09:00:00Z',
}

describe('Schedule Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))

    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock fetch for debug logging
    vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('processAgentSchedules', () => {
    it('should find and process due schedules', async () => {
      // Setup: Schedule is due (next_run_at <= now)
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      // Mock local agent lookup
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      // Mock execution insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockExecution,
        error: null,
      })

      // Mock schedule update
      mockSupabaseClient.eq.mockReturnThis()

      // Mock executeAgentTask
      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Report generated successfully',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1500,
      })

      const result = await processAgentSchedules()

      expect(result.processed).toBe(1)
      expect(result.errors).toBe(0)
    })

    it('should create execution with pending_approval status when approval required', async () => {
      const scheduleWithApproval = {
        ...mockSchedule,
        requires_approval: true,
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [scheduleWithApproval],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      let insertedStatus = ''
      mockSupabaseClient.insert.mockImplementation((data) => {
        insertedStatus = (data as { status: string }).status
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...mockExecution, status: 'pending_approval' },
            error: null,
          }),
        }
      })

      await processAgentSchedules()

      // Verify status is pending_approval
      expect(insertedStatus).toBe('pending_approval')
      // Should NOT call executeAgentTask when approval required
      expect(executeAgentTask).not.toHaveBeenCalled()
    })

    it('should execute immediately when approval not required', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule], // requires_approval: false
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      let insertedStatus = ''
      mockSupabaseClient.insert.mockImplementation((data) => {
        insertedStatus = (data as { status: string }).status
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockExecution,
            error: null,
          }),
        }
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      expect(insertedStatus).toBe('running')
      expect(executeAgentTask).toHaveBeenCalled()
    })

    it('should skip schedule when no local agent found', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      // No local agent
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await processAgentSchedules()

      // Should skip without error
      expect(result.processed).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should calculate next run time using cron expression', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      let updateData: Record<string, unknown> = {}
      mockSupabaseClient.update.mockImplementation((data) => {
        updateData = data
        return {
          eq: vi.fn().mockReturnThis(),
        }
      })

      await processAgentSchedules()

      // Verify Cron was called with correct expression and timezone
      expect(Cron).toHaveBeenCalledWith('0 9 * * *', { timezone: 'America/New_York' })
    })

    it('should handle database error gracefully', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })

      const result = await processAgentSchedules()

      expect(result.processed).toBe(0)
      expect(result.errors).toBe(1)
    })

    it('should use UTC when timezone not specified', async () => {
      const scheduleNoTimezone = {
        ...mockSchedule,
        timezone: '', // Empty timezone
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [scheduleNoTimezone],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      // Should default to UTC
      expect(Cron).toHaveBeenCalledWith('0 9 * * *', { timezone: 'UTC' })
    })
  })

  describe('processApprovedExecutions', () => {
    it('should process approved executions', async () => {
      const approvedExec = {
        id: 'exec-456',
        agent_id: 'ai-agent-456',
        approved_by: 'admin-123',
        schedule: {
          ...mockSchedule,
          ai_agent: mockSchedule.ai_agent,
        },
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [approvedExec],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Execution complete',
        toolCalls: [{ toolName: 'search', args: {}, result: {} }],
        usage: { promptTokens: 200, completionTokens: 100 },
        durationMs: 2500,
      })

      const result = await processApprovedExecutions()

      expect(result.processed).toBe(1)
      expect(result.errors).toBe(0)
      expect(executeAgentTask).toHaveBeenCalled()
    })

    it('should update execution status to running before executing', async () => {
      const approvedExec = {
        id: 'exec-456',
        agent_id: 'ai-agent-456',
        approved_by: 'admin-123',
        schedule: mockSchedule,
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [approvedExec],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      let statusUpdates: string[] = []
      mockSupabaseClient.update.mockImplementation((data) => {
        if ((data as { status: string }).status) {
          statusUpdates.push((data as { status: string }).status)
        }
        return {
          eq: vi.fn().mockReturnThis(),
        }
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processApprovedExecutions()

      // Should update to 'running' first, then 'completed'
      expect(statusUpdates).toContain('running')
    })

    it('should mark execution as failed when local agent not found', async () => {
      const approvedExec = {
        id: 'exec-456',
        agent_id: 'ai-agent-456',
        approved_by: 'admin-123',
        schedule: mockSchedule,
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [approvedExec],
          error: null,
        }),
      })

      // No local agent found
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      let finalStatus = ''
      mockSupabaseClient.update.mockImplementation((data) => {
        if ((data as { status: string }).status) {
          finalStatus = (data as { status: string }).status
        }
        return {
          eq: vi.fn().mockReturnThis(),
        }
      })

      const result = await processApprovedExecutions()

      expect(finalStatus).toBe('failed')
      expect(result.errors).toBe(1)
    })

    it('should handle database fetch error', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })

      const result = await processApprovedExecutions()

      expect(result.processed).toBe(0)
      expect(result.errors).toBe(1)
    })
  })

  describe('Notification Delivery', () => {
    it('should send completion notification to reports_to users', async () => {
      const localAgentWithReportsTo = {
        ...mockLocalAgent,
        reports_to: ['manager-123', 'manager-456'],
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: localAgentWithReportsTo,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Report complete',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      // Should send to both managers
      expect(sendAgentMessage).toHaveBeenCalledTimes(2)
      expect(sendAgentMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientProfileId: 'manager-123',
        })
      )
      expect(sendAgentMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientProfileId: 'manager-456',
        })
      )
    })

    it('should fall back to schedule creator when no reports_to', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule], // created_by: 'user-789'
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent, // reports_to: null
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      expect(sendAgentMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientProfileId: 'user-789', // schedule.created_by
        })
      )
    })

    it('should fall back to workspace owner as last resort', async () => {
      const scheduleNoCreator = {
        ...mockSchedule,
        created_by: null,
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [scheduleNoCreator],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      vi.mocked(getWorkspaceAdminIds).mockResolvedValue([])
      vi.mocked(getWorkspaceOwnerId).mockResolvedValue('owner-123')

      await processAgentSchedules()

      expect(getWorkspaceOwnerId).toHaveBeenCalledWith('ws-456', expect.anything())
      expect(sendAgentMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientProfileId: 'owner-123',
        })
      )
    })

    it('should send failure notification when execution fails', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      // Execution fails
      vi.mocked(executeAgentTask).mockRejectedValue(new Error('API error'))

      await processAgentSchedules()

      // Should send failure notification
      expect(formatTaskCompletionMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      )
    })
  })

  describe('Provider Selection', () => {
    it('should pass provider from AI agent config to executeAgentTask', async () => {
      const xaiSchedule = {
        ...mockSchedule,
        ai_agent: {
          ...mockSchedule.ai_agent,
          provider: 'xai',
          model: 'grok-4-fast',
        },
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [xaiSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      expect(executeAgentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'xai',
          model: 'grok-4-fast',
        })
      )
    })

    it('should default to anthropic when no provider specified', async () => {
      const scheduleNoProvider = {
        ...mockSchedule,
        ai_agent: {
          ...mockSchedule.ai_agent,
          provider: null,
          model: null,
        },
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [scheduleNoProvider],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      expect(executeAgentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'anthropic',
        })
      )
    })
  })

  describe('Style and Custom Instructions', () => {
    it('should pass style presets to executeAgentTask', async () => {
      const localAgentWithStyle = {
        ...mockLocalAgent,
        style_presets: {
          verbosity: 'concise',
          tone: 'formal',
          examples: 'few',
        },
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: localAgentWithStyle,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      expect(executeAgentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          stylePresets: {
            verbosity: 'concise',
            tone: 'formal',
            examples: 'few',
          },
        })
      )
    })

    it('should pass custom instructions to executeAgentTask', async () => {
      const localAgentWithInstructions = {
        ...mockLocalAgent,
        custom_instructions: 'Always format output as bullet points',
      }

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: localAgentWithInstructions,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1000,
      })

      await processAgentSchedules()

      expect(executeAgentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          customInstructions: 'Always format output as bullet points',
        })
      )
    })
  })

  describe('Execution Record Updates', () => {
    it('should store tool calls in execution record', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      const toolCalls = [
        { toolName: 'search', args: { query: 'test' }, result: { found: true } },
        { toolName: 'calculate', args: { a: 1, b: 2 }, result: { sum: 3 } },
      ]

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done with tools',
        toolCalls,
        usage: { promptTokens: 100, completionTokens: 50 },
        durationMs: 1500,
      })

      let updatePayload: Record<string, unknown> = {}
      mockSupabaseClient.update.mockImplementation((data) => {
        updatePayload = data
        return {
          eq: vi.fn().mockReturnThis(),
        }
      })

      await processAgentSchedules()

      expect(updatePayload.tool_calls).toEqual(toolCalls)
    })

    it('should store token usage in execution record', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockResolvedValue({
        text: 'Done',
        toolCalls: [],
        usage: { promptTokens: 250, completionTokens: 150 },
        durationMs: 2000,
      })

      let updatePayload: Record<string, unknown> = {}
      mockSupabaseClient.update.mockImplementation((data) => {
        updatePayload = data
        return {
          eq: vi.fn().mockReturnThis(),
        }
      })

      await processAgentSchedules()

      expect(updatePayload.tokens_input).toBe(250)
      expect(updatePayload.tokens_output).toBe(150)
      expect(updatePayload.duration_ms).toBe(2000)
    })

    it('should store error message when execution fails', async () => {
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
      })

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockLocalAgent,
        error: null,
      })

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExecution,
          error: null,
        }),
      })

      vi.mocked(executeAgentTask).mockRejectedValue(new Error('API rate limit exceeded'))

      let updatePayload: Record<string, unknown> = {}
      mockSupabaseClient.update.mockImplementation((data) => {
        updatePayload = data
        return {
          eq: vi.fn().mockReturnThis(),
        }
      })

      await processAgentSchedules()

      expect(updatePayload.status).toBe('failed')
      expect(updatePayload.error_message).toBe('API rate limit exceeded')
    })
  })
})
