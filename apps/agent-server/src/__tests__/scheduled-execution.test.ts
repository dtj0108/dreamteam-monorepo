/**
 * Unit tests for Scheduled Execution Handler
 *
 * Tests the scheduled task execution path including:
 * - Authentication (cron secret validation)
 * - Request validation (UUID format, required fields)
 * - Agent loading and configuration
 * - MCP client pool integration
 * - Provider selection (Anthropic, xAI)
 * - Execution status tracking
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Request, Response } from "express"

// Mock external dependencies before importing the handler
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

vi.mock("../lib/mcp-client-pool.js", () => ({
  mcpClientPool: {
    getClient: vi.fn(),
    dispose: vi.fn(),
  },
}))

vi.mock("../lib/ai-providers.js", () => ({
  getModel: vi.fn(),
  getApiKeyEnvVar: vi.fn((provider: string) => {
    const envVars: Record<string, string> = {
      anthropic: "ANTHROPIC_API_KEY",
      xai: "XAI_API_KEY",
      openai: "OPENAI_API_KEY",
    }
    return envVars[provider] || `${provider.toUpperCase()}_API_KEY`
  }),
}))

vi.mock("../lib/supabase.js", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("../lib/agent-rules.js", () => ({
  applyRulesToPrompt: vi.fn((prompt: string, rules: any[]) => {
    if (rules && rules.length > 0) {
      return prompt + "\n\n## Rules Applied"
    }
    return prompt
  }),
}))

// Set up environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"

import { scheduledExecutionHandler } from "../scheduled-execution.js"
import { createAdminClient } from "../lib/supabase.js"
import { generateText } from "ai"
import { mcpClientPool } from "../lib/mcp-client-pool.js"
import { getModel, getApiKeyEnvVar } from "../lib/ai-providers.js"

// Valid UUIDs for testing
const VALID_EXECUTION_ID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_AGENT_ID = "660e8400-e29b-41d4-a716-446655440001"
const VALID_WORKSPACE_ID = "770e8400-e29b-41d4-a716-446655440002"

// Valid request body
const validRequestBody = {
  executionId: VALID_EXECUTION_ID,
  agentId: VALID_AGENT_ID,
  taskPrompt: "Generate a daily report",
  workspaceId: VALID_WORKSPACE_ID,
}

// Mock agent data
const mockAgent = {
  id: VALID_AGENT_ID,
  name: "Test Agent",
  system_prompt: "You are a helpful assistant",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  is_enabled: true,
  tools: [],
  skills: [],
  rules: [],
}

// Helper to create mock Express request
function createMockRequest(body: Record<string, unknown> = {}, headers: Record<string, string> = {}): Request {
  return {
    method: "POST",
    path: "/scheduled-execution",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  } as unknown as Request
}

// Helper to create mock Express response
function createMockResponse() {
  const jsonFn = vi.fn()
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn })

  const res = {
    status: statusFn,
    json: jsonFn,
  } as unknown as Response

  return { res, jsonFn, statusFn }
}

// Create a proper chainable mock for Supabase
function createMockSupabaseClient() {
  // Store the update calls to verify later
  const updateCalls: any[] = []

  // Create chainable methods that return `this`
  const chainable = {
    from: vi.fn(() => chainable),
    select: vi.fn(() => chainable),
    insert: vi.fn(() => chainable),
    update: vi.fn((data: any) => {
      updateCalls.push(data)
      return chainable
    }),
    eq: vi.fn(() => chainable),
    single: vi.fn(),
    // Store for test access
    _updateCalls: updateCalls,
  }

  return chainable
}

describe("scheduledExecutionHandler", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockRes: Response
  let mockJson: ReturnType<typeof vi.fn>
  let mockStatus: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    mockSupabase = createMockSupabaseClient()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAdminClient>)

    const mocks = createMockResponse()
    mockRes = mocks.res
    mockJson = mocks.jsonFn
    mockStatus = mocks.statusFn
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CRON_SECRET
    delete process.env.XAI_API_KEY
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key"
  })

  describe("Authentication", () => {
    it("should return 401 for missing cron secret when CRON_SECRET is set", async () => {
      process.env.CRON_SECRET = "test-secret"
      const req = createMockRequest(validRequestBody, {})

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it("should return 401 for invalid cron secret", async () => {
      process.env.CRON_SECRET = "test-secret"
      const req = createMockRequest(validRequestBody, {
        authorization: "Bearer wrong-secret",
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it("should proceed when valid cron secret is provided", async () => {
      process.env.CRON_SECRET = "test-secret"
      const req = createMockRequest(validRequestBody, {
        authorization: "Bearer test-secret",
      })

      // Mock successful agent loading
      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      // Mock generateText success
      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).not.toHaveBeenCalledWith(401)
    })

    it("should proceed when CRON_SECRET is not set", async () => {
      delete process.env.CRON_SECRET
      const req = createMockRequest(validRequestBody, {})

      // Mock successful agent loading
      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      // Mock generateText success
      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).not.toHaveBeenCalledWith(401)
    })
  })

  describe("Request Validation", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
    })

    it("should return 400 for missing executionId", async () => {
      const req = createMockRequest({
        agentId: VALID_AGENT_ID,
        taskPrompt: "Test task",
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Invalid request"),
        })
      )
    })

    it("should return 400 for invalid executionId format", async () => {
      const req = createMockRequest({
        executionId: "not-a-uuid",
        agentId: VALID_AGENT_ID,
        taskPrompt: "Test task",
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Invalid request"),
        })
      )
    })

    it("should return 400 for missing agentId", async () => {
      const req = createMockRequest({
        executionId: VALID_EXECUTION_ID,
        taskPrompt: "Test task",
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
    })

    it("should return 400 for invalid agentId format", async () => {
      const req = createMockRequest({
        executionId: VALID_EXECUTION_ID,
        agentId: "invalid-agent-id",
        taskPrompt: "Test task",
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
    })

    it("should return 400 for missing taskPrompt", async () => {
      const req = createMockRequest({
        executionId: VALID_EXECUTION_ID,
        agentId: VALID_AGENT_ID,
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
    })

    it("should return 400 for invalid workspaceId format", async () => {
      const req = createMockRequest({
        executionId: VALID_EXECUTION_ID,
        agentId: VALID_AGENT_ID,
        taskPrompt: "Test task",
        workspaceId: "invalid-workspace-id",
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
    })

    it("should accept valid outputConfig options", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: {
          tone: "friendly",
          format: "bullet_points",
          custom_instructions: "Be extra helpful",
        },
      })

      // Mock successful agent loading
      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      // Mock generateText success
      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).not.toHaveBeenCalledWith(400)
    })

    it("should reject invalid outputConfig tone", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: {
          tone: "invalid_tone",
        },
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(400)
    })
  })

  describe("Agent Loading", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
    })

    it("should return 404 when agent not found", async () => {
      const req = createMockRequest(validRequestBody)

      // Mock agent not found
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: "Not found" } })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({ error: "Not found" })
    })

    it("should return 404 when agent query returns null", async () => {
      const req = createMockRequest(validRequestBody)

      // Mock agent returns null (is_enabled = false filters it out)
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({ error: "Agent not found" })
    })

    it("should load agent with tools, skills, and rules", async () => {
      const req = createMockRequest(validRequestBody)

      const agentWithRelations = {
        ...mockAgent,
        tools: [
          {
            tool_id: "tool-1",
            config: {},
            tool: { id: "tool-1", name: "query_tasks", description: "Query tasks", is_enabled: true },
          },
        ],
        skills: [
          {
            skill_id: "skill-1",
            skill: { id: "skill-1", name: "Data Analysis", description: "Analyze data", skill_content: "How to analyze...", is_enabled: true },
          },
        ],
        rules: [
          { id: "rule-1", rule_type: "always", rule_content: "Be helpful", is_enabled: true },
        ],
      }

      mockSupabase.single.mockResolvedValue({ data: agentWithRelations, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      await scheduledExecutionHandler(req, mockRes)

      // Verify the agent was queried with proper relations
      expect(mockSupabase.from).toHaveBeenCalledWith("ai_agents")
    })
  })

  describe("Execution Status Updates", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      // Mock successful agent loading
      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      // Mock generateText success
      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should update execution status to running at start", async () => {
      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      // Check that update was called with running status
      const runningUpdate = mockSupabase._updateCalls.find((call: any) => call.status === "running")
      expect(runningUpdate).toBeDefined()
      expect(runningUpdate).toMatchObject({
        status: "running",
        started_at: expect.any(String),
      })
    })

    it("should update execution status to completed on success", async () => {
      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      // Find the completed update call
      const completedUpdate = mockSupabase._updateCalls.find((call: any) => call.status === "completed")

      expect(completedUpdate).toBeDefined()
      expect(completedUpdate).toMatchObject({
        status: "completed",
        completed_at: expect.any(String),
        result: expect.any(Object),
      })
    })

    it("should return success response with execution details", async () => {
      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          executionId: VALID_EXECUTION_ID,
          duration: expect.any(Number),
          usage: expect.objectContaining({
            inputTokens: expect.any(Number),
            outputTokens: expect.any(Number),
          }),
        })
      )
    })

    it("should store token usage in execution record", async () => {
      const req = createMockRequest(validRequestBody)

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 150, completionTokens: 75 },
      } as any)

      await scheduledExecutionHandler(req, mockRes)

      // Find the completed update call
      const completedUpdate = mockSupabase._updateCalls.find((call: any) => call.status === "completed")

      expect(completedUpdate).toMatchObject({
        tokens_input: 150,
        tokens_output: 75,
      })
    })
  })

  describe("Provider Selection", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should use anthropic provider by default", async () => {
      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(getModel).toHaveBeenCalledWith("anthropic", expect.any(String))
    })

    it("should use anthropic provider when explicitly set", async () => {
      const anthropicAgent = { ...mockAgent, provider: "anthropic" }
      mockSupabase.single.mockResolvedValue({ data: anthropicAgent, error: null })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(getModel).toHaveBeenCalledWith("anthropic", expect.any(String))
    })

    it("should use xAI provider when specified", async () => {
      process.env.XAI_API_KEY = "test-xai-key"

      const xaiAgent = { ...mockAgent, provider: "xai", model: "grok-4-fast" }
      mockSupabase.single.mockResolvedValue({ data: xaiAgent, error: null })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(getModel).toHaveBeenCalledWith("xai", "grok-4-fast")
    })

    it("should return 500 for missing API key", async () => {
      delete process.env.ANTHROPIC_API_KEY

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({ error: "API key not configured: ANTHROPIC_API_KEY" })
    })
  })

  describe("MCP Client Integration", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      const agentWithTools = {
        ...mockAgent,
        tools: [
          {
            tool_id: "tool-1",
            config: {},
            tool: { id: "tool-1", name: "query_tasks", description: "Query tasks", is_enabled: true },
          },
        ],
      }
      mockSupabase.single.mockResolvedValue({ data: agentWithTools, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should get MCP client from pool when tools are available", async () => {
      const mockTools = { query_tasks: { name: "query_tasks", description: "Query tasks" } }
      vi.mocked(mcpClientPool.getClient).mockResolvedValue({
        client: { close: vi.fn() } as any,
        tools: mockTools,
        isNew: true,
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mcpClientPool.getClient).toHaveBeenCalledWith(
        VALID_WORKSPACE_ID,
        ["query_tasks"],
        "scheduled-execution"
      )
    })

    it("should not create MCP client when no workspaceId provided", async () => {
      const reqWithoutWorkspace = createMockRequest({
        executionId: VALID_EXECUTION_ID,
        agentId: VALID_AGENT_ID,
        taskPrompt: "Test task",
        // No workspaceId
      })

      await scheduledExecutionHandler(reqWithoutWorkspace, mockRes)

      expect(mcpClientPool.getClient).not.toHaveBeenCalled()
    })

    it("should not create MCP client when no tools assigned", async () => {
      const agentWithoutTools = { ...mockAgent, tools: [] }
      mockSupabase.single.mockResolvedValue({ data: agentWithoutTools, error: null })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mcpClientPool.getClient).not.toHaveBeenCalled()
    })

    it("should continue without tools when MCP client creation fails", async () => {
      vi.mocked(mcpClientPool.getClient).mockRejectedValue(new Error("MCP connection failed"))

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      // Should still complete successfully without tools
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it("should pass tools to generateText when available", async () => {
      const mockTools = { query_tasks: { name: "query_tasks", description: "Query tasks" } }
      vi.mocked(mcpClientPool.getClient).mockResolvedValue({
        client: { close: vi.fn() } as any,
        tools: mockTools,
        isNew: true,
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        })
      )
    })
  })

  describe("Tool Call Tracking", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      const agentWithTools = {
        ...mockAgent,
        tools: [
          {
            tool_id: "tool-1",
            config: {},
            tool: { id: "tool-1", name: "query_tasks", description: "Query tasks", is_enabled: true },
          },
        ],
      }
      mockSupabase.single.mockResolvedValue({ data: agentWithTools, error: null })

      const mockTools = { query_tasks: { name: "query_tasks", description: "Query tasks" } }
      vi.mocked(mcpClientPool.getClient).mockResolvedValue({
        client: { close: vi.fn() } as any,
        tools: mockTools,
        isNew: true,
      })
    })

    it("should track tool calls from onStepFinish", async () => {
      // Mock generateText to capture and call onStepFinish
      let capturedOnStepFinish: Function | undefined
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedOnStepFinish = options.onStepFinish
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      // Simulate tool call
      if (capturedOnStepFinish) {
        await capturedOnStepFinish({
          toolCalls: [
            { toolName: "query_tasks", args: { status: "active" } },
          ],
        })
      }

      // Verify the completed execution record includes tool calls
      const completedUpdate = mockSupabase._updateCalls.find((call: any) => call.status === "completed")

      expect(completedUpdate).toHaveProperty("tool_calls")
    })
  })

  describe("Error Handling", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key"

      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })
    })

    it("should update execution to failed on execution error", async () => {
      vi.mocked(generateText).mockRejectedValue(new Error("AI provider error"))

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(500)

      // Check that execution was marked failed
      const failedUpdate = mockSupabase._updateCalls.find((call: any) => call.status === "failed")

      expect(failedUpdate).toBeDefined()
      expect(failedUpdate).toMatchObject({
        status: "failed",
        error_message: expect.stringContaining("AI provider error"),
        completed_at: expect.any(String),
      })
    })

    it("should handle unknown errors gracefully", async () => {
      vi.mocked(generateText).mockRejectedValue("Unknown error")

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockStatus).toHaveBeenCalledWith(500)
    })

    it("should return 500 with error message on failure", async () => {
      vi.mocked(generateText).mockRejectedValue(new Error("Model not available"))

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mockJson).toHaveBeenCalledWith({
        error: "Model not available",
      })
    })
  })

  describe("Prompt Building", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should include workspace context when workspaceId provided", async () => {
      const req = createMockRequest(validRequestBody)

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      // The task prompt should include workspace context
      expect(capturedMessages).toBeDefined()
      expect(capturedMessages[0].content).toContain(VALID_WORKSPACE_ID)
    })

    it("should include warning when no workspaceId provided", async () => {
      const reqWithoutWorkspace = createMockRequest({
        executionId: VALID_EXECUTION_ID,
        agentId: VALID_AGENT_ID,
        taskPrompt: "Test task",
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(reqWithoutWorkspace, mockRes)

      expect(capturedMessages[0].content).toContain("No Workspace Context")
    })

    it("should include output instructions in prompt", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: {
          tone: "professional",
          format: "structured",
        },
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("professional")
    })

    it("should apply rules to system prompt", async () => {
      const agentWithRules = {
        ...mockAgent,
        rules: [
          { id: "rule-1", rule_type: "always", rule_content: "Be concise", is_enabled: true },
        ],
      }
      mockSupabase.single.mockResolvedValue({ data: agentWithRules, error: null })

      const { applyRulesToPrompt } = await import("../lib/agent-rules.js")

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(applyRulesToPrompt).toHaveBeenCalled()
    })
  })

  describe("Skills Integration", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
    })

    it("should include skills in system prompt", async () => {
      const agentWithSkills = {
        ...mockAgent,
        skills: [
          {
            skill_id: "skill-1",
            skill: {
              id: "skill-1",
              name: "Data Analysis",
              description: "Analyze data",
              skill_content: "How to analyze data effectively...",
              is_enabled: true,
            },
          },
        ],
      }
      mockSupabase.single.mockResolvedValue({ data: agentWithSkills, error: null })

      let capturedSystem: string
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedSystem = options.system
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedSystem!).toContain("Available Skills")
      expect(capturedSystem!).toContain("Data Analysis")
      expect(capturedSystem!).toContain("How to analyze data effectively...")
    })

    it("should filter out disabled skills", async () => {
      const agentWithSkills = {
        ...mockAgent,
        skills: [
          {
            skill_id: "skill-1",
            skill: {
              id: "skill-1",
              name: "Enabled Skill",
              description: "This is enabled",
              skill_content: "Content...",
              is_enabled: true,
            },
          },
          {
            skill_id: "skill-2",
            skill: {
              id: "skill-2",
              name: "Disabled Skill",
              description: "This is disabled",
              skill_content: "Content...",
              is_enabled: false,
            },
          },
        ],
      }
      mockSupabase.single.mockResolvedValue({ data: agentWithSkills, error: null })

      let capturedSystem: string
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedSystem = options.system
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedSystem!).toContain("Enabled Skill")
      expect(capturedSystem!).not.toContain("Disabled Skill")
    })
  })

  describe("Tools Filtering", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should only use enabled tools", async () => {
      const agentWithMixedTools = {
        ...mockAgent,
        tools: [
          {
            tool_id: "tool-1",
            config: {},
            tool: { id: "tool-1", name: "enabled_tool", description: "Enabled", is_enabled: true },
          },
          {
            tool_id: "tool-2",
            config: {},
            tool: { id: "tool-2", name: "disabled_tool", description: "Disabled", is_enabled: false },
          },
        ],
      }
      mockSupabase.single.mockResolvedValue({ data: agentWithMixedTools, error: null })

      const mockTools = { enabled_tool: { name: "enabled_tool" } }
      vi.mocked(mcpClientPool.getClient).mockResolvedValue({
        client: { close: vi.fn() } as any,
        tools: mockTools,
        isNew: true,
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(mcpClientPool.getClient).toHaveBeenCalledWith(
        VALID_WORKSPACE_ID,
        ["enabled_tool"], // Only enabled tool
        "scheduled-execution"
      )
    })
  })

  describe("Output Instructions", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should apply friendly tone", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: { tone: "friendly" },
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("warm, friendly")
    })

    it("should apply concise tone", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: { tone: "concise" },
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("extremely concise")
    })

    it("should apply bullet points format", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: { format: "bullet_points" },
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("bullet points")
    })

    it("should apply structured format", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: { format: "structured" },
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("sections with headers")
    })

    it("should include custom instructions", async () => {
      const req = createMockRequest({
        ...validRequestBody,
        outputConfig: {
          custom_instructions: "Always include code examples",
        },
      })

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("Always include code examples")
    })

    it("should use default instructions when no outputConfig provided", async () => {
      const req = createMockRequest(validRequestBody)

      let capturedMessages: any
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedMessages = options.messages
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedMessages[0].content).toContain("Write naturally")
    })
  })

  describe("Duration Tracking", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET

      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)
    })

    it("should track execution duration", async () => {
      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      const jsonCall = mockJson.mock.calls[0][0]
      expect(jsonCall.duration).toBeGreaterThanOrEqual(0)
      expect(jsonCall.duration).toBeLessThan(10000) // Should be quick in tests
    })

    it("should store duration in execution record", async () => {
      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      const completedUpdate = mockSupabase._updateCalls.find((call: any) => call.status === "completed")

      expect(completedUpdate).toHaveProperty("duration_ms")
      expect(completedUpdate.duration_ms).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Edge Cases", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
    })

    it("should handle agent with no system prompt", async () => {
      const agentWithoutPrompt = { ...mockAgent, system_prompt: null }
      mockSupabase.single.mockResolvedValue({ data: agentWithoutPrompt, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      let capturedSystem: string
      vi.mocked(generateText).mockImplementation((options: any) => {
        capturedSystem = options.system
        return Promise.resolve({
          text: "Task completed",
          usage: { promptTokens: 100, completionTokens: 50 },
        } as any)
      })

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      expect(capturedSystem!).toContain("Critical Instructions")
    })

    it("should handle agent with empty tool list", async () => {
      const agentWithEmptyTools = { ...mockAgent, tools: [] }
      mockSupabase.single.mockResolvedValue({ data: agentWithEmptyTools, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      const jsonCall = mockJson.mock.calls[0][0]
      expect(jsonCall.success).toBe(true)
    })

    it("should handle generateText returning undefined usage", async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: undefined,
      } as any)

      const req = createMockRequest(validRequestBody)

      await scheduledExecutionHandler(req, mockRes)

      const jsonCall = mockJson.mock.calls[0][0]
      expect(jsonCall.success).toBe(true)
      expect(jsonCall.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    it("should handle supabase update failures gracefully", async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAgent, error: null })

      // Make the final update (completed status) fail
      const originalUpdate = mockSupabase.update
      let updateCallCount = 0
      mockSupabase.update.mockImplementation((data: any) => {
        updateCallCount++
        // The third update call should be the completed status update
        if (updateCallCount >= 2 && data.status === "completed") {
          throw new Error("Database error")
        }
        return mockSupabase
      })

      vi.mocked(generateText).mockResolvedValue({
        text: "Task completed",
        usage: { promptTokens: 100, completionTokens: 50 },
      } as any)

      const req = createMockRequest(validRequestBody)

      // Should return 500 when final update fails
      await scheduledExecutionHandler(req, mockRes)
      
      // Even if the final update fails, the catch block should handle it
      // The error happens after generateText succeeds, so the main try block
      // catches the update error and returns 500
      expect(mockStatus).toHaveBeenCalledWith(500)
    })
  })
})
