/**
 * Unit tests for Agent Chat Handler
 *
 * Tests the core agent execution path including:
 * - Request validation
 * - Team vs Single Agent detection
 * - System prompt assembly
 * - Provider selection (Anthropic vs Vercel AI SDK)
 * - Conversation history loading
 * - Tool filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Request, Response } from "express"

// Mock external dependencies before importing the handler
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}))

vi.mock("ai", () => ({
  streamText: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("../lib/mcp-client.js", () => ({
  createMCPClient: vi.fn(),
}))

vi.mock("../lib/ai-providers.js", () => ({
  getModel: vi.fn(),
  shouldUseVercelAI: vi.fn((provider) => provider && provider !== "anthropic"),
}))

vi.mock("../lib/supabase.js", () => ({
  createAdminClient: vi.fn(),
  authenticateRequest: vi.fn(),
}))

vi.mock("../lib/agent-session.js", () => ({
  storeSession: vi.fn(),
  loadSession: vi.fn(),
  updateSessionUsage: vi.fn(),
  createConversation: vi.fn(() => "conv-123"),
  calculateCost: vi.fn(() => 0.01),
}))

vi.mock("../lib/agent-rules.js", () => ({
  applyRulesToPrompt: vi.fn((prompt, rules) => {
    if (rules && rules.length > 0) {
      return prompt + "\n\n## Rules Applied"
    }
    return prompt
  }),
}))

vi.mock("../lib/team-config.js", () => ({
  loadDeployedTeamConfig: vi.fn(),
  getHeadAgent: vi.fn(),
}))

vi.mock("../lib/delegation-tool.js", () => ({
  buildDelegationTool: vi.fn(() => null),
}))

// Set up environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"

import { agentChatHandler } from "../agent-chat.js"
import { authenticateRequest, createAdminClient } from "../lib/supabase.js"
import { loadDeployedTeamConfig, getHeadAgent } from "../lib/team-config.js"
import { shouldUseVercelAI } from "../lib/ai-providers.js"
import { query } from "@anthropic-ai/claude-agent-sdk"
import { streamText } from "ai"
import { createConversation } from "../lib/agent-session.js"

// Helper to create mock Express request
function createMockRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return {
    method: "POST",
    path: "/agent-chat",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  } as unknown as Request
}

// Helper to create mock Express response
function createMockResponse(): Response & { events: string[]; endCalled: boolean } {
  const events: string[] = []
  let endCalled = false

  const res = {
    events,
    endCalled,
    headersSent: false,
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn((data: string) => {
      events.push(data)
      return true
    }),
    end: vi.fn(() => {
      endCalled = true
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { events: string[]; endCalled: boolean }

  return res
}

// Mock Supabase client with chainable methods
function createMockSupabaseClient() {
  const mockResult = { data: null, error: null }

  const chainable = {
    from: vi.fn(() => chainable),
    select: vi.fn(() => chainable),
    insert: vi.fn(() => chainable),
    update: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    single: vi.fn(() => Promise.resolve(mockResult)),
    order: vi.fn(() => chainable),
    limit: vi.fn(() => chainable),
  }

  return {
    ...chainable,
    setQueryResult: (result: { data: unknown; error: unknown }) => {
      mockResult.data = result.data as null
      mockResult.error = result.error as null
    },
  }
}

describe("agentChatHandler", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockRes: Response & { events: string[]; endCalled: boolean }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    // Mock fetch for debug logging endpoints
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response()))

    mockSupabase = createMockSupabaseClient()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAdminClient>)
    mockRes = createMockResponse()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(authenticateRequest).mockResolvedValue(null)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it("should proceed when authenticated", async () => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })

      // Return no deployed team (single agent mode)
      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(null)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
        // No agentId provided, no team deployed = error
      })

      await agentChatHandler(req, mockRes)

      // Without agentId or team, should return error
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "No agent or team configured for this workspace"
      })
    })
  })

  describe("Request Validation", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should reject missing message", async () => {
      const req = createMockRequest({
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid request") })
      )
    })

    it("should reject missing workspaceId", async () => {
      const req = createMockRequest({
        message: "Hello",
      })

      await agentChatHandler(req, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid request") })
      )
    })

    it("should accept valid request body", async () => {
      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(null)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
        agentId: "agent-123",
      })

      // Mock single agent lookup to fail gracefully
      mockSupabase.setQueryResult({ data: null, error: { message: "Not found" } })

      await agentChatHandler(req, mockRes)

      // Should try to load agent (and fail with 404 since we didn't mock agent data)
      expect(mockRes.status).toHaveBeenCalledWith(404)
    })
  })

  describe("Team Mode Detection", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should detect team mode when deployed team exists", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])

      // Mock the Claude Agent SDK query generator
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockReturnValue(mockQueryGenerator)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(loadDeployedTeamConfig).toHaveBeenCalledWith(
        expect.anything(),
        "ws-123"
      )
      expect(getHeadAgent).toHaveBeenCalledWith(mockTeamConfig)
    })

    it("should use specific agent when agentId provided in team mode", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
          {
            id: "specialist-id",
            slug: "specialist",
            name: "Specialist Agent",
            is_enabled: true,
            system_prompt: "You are a specialist",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])

      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockReturnValue(mockQueryGenerator)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
        agentId: "specialist-id",
      })

      await agentChatHandler(req, mockRes)

      // Should find the specialist agent, not fall back to head agent
      expect(getHeadAgent).not.toHaveBeenCalled()
    })

    it("should return error when team has no head agent", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: null, // No head agent
        },
        agents: [],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(null)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "No head agent configured for team"
      })
    })
  })

  describe("Single Agent Mode", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
      // No deployed team
      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(null)
    })

    it("should load agent from database in single agent mode", async () => {
      const mockAgent = {
        id: "agent-123",
        name: "Test Agent",
        system_prompt: "You are a helpful assistant",
        workspace_id: "ws-123",
        ai_agent_id: null,
        tools: ["tool1", "tool2"],
        is_active: true,
      }

      // Mock the agent lookup
      const chainableMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
      }
      vi.mocked(createAdminClient).mockReturnValue(chainableMock as unknown as ReturnType<typeof createAdminClient>)

      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockReturnValue(mockQueryGenerator)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
        agentId: "agent-123",
      })

      await agentChatHandler(req, mockRes)

      // Verify agent was queried
      expect(chainableMock.from).toHaveBeenCalledWith("agents")
      expect(chainableMock.eq).toHaveBeenCalledWith("id", "agent-123")
    })

    it("should return 404 when agent not found", async () => {
      const chainableMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      }
      vi.mocked(createAdminClient).mockReturnValue(chainableMock as unknown as ReturnType<typeof createAdminClient>)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
        agentId: "nonexistent-agent",
      })

      await agentChatHandler(req, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Agent not found" })
    })
  })

  describe("Provider Selection", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should use Anthropic SDK for anthropic provider", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockReturnValue(mockQueryGenerator)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(shouldUseVercelAI).toHaveBeenCalled()
      expect(query).toHaveBeenCalled()
      expect(streamText).not.toHaveBeenCalled()
    })

    it("should use Vercel AI SDK for xAI provider", async () => {
      process.env.XAI_API_KEY = "test-xai-key"

      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "grok-4-fast",
            provider: "xai",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(true)

      // Mock streamText for Vercel AI SDK
      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield "Hello"
        })(),
        usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
        steps: Promise.resolve([]),
      } as unknown as ReturnType<typeof streamText>)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(shouldUseVercelAI).toHaveBeenCalled()
      expect(streamText).toHaveBeenCalled()
      expect(query).not.toHaveBeenCalled()

      delete process.env.XAI_API_KEY
    })

    it("should return error when xAI API key is missing", async () => {
      delete process.env.XAI_API_KEY

      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "grok-4-fast",
            provider: "xai",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(true)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      // Should send error event about missing API key
      expect(mockRes.write).toHaveBeenCalled()
      const errorEvent = mockRes.events.find(e => e.includes("error"))
      expect(errorEvent).toBeDefined()
      expect(errorEvent).toContain("XAI_API_KEY")
    })
  })

  describe("System Prompt Assembly", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should include rules in system prompt when present", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [
              { id: "rule-1", rule_type: "always", content: "Always be helpful", priority: 1 },
            ],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      let capturedOptions: Record<string, unknown> | undefined
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockImplementation((opts) => {
        capturedOptions = opts as Record<string, unknown>
        return mockQueryGenerator
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      // applyRulesToPrompt should have been called
      const { applyRulesToPrompt } = await import("../lib/agent-rules.js")
      expect(applyRulesToPrompt).toHaveBeenCalled()
    })

    it("should include mind files in system prompt", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [
              { category: "Knowledge", name: "Product Info", content: "Product details here" },
            ],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [
          { category: "Company", name: "Brand Guidelines", content: "Brand info here" },
        ],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      let capturedSystemPrompt = ""
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockImplementation((opts) => {
        const options = (opts as { options: { systemPrompt: string } }).options
        capturedSystemPrompt = options.systemPrompt
        return mockQueryGenerator
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      // System prompt should include knowledge base section
      expect(capturedSystemPrompt).toContain("Knowledge Base")
      expect(capturedSystemPrompt).toContain("Product Info")
      expect(capturedSystemPrompt).toContain("Brand Guidelines")
    })

    it("should include skills in system prompt", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [
              { name: "Data Analysis", content: "How to analyze data..." },
            ],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      let capturedSystemPrompt = ""
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockImplementation((opts) => {
        const options = (opts as { options: { systemPrompt: string } }).options
        capturedSystemPrompt = options.systemPrompt
        return mockQueryGenerator
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(capturedSystemPrompt).toContain("Available Skills")
      expect(capturedSystemPrompt).toContain("Data Analysis")
    })

    it("should include workspace and user context in system prompt", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      let capturedSystemPrompt = ""
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockImplementation((opts) => {
        const options = (opts as { options: { systemPrompt: string } }).options
        capturedSystemPrompt = options.systemPrompt
        return mockQueryGenerator
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(capturedSystemPrompt).toContain("Current Context")
      expect(capturedSystemPrompt).toContain("ws-123")
      expect(capturedSystemPrompt).toContain("user-123")
    })
  })

  describe("Conversation Management", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should create new conversation when no conversationId provided", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockReturnValue(mockQueryGenerator)

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(createConversation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          workspaceId: "ws-123",
          userId: "user-123",
          title: expect.stringContaining("Hello"),
        })
      )
    })

    it("should load existing conversation when conversationId provided", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockReturnValue(mockQueryGenerator)

      const { loadSession } = await import("../lib/agent-session.js")

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
        conversationId: "existing-conv-123",
      })

      await agentChatHandler(req, mockRes)

      expect(loadSession).toHaveBeenCalledWith(
        expect.anything(),
        "existing-conv-123"
      )
      expect(createConversation).not.toHaveBeenCalled()
    })
  })

  describe("Model Selection", () => {
    beforeEach(() => {
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should use sonnet model by default", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "sonnet",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      let capturedModel = ""
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockImplementation((opts) => {
        const options = (opts as { options: { model: string } }).options
        capturedModel = options.model
        return mockQueryGenerator
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(capturedModel).toContain("sonnet")
    })

    it("should use opus model when configured", async () => {
      const mockTeamConfig = {
        team: {
          id: "team-123",
          name: "Test Team",
          head_agent_id: "head-agent-id",
        },
        agents: [
          {
            id: "head-agent-id",
            slug: "head-agent",
            name: "Head Agent",
            is_enabled: true,
            system_prompt: "You are the head agent",
            model: "opus",
            provider: "anthropic",
            rules: [],
            mind: [],
            skills: [],
            tools: [],
          },
        ],
        delegations: [],
        team_mind: [],
      }

      vi.mocked(loadDeployedTeamConfig).mockResolvedValue(mockTeamConfig)
      vi.mocked(getHeadAgent).mockReturnValue(mockTeamConfig.agents[0])
      vi.mocked(shouldUseVercelAI).mockReturnValue(false)

      let capturedModel = ""
      const mockQueryGenerator = (async function* () {
        yield { type: "system", subtype: "init", session_id: "sess-123" }
        yield {
          type: "result",
          usage: { input_tokens: 100, output_tokens: 50 },
          num_turns: 1,
        }
      })()
      vi.mocked(query).mockImplementation((opts) => {
        const options = (opts as { options: { model: string } }).options
        capturedModel = options.model
        return mockQueryGenerator
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: "ws-123",
      })

      await agentChatHandler(req, mockRes)

      expect(capturedModel).toContain("opus")
    })
  })
})
