/**
 * Unit tests for Agent Executor
 *
 * Tests the agent task execution including:
 * - executeAgentTask() function
 * - Tool limit enforcement
 * - Style preset application
 * - Custom instructions injection
 * - Provider/model resolution
 * - Tool call extraction from steps
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock AI SDK before importing
vi.mock('ai', () => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn(() => () => false), // Mock step count predicate
  tool: vi.fn((config) => ({ ...config, _type: 'tool' })), // Mock tool helper
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((modelId: string) => ({ id: `anthropic:${modelId}` })),
}))

vi.mock('@ai-sdk/xai', () => ({
  xai: vi.fn((modelId: string) => ({ id: `xai:${modelId}` })),
}))

vi.mock('@/lib/agent/tool-registry', () => ({
  buildAgentTools: vi.fn(() => ({
    getTransactions: { description: 'Get transactions' },
    getBudgets: { description: 'Get budgets' },
  })),
}))

vi.mock('@/lib/style-instructions', () => ({
  buildFullSystemPrompt: vi.fn((base, style, custom) => {
    let result = base
    if (style?.verbosity === 'concise') {
      result += '\n\nBe concise.'
    }
    if (custom) {
      result += `\n\n${custom}`
    }
    return result
  }),
}))

// Mock fetch for debug logging
vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()))

// Set up env vars
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.XAI_API_KEY = 'test-xai-key'

import { executeAgentTask, type ExecuteParams, type ExecuteResult } from '@/lib/agent-executor'
import { generateText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { xai } from '@ai-sdk/xai'
import { buildAgentTools } from '@/lib/agent/tool-registry'
import { buildFullSystemPrompt } from '@/lib/style-instructions'

// Sample mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
}

describe('Agent Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('executeAgentTask', () => {
    it('should execute task and return result', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Task completed successfully',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Generate a report',
        systemPrompt: 'You are a helpful assistant',
        tools: ['transactions', 'budgets'],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.text).toBe('Task completed successfully')
      expect(result.usage.promptTokens).toBe(100)
      expect(result.usage.completionTokens).toBe(50)
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should use Anthropic provider by default', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        // No provider specified
      }

      await executeAgentTask(params)

      expect(anthropic).toHaveBeenCalledWith('claude-sonnet-4-20250514')
      expect(xai).not.toHaveBeenCalled()
    })

    it('should use xAI provider when specified', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        provider: 'xai',
        model: 'grok-4-fast',
      }

      await executeAgentTask(params)

      expect(xai).toHaveBeenCalledWith('grok-4-fast')
      expect(anthropic).not.toHaveBeenCalled()
    })

    it('should use default model for xAI when not specified', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        provider: 'xai',
        // No model specified
      }

      await executeAgentTask(params)

      expect(xai).toHaveBeenCalledWith('grok-4-fast')
    })

    it('should resolve model aliases for Anthropic', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        provider: 'anthropic',
        model: 'sonnet', // Alias
      }

      await executeAgentTask(params)

      expect(anthropic).toHaveBeenCalledWith('claude-sonnet-4-20250514')
    })

    it('should resolve model aliases for xAI', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        provider: 'xai',
        model: 'grok', // Alias
      }

      await executeAgentTask(params)

      expect(xai).toHaveBeenCalledWith('grok-4-fast')
    })
  })

  describe('Tool Building', () => {
    it('should build tools with correct context', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Get transactions',
        systemPrompt: 'You are helpful',
        tools: ['transactions', 'budgets'],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      await executeAgentTask(params)

      expect(buildAgentTools).toHaveBeenCalledWith(
        ['transactions', 'budgets'],
        expect.objectContaining({
          userId: 'system',
          workspaceId: 'ws-123',
          supabase: mockSupabase,
        })
      )
    })

    it('should handle empty tools array', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done without tools',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Just respond',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(buildAgentTools).toHaveBeenCalledWith([], expect.anything())
      expect(result.text).toBe('Done without tools')
    })
  })

  describe('Style Preset Application', () => {
    it('should apply style presets to system prompt', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        stylePresets: {
          verbosity: 'concise',
          tone: 'formal',
          examples: 'few',
        },
      }

      await executeAgentTask(params)

      expect(buildFullSystemPrompt).toHaveBeenCalledWith(
        'You are helpful',
        {
          verbosity: 'concise',
          tone: 'formal',
          examples: 'few',
        },
        undefined
      )
    })

    it('should handle null style presets', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        stylePresets: null,
      }

      await executeAgentTask(params)

      expect(buildFullSystemPrompt).toHaveBeenCalledWith(
        'You are helpful',
        null,
        undefined
      )
    })
  })

  describe('Custom Instructions', () => {
    it('should apply custom instructions to system prompt', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        customInstructions: 'Always format output as bullet points',
      }

      await executeAgentTask(params)

      expect(buildFullSystemPrompt).toHaveBeenCalledWith(
        'You are helpful',
        undefined,
        'Always format output as bullet points'
      )
    })

    it('should handle null custom instructions', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        customInstructions: null,
      }

      await executeAgentTask(params)

      expect(buildFullSystemPrompt).toHaveBeenCalledWith(
        'You are helpful',
        undefined,
        null
      )
    })

    it('should apply both style presets and custom instructions', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        stylePresets: { verbosity: 'detailed' },
        customInstructions: 'Include examples',
      }

      await executeAgentTask(params)

      expect(buildFullSystemPrompt).toHaveBeenCalledWith(
        'You are helpful',
        { verbosity: 'detailed' },
        'Include examples'
      )
    })
  })

  describe('Tool Call Extraction', () => {
    it('should extract tool calls from steps', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Here are the results',
        steps: [
          {
            toolCalls: [
              { toolName: 'getTransactions', args: { limit: 10 } },
              { toolName: 'getBudgets', args: {} },
            ],
            toolResults: [
              { toolName: 'getTransactions', result: [{ id: 1 }] },
              { toolName: 'getBudgets', result: [{ id: 2 }] },
            ],
          },
        ],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as unknown as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Get data',
        systemPrompt: 'You are helpful',
        tools: ['transactions', 'budgets'],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.toolCalls).toHaveLength(2)
      expect(result.toolCalls[0].toolName).toBe('getTransactions')
      expect(result.toolCalls[0].args).toEqual({ limit: 10 })
      expect(result.toolCalls[1].toolName).toBe('getBudgets')
    })

    it('should match tool results to tool calls', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [
          {
            toolCalls: [
              { toolName: 'getTransactions', args: { limit: 5 } },
            ],
            toolResults: [
              { toolName: 'getTransactions', result: { transactions: [] } },
            ],
          },
        ],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as unknown as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Get transactions',
        systemPrompt: 'You are helpful',
        tools: ['transactions'],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.toolCalls[0].result).toEqual({ transactions: [] })
    })

    it('should handle multiple steps with tool calls', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done after multiple steps',
        steps: [
          {
            toolCalls: [
              { toolName: 'getTransactions', args: {} },
            ],
            toolResults: [
              { toolName: 'getTransactions', result: { count: 10 } },
            ],
          },
          {
            toolCalls: [
              { toolName: 'getBudgets', args: { active: true } },
            ],
            toolResults: [
              { toolName: 'getBudgets', result: { count: 3 } },
            ],
          },
        ],
        usage: { promptTokens: 200, completionTokens: 100 },
      } as unknown as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Analyze finances',
        systemPrompt: 'You are helpful',
        tools: ['transactions', 'budgets'],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.toolCalls).toHaveLength(2)
      expect(result.toolCalls[0].toolName).toBe('getTransactions')
      expect(result.toolCalls[1].toolName).toBe('getBudgets')
    })

    it('should handle steps without tool calls', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Response without tools',
        steps: [
          {
            // No toolCalls or toolResults
          },
        ],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as unknown as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Just respond',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.toolCalls).toHaveLength(0)
    })
  })

  describe('Step Count Limit', () => {
    it('should use stepCountIs for limiting steps', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      await executeAgentTask(params)

      expect(stepCountIs).toHaveBeenCalledWith(10)
    })
  })

  describe('Error Handling', () => {
    it('should propagate API errors', async () => {
      const apiError = new Error('API rate limit exceeded')
      vi.mocked(generateText).mockRejectedValue(apiError)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      await expect(executeAgentTask(params)).rejects.toThrow('API rate limit exceeded')
    })

    it('should propagate authentication errors', async () => {
      const authError = new Error('Invalid API key')
      vi.mocked(generateText).mockRejectedValue(authError)

      const params: ExecuteParams = {
        taskPrompt: 'Do something',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      await expect(executeAgentTask(params)).rejects.toThrow('Invalid API key')
    })
  })

  describe('Usage Tracking', () => {
    it('should return usage with correct token counts', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: { promptTokens: 1500, completionTokens: 750 },
      } as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Complex task',
        systemPrompt: 'You are helpful',
        tools: ['transactions'],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.usage.promptTokens).toBe(1500)
      expect(result.usage.completionTokens).toBe(750)
    })

    it('should handle missing usage data gracefully', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Done',
        steps: [],
        usage: undefined,
      } as unknown as Awaited<ReturnType<typeof generateText>>)

      const params: ExecuteParams = {
        taskPrompt: 'Task',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      // Should default to 0 when usage is undefined
      expect(result.usage.promptTokens).toBe(0)
      expect(result.usage.completionTokens).toBe(0)
    })

    it('should track execution duration', async () => {
      vi.mocked(generateText).mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          text: 'Done',
          steps: [],
          usage: { promptTokens: 100, completionTokens: 50 },
        } as Awaited<ReturnType<typeof generateText>>
      })

      const params: ExecuteParams = {
        taskPrompt: 'Task',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      const result = await executeAgentTask(params)

      expect(result.durationMs).toBeGreaterThan(0)
    })
  })

  describe('Message Construction', () => {
    it('should pass task prompt as user message', async () => {
      let capturedMessages: unknown[] = []
      vi.mocked(generateText).mockImplementation(async (opts) => {
        capturedMessages = (opts as { messages: unknown[] }).messages
        return {
          text: 'Done',
          steps: [],
          usage: { promptTokens: 100, completionTokens: 50 },
        } as Awaited<ReturnType<typeof generateText>>
      })

      const params: ExecuteParams = {
        taskPrompt: 'Generate daily report',
        systemPrompt: 'You are helpful',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
      }

      await executeAgentTask(params)

      expect(capturedMessages).toHaveLength(1)
      expect(capturedMessages[0]).toEqual({
        role: 'user',
        content: 'Generate daily report',
      })
    })

    it('should pass built system prompt', async () => {
      let capturedSystem = ''
      vi.mocked(generateText).mockImplementation(async (opts) => {
        capturedSystem = (opts as { system: string }).system
        return {
          text: 'Done',
          steps: [],
          usage: { promptTokens: 100, completionTokens: 50 },
        } as Awaited<ReturnType<typeof generateText>>
      })

      vi.mocked(buildFullSystemPrompt).mockReturnValue('Enhanced system prompt with styles')

      const params: ExecuteParams = {
        taskPrompt: 'Task',
        systemPrompt: 'Base prompt',
        tools: [],
        workspaceId: 'ws-123',
        supabase: mockSupabase as unknown as ExecuteParams['supabase'],
        stylePresets: { verbosity: 'concise' },
      }

      await executeAgentTask(params)

      expect(capturedSystem).toBe('Enhanced system prompt with styles')
    })
  })
})
