# Agent System Implementation Guide

This document explains the complete AI agent **technical implementation** for the FinanceBro platform. It covers architecture, database schema, API contracts, and integration guides for both web and mobile developers.

> **Related Documentation:**
> - [AGENTS.md](./AGENTS.md) - Agent catalog and tier pricing
> - [agents-ui-spec.md](./agents-ui-spec.md) - UI/UX specifications

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Backend Infrastructure](#backend-infrastructure)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Frontend Integration](#frontend-integration)
6. [Mobile Integration Guide](#mobile-integration-guide)
7. [Configuration & Deployment](#configuration--deployment)

---

## Overview & Architecture

### Why a Separate Express Server?

The agent system uses the **Claude Agent SDK**, which spawns subprocesses to run the MCP (Model Context Protocol) server. Vercel's serverless environment doesn't support subprocess spawning, so we deploy the agent chat handler to **Railway** as a separate Express server.

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT REQUEST                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /api/agent-chat → rewrite → Railway                                │   │
│  │  /api/agents, /api/agent-conversations → handled locally            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Agent Server (Railway)                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Express Server → authenticateRequest() → agentChatHandler()        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Claude Agent SDK (query())                                         │   │
│  │  - Model: claude-sonnet-4-20250514                                  │   │
│  │  - Extended Thinking (4000 tokens)                                  │   │
│  │  - Subprocess spawning for MCP                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MCP Server (stdio transport)                                       │   │
│  │  - 291 tools across 8 domains                                       │   │
│  │  - finance, crm, team, projects, knowledge, communications, etc.   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Supabase (Database)                                                        │
│  - agents, ai_agents, agent_conversations, agent_messages                   │
│  - agent_skills, agent_memories, agent_rules                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Claude Agent SDK** | Core AI agent runtime with streaming, tool use, and session management |
| **MCP (Model Context Protocol)** | Standardized tool interface allowing Claude to interact with databases/APIs |
| **Server-Sent Events (SSE)** | Real-time streaming of agent responses to the client |
| **Supabase** | PostgreSQL database with RLS, authentication, and real-time subscriptions |
| **Railway** | Deployment platform for the Express agent server |

---

## Backend Infrastructure

### Agent Server (`apps/agent-server/`)

The agent server is a standalone Express application deployed to Railway.

#### Directory Structure

```
apps/agent-server/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── agent-chat.ts         # Main SSE chat handler
│   └── lib/
│       ├── supabase.ts       # Auth utilities (cookie + Bearer token)
│       ├── agent-session.ts  # Session persistence and token tracking
│       ├── agent-rules.ts    # Rule application to system prompts
│       └── agent-ws-types.ts # SSE message type definitions
├── package.json
└── tsconfig.json
```

#### Main Handler (`agent-chat.ts`)

The `agentChatHandler` function processes chat requests:

1. **Authentication**: Validates cookies (web) or Bearer token (mobile)
2. **Agent Loading**: Fetches agent config from `agents` table, links to `ai_agents` if applicable
3. **System Prompt Assembly**: Combines base prompt + rules + skills
4. **MCP Server Config**: Creates stdio transport config for tool access
5. **Claude SDK Query**: Streams response via async generator
6. **SSE Streaming**: Sends events to client in real-time
7. **Database Persistence**: Saves messages and tracks token usage

```typescript
// Key configuration in agent-chat.ts
const queryGenerator = query({
  prompt: message,
  options: {
    model: "claude-sonnet-4-20250514",
    systemPrompt,
    maxTurns: 10,
    maxThinkingTokens: 4000,
    disallowedTools: ['Task'],  // Prevent subagent spawning (rate limit protection)
    mcpServers: {
      dreamteam: mcpServerConfig,  // stdio transport to MCP server
    },
    allowedTools: toolNames.map((name) => `mcp__dreamteam__${name}`),
    permissionMode: "bypassPermissions",
    persistSession: true,
    includePartialMessages: true,
  },
})
```

### Authentication (`lib/supabase.ts`)

The server supports **dual authentication** for web and mobile clients:

```typescript
// Authentication priority:
// 1. Cookie-based auth (web browsers) - uses @supabase/ssr
// 2. Bearer token auth (mobile apps) - uses getUser(token)

export async function authenticateRequest(req: Request): Promise<SessionUser | null> {
  // 1. Try cookie-based auth first
  if (cookieHeader && hasSupabaseCookies) {
    const supabase = createCookieClient(cookies)
    const { data: { user } } = await supabase.auth.getUser()
    // ...
  }

  // 2. Fall back to Bearer token
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const supabase = createAuthenticatedClient(token)
    const { data: { user } } = await supabase.auth.getUser(token)
    // ...
  }
}
```

### SSE Message Types (`lib/agent-ws-types.ts`)

```typescript
// Server → Client messages
type ServerMessage =
  | SessionMessage      // Session established/resumed
  | TextMessage         // Streaming text content
  | ReasoningMessage    // Extended thinking output
  | ToolStartMessage    // Tool execution started
  | ToolResultMessage   // Tool execution completed
  | ErrorMessage        // Error occurred
  | DoneMessage         // Generation complete with usage stats

// Example message shapes:
interface TextMessage {
  type: "text"
  content: string
  isComplete: boolean
}

interface ToolStartMessage {
  type: "tool_start"
  toolName: string
  toolCallId: string
  args: unknown
  displayName: string
}

interface DoneMessage {
  type: "done"
  usage: {
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  turnCount: number
}
```

### MCP Server (`packages/mcp-server/`)

The MCP server provides tools across 8 domains:

| Domain | Tools | Examples |
|--------|-------|----------|
| `finance` | transactions, accounts, budgets, analytics, categories | `getTransactions`, `createBudget` |
| `crm` | contacts, deals, leads, pipelines, activities | `searchContacts`, `updateDeal` |
| `team` | channels, messages, DMs, workspace | `sendMessage`, `createChannel` |
| `projects` | projects, tasks, milestones, departments | `createTask`, `updateProject` |
| `knowledge` | pages, templates, whiteboards, categories | `createPage`, `searchKnowledge` |
| `communications` | calls, SMS, phone numbers | `sendSMS`, `initiateCall` |
| `goals` | goals, KPIs, exit plans | `trackKPI`, `updateGoal` |
| `agents` | memories, conversations, workflows | `saveMemory`, `loadMemory` |

The MCP server runs as a subprocess via stdio transport:

```typescript
const mcpServerConfig: McpStdioServerConfig = {
  type: "stdio",
  command: "node",
  args: [mcpServerPath],  // packages/mcp-server/dist/index.js
  env: {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WORKSPACE_ID: workspaceId,
    USER_ID: session.id,
  },
}
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│     ai_agents       │◄────────│      agents         │
│   (admin/global)    │ ai_agent_id  (workspace-local)  │
├─────────────────────┤         ├─────────────────────┤
│ id                  │         │ id                  │
│ name                │         │ workspace_id        │
│ slug                │         │ ai_agent_id (FK)    │
│ description         │         │ name                │
│ system_prompt       │         │ system_prompt       │
│ model               │         │ tools[]             │
│ is_enabled          │         │ is_active           │
│ is_head             │         │ hired_at            │
│ config              │         │ created_by          │
└─────────────────────┘         └─────────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   agent_rules       │         │ agent_conversations │
├─────────────────────┤         ├─────────────────────┤
│ id                  │         │ id                  │
│ agent_id            │         │ agent_id            │
│ rule_type           │         │ workspace_id        │
│ rule_content        │         │ user_id             │
│ condition           │         │ title               │
│ priority            │         │ sdk_session_id      │
│ is_enabled          │         │ total_input_tokens  │
└─────────────────────┘         │ total_output_tokens │
                                │ total_cost_usd      │
                                └─────────────────────┘
                                         │
                                         ▼
                                ┌─────────────────────┐
                                │   agent_messages    │
                                ├─────────────────────┤
                                │ id                  │
                                │ conversation_id     │
                                │ role                │
                                │ content             │
                                │ parts (JSONB)       │
                                └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│   agent_skills      │◄────────│agent_skill_assignments│
│ (workspace-level)   │  skill_id                      │
├─────────────────────┤         ├─────────────────────┤
│ id                  │         │ id                  │
│ workspace_id        │         │ agent_id            │
│ name                │         │ skill_id            │
│ display_name        │         └─────────────────────┘
│ description         │
│ content             │         ┌─────────────────────┐
│ is_active           │         │   agent_memories    │
│ is_system           │         ├─────────────────────┤
└─────────────────────┘         │ id                  │
                                │ agent_id            │
                                │ workspace_id        │
                                │ path                │
                                │ content             │
                                └─────────────────────┘
```

### Table Details

#### `agents` (Workspace-Local Agents)

Created when a user "hires" an agent from the global directory.

```sql
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  ai_agent_id UUID,                    -- Link to global ai_agents table
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  tools TEXT[] DEFAULT '{}',           -- Array of enabled tool names
  model VARCHAR(100) DEFAULT 'gpt-4o-mini',
  is_active BOOLEAN DEFAULT true,
  hired_at TIMESTAMPTZ DEFAULT NOW(),  -- When agent was added to workspace
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `ai_agents` (Admin/Global Agents)

Master agent definitions managed by administrators. Users "hire" from this catalog.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Display name |
| `slug` | TEXT | URL-friendly identifier |
| `description` | TEXT | Agent description |
| `department_id` | UUID | Organizational grouping |
| `avatar_url` | TEXT | Profile image |
| `model` | TEXT | `sonnet`, `opus`, or `haiku` |
| `system_prompt` | TEXT | Base system instructions |
| `permission_mode` | TEXT | `default`, `acceptEdits`, `bypassPermissions` |
| `max_turns` | INT | Maximum conversation turns |
| `is_enabled` | BOOL | Available for hiring |
| `is_head` | BOOL | Department head flag |
| `config` | JSONB | Additional configuration |

#### `agent_conversations`

Chat sessions between users and agents.

```sql
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT,
  sdk_session_id TEXT,              -- Claude SDK session for resumption
  sdk_session_metadata JSONB,       -- Model, tools, timestamps
  total_input_tokens INT DEFAULT 0,
  total_output_tokens INT DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `agent_messages`

Individual messages within conversations.

```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  parts JSONB,  -- Structured message parts (text, reasoning, tool calls)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `agent_skills`

Markdown-based instructions that enhance agent capabilities.

```sql
CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,              -- e.g., "project-planner"
  display_name TEXT NOT NULL,      -- e.g., "Project Planner"
  description TEXT NOT NULL,       -- For semantic matching
  icon TEXT DEFAULT '📋',
  content TEXT NOT NULL,           -- Markdown instructions
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System skills can't be deleted
  created_by UUID REFERENCES profiles(id),
  UNIQUE(workspace_id, name)
);
```

#### `agent_memories`

Persistent memory files that Claude can read/write across conversations.

```sql
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  path TEXT NOT NULL,        -- e.g., "/memories/users/drew.md"
  content TEXT NOT NULL DEFAULT '',
  UNIQUE(agent_id, path)
);
```

#### `agent_rules`

Behavioral rules appended to agent system prompts.

```sql
-- Rule types:
-- - "always": Actions the agent must always perform
-- - "never": Actions the agent must never perform
-- - "when": Conditional rules with a trigger condition

CREATE TABLE agent_rules (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES ai_agents(id),
  rule_type TEXT CHECK (rule_type IN ('always', 'never', 'when')),
  rule_content TEXT NOT NULL,
  condition TEXT,            -- For "when" rules
  priority INT DEFAULT 100,  -- Lower = higher priority
  is_enabled BOOLEAN DEFAULT true
);
```

### RLS Policies Summary

| Table | Policy | Description |
|-------|--------|-------------|
| `agents` | Members can view | Workspace members can read agents |
| `agents` | Members can create | Workspace members can create agents |
| `agents` | Creator/admin can update | Only creator or admin can modify |
| `agent_conversations` | User owns | Users can only access their own conversations |
| `agent_messages` | Via conversation | Access based on conversation ownership |
| `agent_skills` | Members can view | Workspace members can read skills |
| `agent_skills` | Admins can manage | Only admins can create/update/delete |
| `agent_memories` | Workspace members | Members can manage memories in their workspace |

---

## API Reference

### Agent Chat (SSE Streaming)

#### `POST /api/agent-chat`

**Description**: Stream a conversation with an AI agent using Server-Sent Events.

**Request**:
```typescript
interface AgentChatRequest {
  message: string        // User's message
  agentId: string        // Local agent ID (from agents table)
  workspaceId: string    // Workspace context
  conversationId?: string // Optional: continue existing conversation
}
```

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <access_token>  // Required for mobile
Cookie: sb-xxx-auth-token=...         // Used for web (automatic)
```

**Response**: Server-Sent Events stream

```
event: session
data: {"type":"session","sessionId":"...","conversationId":"...","isResumed":false}

event: text
data: {"type":"text","content":"Hello! ","isComplete":false}

event: text
data: {"type":"text","content":"How can I help?","isComplete":true}

event: reasoning
data: {"type":"reasoning","content":"Analyzing the request...","isComplete":false}

event: tool_start
data: {"type":"tool_start","toolName":"getTransactions","toolCallId":"...","args":{...},"displayName":"Get Transactions"}

event: tool_result
data: {"type":"tool_result","toolCallId":"...","result":{...},"success":true,"durationMs":234}

event: done
data: {"type":"done","usage":{"inputTokens":1234,"outputTokens":567,"costUsd":0.0123},"turnCount":3}
```

**Error Response**:
```
event: error
data: {"type":"error","message":"Rate limit exceeded","recoverable":true}
```

---

### Agent Management

#### `GET /api/agents`

**Description**: List all agents with hire status for the workspace.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | **Required**. Workspace ID |
| `search` | string | Search by name/description |
| `department_id` | string | Filter by department |
| `hired_only` | boolean | Only return hired agents |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

**Response**:
```typescript
{
  agents: AgentWithHireStatus[]
  total: number
}

interface AgentWithHireStatus {
  id: string              // ai_agent ID
  name: string
  slug: string | null
  description: string | null
  department_id: string | null
  avatar_url: string | null
  model: "sonnet" | "opus" | "haiku"
  system_prompt: string
  permission_mode: "default" | "acceptEdits" | "bypassPermissions"
  max_turns: number
  is_enabled: boolean
  is_head: boolean
  config: Record<string, unknown>
  current_version: number
  published_version: number | null
  created_at: string
  updated_at: string
  // Hire status fields
  isHired: boolean
  localAgentId: string | null  // ID in agents table if hired
  hiredAt: string | null
}
```

---

#### `POST /api/agents/{id}/hire`

**Description**: Hire an agent (create local workspace record).

**URL Parameters**:
- `id`: ai_agent ID to hire

**Request**:
```typescript
{
  workspaceId: string
}
```

**Response** (201 Created):
```typescript
{
  id: string              // New local agent ID
  workspace_id: string
  ai_agent_id: string
  name: string
  description: string
  avatar_url: string
  system_prompt: string
  model: string
  tools: string[]
  is_active: boolean
  hired_at: string
  created_by: string
}
```

**Errors**:
- `409 Conflict`: Agent already hired in this workspace

---

#### `DELETE /api/agents/{id}/unhire`

**Description**: Unhire an agent (soft delete local record).

**URL Parameters**:
- `id`: Local agent ID

**Response**: `200 OK` with empty body

---

### Conversations

#### `GET /api/agent-conversations`

**Description**: List conversations for an agent.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | string | **Required**. Local agent ID |
| `workspaceId` | string | **Required**. Workspace ID |

**Response**:
```typescript
Array<{
  id: string
  title: string | null
  created_at: string
  updated_at: string
}>
```

---

#### `POST /api/agent-conversations`

**Description**: Create a new conversation.

**Request**:
```typescript
{
  agentId: string      // Local agent ID
  workspaceId: string
  title?: string       // Optional title (auto-generated from first message)
}
```

**Response** (201 Created):
```typescript
{
  id: string
  title: string | null
  created_at: string
  updated_at: string
}
```

---

#### `POST /api/agent-conversations/{id}/messages`

**Description**: Save messages to a conversation.

**Request**:
```typescript
{
  messages: Array<{
    role: "user" | "assistant"
    content: string
    parts?: MessagePart[]  // Optional structured parts
  }>
}
```

**Response** (201 Created):
```typescript
{
  messages: Array<{
    id: string
    role: string
    content: string
    parts: MessagePart[] | null
    created_at: string
  }>
}
```

---

## Frontend Integration

### `useAgentChat` Hook

The primary hook for managing agent chat sessions in React components.

**Location**: `apps/finance/src/hooks/use-agent-chat.ts`

**Usage**:
```typescript
import { useAgentChat } from "@/hooks/use-agent-chat"

function ChatComponent({ agentId, workspaceId }) {
  const {
    messages,
    status,
    error,
    conversationId,
    isStreaming,
    usage,
    sendMessage,
    stopGeneration,
    clearMessages,
  } = useAgentChat({
    agentId,
    workspaceId,
    conversationId: existingConversationId,
    onConversationCreated: (id) => updateUrl(id),
    onError: (err) => showToast(err.message),
  })

  return (
    <div>
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}

      {isStreaming && <LoadingIndicator />}

      <input
        onSubmit={(text) => sendMessage(text)}
        disabled={isStreaming}
      />
    </div>
  )
}
```

**Options**:
```typescript
interface UseAgentChatOptions {
  agentId: string
  workspaceId: string
  conversationId?: string | null
  initialMessages?: AgentMessage[]
  onConversationCreated?: (conversationId: string) => void
  onError?: (error: Error) => void
}
```

**Return Value**:
```typescript
interface UseAgentChatReturn {
  messages: AgentMessage[]
  status: "idle" | "connecting" | "streaming" | "error"
  error: Error | null
  conversationId: string | null
  sessionId: string | null
  isStreaming: boolean
  usage: { inputTokens: number; outputTokens: number; costUsd: number } | null
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
  setMessages: (messages: AgentMessage[]) => void
}
```

### Message Parts Structure

Messages contain structured parts for rich rendering:

```typescript
type MessagePart = TextPart | ReasoningPart | ToolCallPart

interface TextPart {
  type: "text"
  text: string
}

interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

interface ToolCallPart {
  type: "tool-call"
  toolCallId: string
  toolName: string
  args: unknown
  result?: unknown
  state: "pending" | "running" | "completed" | "error"
}
```

### `AgentsProvider` Context

Provides workspace-level agent state management.

**Location**: `apps/finance/src/providers/agents-provider.tsx`

**Usage**:
```typescript
import { useAgents } from "@/providers/agents-provider"

function AgentsList() {
  const {
    agents,
    myAgents,
    isLoading,
    fetchAgents,
    hireAgent,
    unhireAgent,
  } = useAgents()

  // All agents from directory
  console.log(agents)

  // Only agents hired in current workspace
  console.log(myAgents)
}
```

**Key Functions**:
| Function | Description |
|----------|-------------|
| `fetchAgents(filters?)` | Load agents with optional filters |
| `hireAgent(agentId)` | Hire an agent to workspace |
| `unhireAgent(localAgentId)` | Remove agent from workspace |
| `fetchConversations(agentId)` | Load conversations for an agent |
| `createConversation(agentId)` | Start a new conversation |

---

## Mobile Integration Guide

### Authentication Flow

Mobile apps must use **Bearer token authentication**:

1. **Get Access Token**: After Supabase auth, retrieve the access token:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession()
   const accessToken = session?.access_token
   ```

2. **Include in Requests**: Add the token to all agent API requests:
   ```typescript
   fetch("/api/agent-chat", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "Authorization": `Bearer ${accessToken}`,
     },
     body: JSON.stringify({
       message: "Hello",
       agentId: "...",
       workspaceId: "...",
     }),
   })
   ```

### SSE Parsing

Mobile apps must parse the Server-Sent Events stream:

```typescript
// React Native example with fetch
async function streamAgentChat(params: AgentChatRequest, token: string) {
  const response = await fetch("https://yourapp.vercel.app/api/agent-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process complete events
    const events = buffer.split("\n\n")
    buffer = events.pop() || ""

    for (const eventStr of events) {
      if (!eventStr.trim()) continue

      // Parse SSE format: "event: type\ndata: json"
      const eventMatch = eventStr.match(/^event: (\w+)\ndata: ([\s\S]+)$/)
      if (!eventMatch) continue

      const [, eventType, dataStr] = eventMatch
      const data = JSON.parse(dataStr)

      // Handle event types
      switch (data.type) {
        case "text":
          onTextChunk(data.content)
          break
        case "tool_start":
          onToolStart(data.toolName, data.args)
          break
        case "tool_result":
          onToolResult(data.toolCallId, data.result)
          break
        case "done":
          onComplete(data.usage)
          break
        case "error":
          onError(data.message)
          break
      }
    }
  }
}
```

### Type Definitions for Mobile

```typescript
// Request types
interface AgentChatRequest {
  message: string
  agentId: string
  workspaceId: string
  conversationId?: string
}

