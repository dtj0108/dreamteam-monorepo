/**
 * Integration tests for Agent Chat Handler
 *
 * Tests the full chat flow including:
 * - Team config loading from database
 * - Conversation creation and persistence
 * - Message history loading
 * - Usage tracking
 *
 * These tests use realistic database mocks that simulate actual query patterns.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest"
import type { Request, Response } from "express"

// =====================================================
// TEST DATA
// =====================================================

const testWorkspaceId = "ws-integration-test"
const testUserId = "user-integration-test"
const testConversationId = "conv-integration-test"

const testTeamConfig = {
  team: {
    id: "team-integration",
    name: "Integration Test Team",
    head_agent_id: "agent-head",
    description: "Team for integration testing",
  },
  agents: [
    {
      id: "agent-head",
      slug: "head-agent",
      name: "Head Agent",
      description: "The main coordinator",
      is_enabled: true,
      system_prompt: "You are the head agent for integration testing.",
      model: "sonnet",
      provider: "anthropic",
      rules: [
        { id: "rule-1", rule_type: "always", content: "Always be helpful", priority: 1 },
      ],
      mind: [
        { category: "Knowledge", name: "Test KB", content: "Test knowledge content" },
      ],
      skills: [
        { name: "Testing", content: "How to write good tests" },
      ],
      tools: [
        { name: "transactions", description: "Get transactions" },
        { name: "budgets", description: "Get budgets" },
      ],
    },
    {
      id: "agent-specialist",
      slug: "specialist-agent",
      name: "Specialist Agent",
      description: "Handles specialized tasks",
      is_enabled: true,
      system_prompt: "You are a specialist agent.",
      model: "haiku",
      provider: "anthropic",
      rules: [],
      mind: [],
      skills: [],
      tools: [],
    },
  ],
  delegations: [
    {
      from_agent_slug: "head-agent",
      to_agent_slug: "specialist-agent",
      condition: "When the user needs specialized help",
      is_enabled: true,
    },
  ],
  team_mind: [
    { category: "Company", name: "Brand", content: "Our brand guidelines" },
  ],
}

const testSingleAgent = {
  id: "agent-single",
  name: "Single Test Agent",
  system_prompt: "You are a test agent.",
  workspace_id: testWorkspaceId,
  ai_agent_id: null,
  tools: ["transactions"],
  is_active: true,
}

const testConversationHistory = [
  {
    id: "msg-1",
    conversation_id: testConversationId,
    role: "user",
    content: "Previous question",
    created_at: "2024-01-15T09:00:00Z",
  },
  {
    id: "msg-2",
    conversation_id: testConversationId,
    role: "assistant",
    content: "Previous answer",
    created_at: "2024-01-15T09:00:30Z",
  },
]

// =====================================================
// MOCK SETUP
// =====================================================

// Comprehensive database mock that tracks queries
class MockDatabase {
  private queryLog: string[] = []
  private deployedTeam: typeof testTeamConfig | null = null
  private agents: Map<string, typeof testSingleAgent> = new Map()
  private conversations: Map<string, { id: string; workspaceId: string }> = new Map()
  private messages: Map<string, typeof testConversationHistory> = new Map()

  constructor() {
    this.reset()
  }

  reset() {
    this.queryLog = []
    this.deployedTeam = testTeamConfig
    this.agents.set(testSingleAgent.id, testSingleAgent)
    this.messages.set(testConversationId, testConversationHistory)
  }

  setDeployedTeam(team: typeof testTeamConfig | null) {
    this.deployedTeam = team
  }

  getQueryLog() {
    return this.queryLog
  }

  // Create a mock Supabase client
  createClient() {
    const self = this
    let currentTable = ""
    let currentFilters: Record<string, unknown> = {}
    let insertData: unknown = null

    const chainable = {
      from: (table: string) => {
        currentTable = table
        currentFilters = {}
        self.queryLog.push(`from(${table})`)
        return chainable
      },
      select: (fields: string) => {
        self.queryLog.push(`select(${fields})`)
        return chainable
      },
      insert: (data: unknown) => {
        insertData = data
        self.queryLog.push(`insert(${JSON.stringify(data).slice(0, 50)}...)`)
        return chainable
      },
      update: (data: unknown) => {
        self.queryLog.push(`update(${JSON.stringify(data).slice(0, 50)}...)`)
        return chainable
      },
      eq: (field: string, value: unknown) => {
        currentFilters[field] = value
        self.queryLog.push(`eq(${field}, ${value})`)
        return chainable
      },
      order: (field: string, opts: { ascending: boolean }) => {
        self.queryLog.push(`order(${field}, ${opts.ascending ? 'asc' : 'desc'})`)
        return chainable
      },
      limit: (n: number) => {
        self.queryLog.push(`limit(${n})`)
        return chainable
      },
      single: async () => {
        self.queryLog.push("single()")

        // Handle different table queries
        if (currentTable === "workspace_deployed_teams") {
          if (currentFilters.workspace_id === testWorkspaceId && currentFilters.status === "active") {
            if (self.deployedTeam) {
              return { data: { active_config: self.deployedTeam }, error: null }
            }
            return { data: null, error: { code: "PGRST116", message: "No rows" } }
          }
        }

        if (currentTable === "agents") {
          const agentId = currentFilters.id as string
          const agent = self.agents.get(agentId)
          if (agent) {
            return { data: agent, error: null }
          }
          return { data: null, error: { message: "Agent not found" } }
        }

        // Default response for inserts
        if (insertData) {
          const data = insertData as Record<string, unknown>
          return { data: { id: `generated-${Date.now()}`, ...data }, error: null }
        }

        return { data: null, error: null }
      },
      then: async (resolve: (value: { data: unknown; error: unknown }) => void) => {
        // Handle message history query
        if (currentTable === "agent_messages" && currentFilters.conversation_id) {
          const messages = self.messages.get(currentFilters.conversation_id as string)
          if (messages) {
            resolve({ data: messages, error: null })
            return
          }
        }
        resolve({ data: [], error: null })
      },
    }

    return chainable
  }
}

// Create global mock database
const mockDb = new MockDatabase()

// Mock external dependencies
vi.mock("ai", () => ({
  streamText: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockDb.createClient()),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockDb.createClient()),
}))

vi.mock("../../lib/mcp-client.js", () => ({
  createMCPClient: vi.fn(() => Promise.resolve({
    tools: {},
    close: vi.fn(),
  })),
}))

vi.mock("../../lib/ai-providers.js", () => ({
  getModel: vi.fn(),
  shouldUseVercelAI: vi.fn(() => true), // Always use Vercel AI SDK
}))

vi.mock("../../lib/supabase.js", () => ({
  createAdminClient: vi.fn(() => mockDb.createClient()),
  authenticateRequest: vi.fn(),
}))

vi.mock("../../lib/agent-session.js", () => ({
  loadSession: vi.fn(),
  updateSessionUsage: vi.fn(),
  createConversation: vi.fn((supabase, opts) => {
    return `conv-${Date.now()}`
  }),
}))

vi.mock("../../lib/agent-rules.js", () => ({
  applyRulesToPrompt: vi.fn((prompt, rules) => {
    if (rules && rules.length > 0) {
      return prompt + "\n\n## Applied Rules\n" + rules.map((r: { content: string }) => `- ${r.content}`).join("\n")
    }
    return prompt
  }),
}))

vi.mock("../../lib/team-config.js", () => {
  let deployedConfig: typeof testTeamConfig | null = null

  return {
    loadDeployedTeamConfig: vi.fn(async (supabase, workspaceId) => {
      if (workspaceId === testWorkspaceId) {
        return deployedConfig
      }
      return null
    }),
    getHeadAgent: vi.fn((config) => {
      if (!config) return null
      return config.agents.find((a: { id: string; is_enabled: boolean }) =>
        a.id === config.team.head_agent_id && a.is_enabled
      )
    }),
    __setDeployedConfig: (config: typeof testTeamConfig | null) => {
      deployedConfig = config
    },
  }
})

vi.mock("../../lib/delegation-tool.js", () => ({
  buildDelegationTool: vi.fn((config, agentSlug) => {
    if (!config || !config.delegations.length) return null
    const delegations = config.delegations.filter(
      (d: { from_agent_slug: string; is_enabled: boolean }) =>
        d.from_agent_slug === agentSlug && d.is_enabled
    )
    if (delegations.length === 0) return null
    return { name: "delegate_to_agent" }
  }),
}))

// Set up environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"

import { agentChatHandler } from "../../agent-chat.js"
import { authenticateRequest } from "../../lib/supabase.js"
import { loadDeployedTeamConfig, getHeadAgent, __setDeployedConfig } from "../../lib/team-config.js"
import { streamText } from "ai"
import { createConversation, updateSessionUsage } from "../../lib/agent-session.js"

// Helper to create mock Express request
function createMockRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return {
    method: "POST",
    path: "/agent-chat",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer test-token",
      ...headers,
    },
    body,
  } as unknown as Request
}

// Helper to create mock Express response with event capture
function createMockResponse() {
  const events: { type: string; data: unknown }[] = []
  let statusCode = 200
  let jsonBody: unknown = null

  const res = {
    events,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    headersSent: false,
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn((data: string) => {
      // Parse SSE events
      const eventMatch = data.match(/event: (\w+)\ndata: (.+)\n\n/)
      if (eventMatch) {
        try {
          events.push({
            type: eventMatch[1],
            data: JSON.parse(eventMatch[2]),
          })
        } catch {
          events.push({ type: eventMatch[1], data: eventMatch[2] })
        }
      }
      return true
    }),
    end: vi.fn(),
    status: vi.fn((code: number) => {
      statusCode = code
      return res
    }),
    json: vi.fn((body: unknown) => {
      jsonBody = body
      return res
    }),
  } as unknown as Response & {
    events: typeof events
    getStatus: () => number
    getJson: () => unknown
  }

  return res
}

describe("Agent Chat Integration Tests", () => {
  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response()))
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Full Team Mode Flow", () => {
    beforeEach(() => {
      // Set up team config
      ;(__setDeployedConfig as (config: typeof testTeamConfig | null) => void)(testTeamConfig)

      // Mock authenticated user
      vi.mocked(authenticateRequest).mockResolvedValue({
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
      })

      // Mock Vercel AI SDK streamText
      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield "Hello! I'm the head agent."
        })(),
        usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
        steps: Promise.resolve([]),
      } as unknown as ReturnType<typeof streamText>)
    })

    it("should load team config and use head agent", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      // Should have loaded team config
      expect(loadDeployedTeamConfig).toHaveBeenCalledWith(
        expect.anything(),
        testWorkspaceId
      )

      // Should have identified head agent
      expect(getHeadAgent).toHaveBeenCalledWith(testTeamConfig)

      // Should have created conversation
      expect(createConversation).toHaveBeenCalled()
    })

    it("should send session event with conversation ID", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      // Find session event
      const sessionEvent = res.events.find(e => e.type === "session")
      expect(sessionEvent).toBeDefined()
      // Session ID is now generated dynamically, just check it exists
      expect(sessionEvent?.data).toHaveProperty("sessionId")
      expect(sessionEvent?.data).toHaveProperty("conversationId")
    })

    it("should send done event with usage stats", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      // Find done event
      const doneEvent = res.events.find(e => e.type === "done")
      expect(doneEvent).toBeDefined()
      expect(doneEvent?.data).toHaveProperty("usage")
      const usage = (doneEvent?.data as { usage: { inputTokens: number } }).usage
      expect(usage.inputTokens).toBe(100)
    })

    it("should update session usage after completion", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(updateSessionUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50,
        })
      )
    })

    it("should include delegation instructions for head agent", async () => {
      let capturedSystemPrompt = ""
      vi.mocked(streamText).mockImplementation((opts) => {
        capturedSystemPrompt = (opts as { system: string }).system
        return {
          textStream: (async function* () {
            yield "Hello!"
          })(),
          usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
          steps: Promise.resolve([]),
        } as unknown as ReturnType<typeof streamText>
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      // System prompt should include delegation instructions
      expect(capturedSystemPrompt).toContain("Team Delegation")
      expect(capturedSystemPrompt).toContain("specialist-agent")
    })

    it("should include knowledge base from mind files", async () => {
      let capturedSystemPrompt = ""
      vi.mocked(streamText).mockImplementation((opts) => {
        capturedSystemPrompt = (opts as { system: string }).system
        return {
          textStream: (async function* () {
            yield "Hello!"
          })(),
          usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
          steps: Promise.resolve([]),
        } as unknown as ReturnType<typeof streamText>
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(capturedSystemPrompt).toContain("Knowledge Base")
      expect(capturedSystemPrompt).toContain("Test KB")
      expect(capturedSystemPrompt).toContain("Brand")
    })

    it("should include skills in system prompt", async () => {
      let capturedSystemPrompt = ""
      vi.mocked(streamText).mockImplementation((opts) => {
        capturedSystemPrompt = (opts as { system: string }).system
        return {
          textStream: (async function* () {
            yield "Hello!"
          })(),
          usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
          steps: Promise.resolve([]),
        } as unknown as ReturnType<typeof streamText>
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(capturedSystemPrompt).toContain("Available Skills")
      expect(capturedSystemPrompt).toContain("Testing")
    })
  })

  describe("Conversation Persistence", () => {
    beforeEach(() => {
      ;(__setDeployedConfig as (config: typeof testTeamConfig | null) => void)(testTeamConfig)

      vi.mocked(authenticateRequest).mockResolvedValue({
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
      })

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield "Hello!"
        })(),
        usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
        steps: Promise.resolve([]),
      } as unknown as ReturnType<typeof streamText>)
    })

    it("should create new conversation for first message", async () => {
      const req = createMockRequest({
        message: "First message",
        workspaceId: testWorkspaceId,
        // No conversationId - new conversation
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(createConversation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          workspaceId: testWorkspaceId,
          userId: testUserId,
          title: "First message",
        })
      )
    })

    it("should load existing conversation when ID provided", async () => {
      const { loadSession } = await import("../../lib/agent-session.js")

      const req = createMockRequest({
        message: "Follow-up message",
        workspaceId: testWorkspaceId,
        conversationId: testConversationId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(loadSession).toHaveBeenCalledWith(
        expect.anything(),
        testConversationId
      )
      expect(createConversation).not.toHaveBeenCalled()
    })

    it("should use existing conversation ID when provided", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
        conversationId: testConversationId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      // Should not create a new conversation
      expect(createConversation).not.toHaveBeenCalled()
    })
  })

  describe("Single Agent Mode Flow", () => {
    beforeEach(() => {
      // No deployed team
      ;(__setDeployedConfig as (config: typeof testTeamConfig | null) => void)(null)

      vi.mocked(authenticateRequest).mockResolvedValue({
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
      })

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield "Hello from single agent!"
        })(),
        usage: Promise.resolve({ promptTokens: 50, completionTokens: 25 }),
        steps: Promise.resolve([]),
      } as unknown as ReturnType<typeof streamText>)
    })

    it("should fall back to single agent mode when no team deployed", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
        agentId: testSingleAgent.id,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      // Should have tried to load team config first
      expect(loadDeployedTeamConfig).toHaveBeenCalled()

      // Should have succeeded with single agent
      const sessionEvent = res.events.find(e => e.type === "session")
      expect(sessionEvent).toBeDefined()
    })

    it("should return error when no team and no agentId", async () => {
      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
        // No agentId
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(res.getStatus()).toBe(400)
      expect(res.getJson()).toEqual({
        error: "No agent or team configured for this workspace"
      })
    })
  })

  describe("Error Recovery", () => {
    beforeEach(() => {
      ;(__setDeployedConfig as (config: typeof testTeamConfig | null) => void)(testTeamConfig)

      vi.mocked(authenticateRequest).mockResolvedValue({
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
      })
    })

    it("should send error event on AI SDK error", async () => {
      vi.mocked(streamText).mockImplementation(() => {
        throw new Error("API error")
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      const errorEvent = res.events.find(e => e.type === "error")
      expect(errorEvent).toBeDefined()
      expect((errorEvent?.data as { message: string }).message).toContain("API error")
    })

    it("should call res.end() after error", async () => {
      vi.mocked(streamText).mockImplementation(() => {
        throw new Error("API error")
      })

      const req = createMockRequest({
        message: "Hello",
        workspaceId: testWorkspaceId,
      })
      const res = createMockResponse()

      await agentChatHandler(req, res)

      expect(res.end).toHaveBeenCalled()
    })
  })
})
