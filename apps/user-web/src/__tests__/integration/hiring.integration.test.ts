/**
 * Integration tests for Agent Hiring API
 *
 * Tests the hire agent flow including:
 * - Workspace membership verification
 * - Duplicate hire prevention
 * - AI agent lookup
 * - Local agent record creation
 * - Field mapping from ai_agents to agents
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// =====================================================
// TEST DATA
// =====================================================

const testWorkspaceId = 'ws-hiring-test'
const testUserId = 'user-hiring-test'
const testAiAgentId = 'ai-agent-123'

const testAiAgent = {
  id: testAiAgentId,
  name: 'Test AI Agent',
  description: 'A helpful AI agent for testing',
  avatar_url: 'https://example.com/avatar.png',
  system_prompt: 'You are a helpful assistant',
  model: 'sonnet',
  provider: 'anthropic',
  is_enabled: true,
}

const testMembership = {
  id: 'member-123',
  workspace_id: testWorkspaceId,
  profile_id: testUserId,
  role: 'member',
}

// =====================================================
// MOCK SETUP
// =====================================================

// Track database operations
const dbOperations: Array<{ table: string; operation: string; data?: unknown }> = []

// Configurable mock responses
let mockMembershipResponse: { data: unknown; error: unknown } = { data: testMembership, error: null }
let mockExistingAgentResponse: { data: unknown; error: unknown } = { data: null, error: null }
let mockAiAgentResponse: { data: unknown; error: unknown } = { data: testAiAgent, error: null }
let mockInsertResponse: { data: unknown; error: unknown } = { data: null, error: null }

// Create mock Supabase client
const createMockSupabase = () => {
  let currentTable = ''
  let insertData: unknown = null

  const chainable = {
    from: vi.fn((table: string) => {
      currentTable = table
      dbOperations.push({ table, operation: 'from' })
      return chainable
    }),
    select: vi.fn(() => {
      dbOperations.push({ table: currentTable, operation: 'select' })
      return chainable
    }),
    insert: vi.fn((data: unknown) => {
      insertData = data
      dbOperations.push({ table: currentTable, operation: 'insert', data })
      return chainable
    }),
    eq: vi.fn((field: string, value: unknown) => {
      dbOperations.push({ table: currentTable, operation: 'eq', data: { field, value } })
      return chainable
    }),
    single: vi.fn(async () => {
      if (currentTable === 'workspace_members') {
        return mockMembershipResponse
      }
      if (currentTable === 'agents' && insertData === null) {
        // This is a check for existing agent
        return mockExistingAgentResponse
      }
      if (currentTable === 'agents' && insertData !== null) {
        // This is the insert result
        const result = mockInsertResponse.error
          ? mockInsertResponse
          : {
              data: {
                id: 'local-agent-new',
                ...(insertData as object),
              },
              error: null,
            }
        insertData = null
        return result
      }
      if (currentTable === 'ai_agents') {
        return mockAiAgentResponse
      }
      return { data: null, error: null }
    }),
  }

  return chainable
}

// Mock database
vi.mock('@dreamteam/database/server', () => ({
  createAdminClient: vi.fn(() => createMockSupabase()),
}))

// Mock session
vi.mock('@dreamteam/auth/session', () => ({
  getSession: vi.fn(),
}))

import { POST } from '@/app/api/agents/[id]/hire/route'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'

describe('Agent Hiring Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbOperations.length = 0

    // Reset mock responses to defaults
    mockMembershipResponse = { data: testMembership, error: null }
    mockExistingAgentResponse = { data: null, error: null }
    mockAiAgentResponse = { data: testAiAgent, error: null }
    mockInsertResponse = { data: null, error: null }

    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    it('should proceed when authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      // Should have proceeded past auth check
      expect(createAdminClient).toHaveBeenCalled()
    })
  })

  describe('Request Validation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })
    })

    it('should return 400 when workspaceId is missing', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Workspace ID required')
    })
  })

  describe('Workspace Membership Verification', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })
    })

    it('should verify user is a member of the workspace', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      // Check that workspace_members was queried
      const membershipQuery = dbOperations.find(
        op => op.table === 'workspace_members' && op.operation === 'from'
      )
      expect(membershipQuery).toBeDefined()
    })

    it('should return 403 when user is not a member', async () => {
      mockMembershipResponse = { data: null, error: { message: 'Not found' } }

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toBe('Not a member of this workspace')
    })
  })

  describe('Duplicate Prevention', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })
    })

    it('should check if agent is already hired', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      // Check that agents table was queried for existing
      const existingCheck = dbOperations.filter(
        op => op.table === 'agents' && op.operation === 'from'
      )
      expect(existingCheck.length).toBeGreaterThan(0)
    })

    it('should return 409 when agent is already hired', async () => {
      mockExistingAgentResponse = {
        data: { id: 'existing-local-agent' },
        error: null,
      }

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.error).toBe('Agent already hired in this workspace')
    })
  })

  describe('AI Agent Lookup', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })
    })

    it('should fetch AI agent details', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      // Check that ai_agents table was queried
      const aiAgentQuery = dbOperations.find(
        op => op.table === 'ai_agents' && op.operation === 'from'
      )
      expect(aiAgentQuery).toBeDefined()
    })

    it('should return 404 when AI agent not found', async () => {
      mockAiAgentResponse = { data: null, error: { message: 'Not found' } }

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error).toBe('Agent not found')
    })
  })

  describe('Local Agent Creation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })
    })

    it('should create local agent record with correct fields', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      // Find the insert operation
      const insertOp = dbOperations.find(
        op => op.table === 'agents' && op.operation === 'insert'
      )

      expect(insertOp).toBeDefined()
      const insertedData = insertOp?.data as Record<string, unknown>

      // Verify field mapping
      expect(insertedData.workspace_id).toBe(testWorkspaceId)
      expect(insertedData.ai_agent_id).toBe(testAiAgentId)
      expect(insertedData.name).toBe(testAiAgent.name)
      expect(insertedData.description).toBe(testAiAgent.description)
      expect(insertedData.avatar_url).toBe(testAiAgent.avatar_url)
      expect(insertedData.system_prompt).toBe(testAiAgent.system_prompt)
      expect(insertedData.model).toBe(testAiAgent.model)
      expect(insertedData.is_active).toBe(true)
      expect(insertedData.created_by).toBe(testUserId)
      expect(insertedData.hired_at).toBeDefined()
    })

    it('should set tools to empty array', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      const insertOp = dbOperations.find(
        op => op.table === 'agents' && op.operation === 'insert'
      )
      const insertedData = insertOp?.data as Record<string, unknown>

      // Tools should be empty - managed by ai_agent
      expect(insertedData.tools).toEqual([])
    })

    it('should return 201 with created agent on success', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.id).toBeDefined()
      expect(body.workspace_id).toBe(testWorkspaceId)
      expect(body.ai_agent_id).toBe(testAiAgentId)
    })

    it('should return 500 on database insert error', async () => {
      mockInsertResponse = { data: null, error: { message: 'Database error' } }

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Database error')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({ id: testUserId, email: 'test@example.com' })
    })

    it('should handle AI agent with null fields', async () => {
      mockAiAgentResponse = {
        data: {
          id: testAiAgentId,
          name: 'Minimal Agent',
          description: null,
          avatar_url: null,
          system_prompt: null,
          model: null,
          is_enabled: true,
        },
        error: null,
      }

      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: JSON.stringify({ workspaceId: testWorkspaceId }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      expect(response.status).toBe(201)
    })

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost/api/agents/agent-123/hire', {
        method: 'POST',
        body: 'not json',
      })

      const response = await POST(request, { params: Promise.resolve({ id: testAiAgentId }) })

      expect(response.status).toBe(500)
    })
  })
})