// SSE event types
interface SessionEvent {
  type: "session"
  sessionId: string
  conversationId: string
  isResumed: boolean
}

interface TextEvent {
  type: "text"
  content: string
  isComplete: boolean
}

interface ReasoningEvent {
  type: "reasoning"
  content: string
  isComplete: boolean
}

interface ToolStartEvent {
  type: "tool_start"
  toolName: string
  toolCallId: string
  args: unknown
  displayName: string
}

interface ToolResultEvent {
  type: "tool_result"
  toolCallId: string
  result: unknown
  success: boolean
  durationMs: number
}

interface DoneEvent {
  type: "done"
  usage: {
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  turnCount: number
}

interface ErrorEvent {
  type: "error"
  message: string
  code?: string
  recoverable: boolean
}

type ServerEvent =
  | SessionEvent
  | TextEvent
  | ReasoningEvent
  | ToolStartEvent
  | ToolResultEvent
  | DoneEvent
  | ErrorEvent
```

### Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| `401` | Unauthorized | Re-authenticate, refresh token |
| `403` | Forbidden | User not in workspace |
| `404` | Not found | Agent doesn't exist or isn't active |
| `409` | Conflict | Agent already hired |
| `429` | Rate limit | Implement exponential backoff |
| `500` | Server error | Retry with backoff |

**SSE Error Events**: When streaming, errors come as events:
```typescript
// Recoverable errors: can retry
{ type: "error", message: "Rate limit", recoverable: true }

// Non-recoverable: show error to user
{ type: "error", message: "Agent configuration error", recoverable: false }
```

---

## Configuration & Deployment

### Environment Variables

#### Agent Server (`apps/agent-server/.env`)

```bash
# Anthropic API Key (required)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase connection (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Server port (optional, default: 3002)
PORT=3002
```

#### Next.js App (`apps/finance/.env.local`)

```bash
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Next.js Rewrites

The agent chat endpoint is rewritten to Railway:

```typescript
// apps/finance/next.config.ts
async rewrites() {
  return {
    beforeFiles: [
      {
        source: "/api/agent-chat",
        destination: "https://agent-server-production-580f.up.railway.app/agent-chat",
      },
    ],
  }
}
```

### Railway Deployment

The agent server is deployed to Railway with:

1. **Build Command**: `pnpm build --filter=@repo/agent-server`
2. **Start Command**: `node apps/agent-server/dist/index.js`
3. **Environment Variables**: All required env vars configured in Railway dashboard
4. **Health Check**: `GET /health` endpoint for Railway health monitoring

### Docker Configuration

The agent server uses a non-root user for security:

```dockerfile
FROM node:20
# ... build steps ...
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs
```

---

## Appendix: Token Pricing

The system tracks token usage and calculates costs:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |
| Claude Haiku 4 | $0.25 | $1.25 |

Cost calculation (from `agent-session.ts`):
```typescript
const inputCost = (inputTokens / 1_000_000) * pricing.input
const outputCost = (outputTokens / 1_000_000) * pricing.output
const totalCost = inputCost + outputCost
```

---

## Quick Reference: File Locations

| Purpose | File Path |
|---------|-----------|
| Agent chat handler | `apps/agent-server/src/agent-chat.ts` |
| Authentication | `apps/agent-server/src/lib/supabase.ts` |
| Session management | `apps/agent-server/src/lib/agent-session.ts` |
| SSE types | `apps/agent-server/src/lib/agent-ws-types.ts` |
| Rule application | `apps/agent-server/src/lib/agent-rules.ts` |
| MCP server | `packages/mcp-server/src/index.ts` |
| useAgentChat hook | `apps/finance/src/hooks/use-agent-chat.ts` |
| AgentsProvider | `apps/finance/src/providers/agents-provider.tsx` |
| Agents API route | `apps/finance/src/app/api/agents/route.ts` |
| Conversations API | `apps/finance/src/app/api/agent-conversations/route.ts` |
| Next.js config | `apps/finance/next.config.ts` |
