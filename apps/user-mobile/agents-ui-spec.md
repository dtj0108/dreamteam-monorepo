# Agents Product Specification

Complete spec for the Agents product - UI design and backend API documentation.

---

# Part 1: UI Specification

---

## Navigation Structure

```
/agents              → Dashboard (home)
/agents/discover     → Browse & hire agents
/agents/hired        → My hired agents
/agents/activity     → All activity/executions
/agents/activity/pending → Pending approvals
/agents/schedules    → Scheduled tasks
/agents/[id]         → Chat with agent
```

**Sidebar Navigation:**
1. Dashboard (home icon)
2. Discover (compass icon)
3. My Agents (bot icon)
4. Activity (activity icon) → submenu: All Activity, Pending Approvals
5. Schedules (calendar icon)

---

## Agent Card Design

Used consistently across Dashboard, Discover, and My Agents pages.

```
┌────────────────────────────┐
│                            │
│  ┌──────────────┐          │
│  │      ✨      │          │  ← Avatar (56x56, rounded-xl)
│  │              │          │    Default: ✨ emoji
│  └──────────────┘          │    Or: agent.avatar_url
│                            │
│  Agent Name                │  ← font-semibold, truncate
│                            │
│  💬 0 conversations        │  ← Stats section
│  ✓ X tasks completed       │    text-sm, text-muted
│  📅 X scheduled            │    Icons: MessageSquare, CheckCircle2, Calendar
│                            │
│  ┌──────────────────────┐  │
│  │    Meet Agent →      │  │  ← Full-width button
│  └──────────────────────┘  │    variant: secondary
│                            │
└────────────────────────────┘

Card: 224px wide (w-56), rounded-lg border, hover:shadow-md
```

### Card Variations

**Hired Agent:**
- Shows stats (conversations, completed, scheduled)
- Button: "Meet Agent →" (secondary variant)

**Unhired Agent (Discover page only):**
- Shows description instead of stats
- Shows "Hire to get started" italic text
- Button: "Hire Agent" (primary variant)

---

## Dashboard (`/agents`)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Agents                              [+ Discover Agents]    │
│  Your AI agents and their activity                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ Hired      │ │ Pending    │ │ Completed  │ │ Active     ││
│  │ Agents     │ │ Approvals  │ │ Tasks      │ │ Schedules  ││
│  │     3      │ │   2 ⚠️     │ │    47      │ │    12      ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                             │
│  ┌───────────────────────────┐ ┌───────────────────────────┐│
│  │ Recent Activity           │ │ Pending Approvals         ││
│  │                           │ │                           ││
│  │ [Activity list...]        │ │ [Approval items...]       ││
│  │                           │ │ [Approve] [Reject]        ││
│  │              View all →   │ │              View all →   ││
│  └───────────────────────────┘ └───────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ My Agents                                    View all → ││
│  │                                                         ││
│  │ [Card] [Card] [Card] [+ Discover More]                  ││
│  │ ← horizontal scroll →                                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Stat Cards
| Stat | Icon | Link | Alert |
|------|------|------|-------|
| Hired Agents | Bot | /agents/hired | - |
| Pending Approvals | Clock | /agents/activity/pending | Yes (if > 0) |
| Completed Tasks | CheckCircle2 | /agents/activity | - |
| Active Schedules | Calendar | /agents/schedules | - |

### Recent Activity Item
```
┌─────────────────────────────────────────────────────┐
│ [Avatar] Agent Name          [Status Badge]         │
│          Task description    2h ago                 │
└─────────────────────────────────────────────────────┘
```

Status badges:
- `completed` → green (CheckCircle2)
- `failed` → red (XCircle)
- `pending_approval` → amber (Clock)
- `running` → blue (Loader2, animated)

### Pending Approval Item
```
┌─────────────────────────────────────────────────────┐
│ [Clock Icon] Agent Name              [Reject] [Approve]
│              Task prompt (2 lines)                  │
│              Scheduled: Jan 14, 2026 9:00 AM        │
└─────────────────────────────────────────────────────┘
```

---

## Discover Page (`/agents/discover`)

### Layout
- Search bar at top
- 4-column grid of agent cards (responsive: 1/2/3/4 cols)
- Cards show description for unhired, stats for hired
- Hire dialog on click

### Hire Dialog
```
┌─────────────────────────────────────┐
│  [Avatar] Hire {Agent Name}?        │
│                                     │
│  {Agent description}                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ This agent can help with:     │  │
│  │ {system_prompt preview...}    │  │
│  └───────────────────────────────┘  │
│                                     │
│            [Cancel] [Hire Agent]    │
└─────────────────────────────────────┘
```

---

## My Agents Page (`/agents/hired`)

### Layout
- Header: "My Agents" + "Discover More" button
- 4-column grid of agent cards
- Empty state if no agents hired

### Empty State
```
┌─────────────────────────────────────┐
│              ✨                     │
│                                     │
│      No agents hired yet            │
│  Discover and hire AI agents to     │
│  help automate your work            │
│                                     │
│        [Browse Agents]              │
└─────────────────────────────────────┘
```

---

## Agent Chat Page (`/agents/[id]`)

ChatGPT-style interface with meeting metaphor.

### Empty State (no messages)
```
┌─────────────────────────────────────────────────────┐
│                                          [History]  │
│                                                     │
│                                                     │
│           What should we meet about?                │
│                                                     │
│   ┌───────────────────────────────────────────┐    │
│   │ Message Agent...              📎 🌐  [⬆]  │    │
│   └───────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### With Messages
```
┌─────────────────────────────────────────────────────┐
│  [Avatar] Agent Name                    [+] [History]
├─────────────────────────────────────────────────────┤
│                                                     │
│     [User message bubble]                           │
│                                                     │
│     [Assistant response...]                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│   ┌───────────────────────────────────────────┐    │
│   │ Message Agent...              📎 🌐  [⬆]  │    │
│   └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Chat Input
- Rounded container (rounded-2xl)
- Left icons: Paperclip (attachments), Globe (web search)
- Right: Black circular submit button
- Enter to send, Shift+Enter for newline

### Conversation History (Sheet/Drawer)
- Triggered by History icon button
- Shows list of past conversations
- "New conversation" button at top
- Each item: title + relative time

---

## Colors & Icons

| Element | Icon | Color (when applicable) |
|---------|------|-------------------------|
| Default avatar | ✨ emoji | - |
| Conversations | MessageSquare | muted |
| Tasks completed | CheckCircle2 | muted (or emerald for success) |
| Scheduled | Calendar | muted |
| Pending | Clock | amber |
| Failed | XCircle | red |
| Running | Loader2 (spinning) | blue |

---

# Part 2: Backend & API Specification

---

## Authentication & Authorization

### Authentication
All endpoints require an authenticated session. Returns `401 Unauthorized` if missing.

```typescript
// Session contains user profile ID
session.id: string // UUID of the authenticated user
```

### Authorization Levels

**1. Workspace Member**
Most operations require workspace membership:
```typescript
// Check: user is member of workspace
workspace_members.profile_id = session.id
workspace_members.workspace_id = workspaceId
```

**2. Admin/Owner**
Certain operations require elevated role:
```typescript
// Check: user role is admin or owner
workspace_members.role IN ('admin', 'owner')
```

**3. Creator or Admin**
Agent modifications allow creator or admin:
```typescript
// Check: user created the agent OR is admin/owner
agents.created_by = session.id OR role IN ('admin', 'owner')
```

**4. User Ownership**
Conversations/messages are user-specific:
```typescript
// Check: conversation belongs to user
agent_conversations.user_id = session.id
```

---

## API Endpoints

### Agent Discovery & Management

#### `GET /api/agents`
List available agents from `ai_agents` table with hire status.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | UUID | Yes | Workspace context |
| search | string | No | Search by name/description |
| category | string | No | Filter by category |
| department_id | UUID | No | Filter by department |
| hired_only | boolean | No | Only show hired agents |
| limit | number | No | Default: 50 |
| offset | number | No | Default: 0 |

**Response (200):**
```typescript
{
  agents: AgentWithHireStatus[],
  total: number
}
```

**Errors:** 400 (missing workspaceId), 403 (not member), 500 (database error)

---

#### `GET /api/agents/[id]`
Get single agent details with hire status.

**Response (200):**
```typescript
{
  agent: AIAgent,
  localAgent: LocalAgent | null,
  isHired: boolean
}
```

---

#### `POST /api/agents/[id]/hire`
Hire an agent (create local workspace record).

**Request Body:**
```typescript
{
  workspaceId: string // UUID required
}
```

**Response (201):**
```typescript
{
  id: string,
  workspace_id: string,
  ai_agent_id: string,
  name: string,
  description: string | null,
  avatar_url: string | null,
  system_prompt: string,
  tools: string[],
  model: string,
  is_active: boolean,
  hired_at: string,
  created_at: string,
  updated_at: string
}
```

**Errors:** 400 (missing workspaceId), 403 (not member), 404 (agent not found), 409 (already hired)

---

#### `DELETE /api/agents/[id]/unhire`
Unhire an agent (soft delete - sets `is_active = false`).

**Response (200):**
```typescript
{ success: true }
```

---

### Agent Activity & Executions

#### `GET /api/agents/activity`
List execution history for hired agents.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | UUID | Yes | Workspace context |
| agent_id | UUID | No | Filter by agent |
| status | string | No | Filter by status |
| from_date | ISO date | No | Start date filter |
| to_date | ISO date | No | End date filter |
| limit | number | No | Default: 50 |
| offset | number | No | Default: 0 |

**Response (200):**
```typescript
{
  executions: AgentScheduleExecution[],
  total: number
}
```

---

#### `GET /api/agents/activity/pending`
List executions pending approval.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | UUID | Yes | Workspace context |

**Response (200):**
```typescript
{
  executions: AgentScheduleExecution[],
  total: number
}
```

---

#### `POST /api/agents/activity/[id]/approve`
Approve a pending execution.

**Response (200):**
```typescript
{
  execution: AgentScheduleExecution,
  message: "Execution approved"
}
```

**Updates:** status → 'approved', approved_by → session.id, approved_at → now()

**Errors:** 404 (not found), 400 (not pending), 403 (not authorized)

---

#### `POST /api/agents/activity/[id]/reject`
Reject a pending execution.

**Request Body:**
```typescript
{
  reason?: string // optional rejection reason
}
```

**Response (200):**
```typescript
{
  execution: AgentScheduleExecution,
  message: "Execution rejected"
}
```

**Updates:** status → 'rejected', rejection_reason → provided reason

---

### Agent Schedules

#### `GET /api/agents/schedules`
List schedules for hired agents.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | UUID | Yes | Workspace context |

**Response (200):**
```typescript
{
  schedules: AgentSchedule[],
  total: number
}
```

---

#### `PATCH /api/agents/schedules/[id]`
Enable/disable a schedule.

**Request Body:**
```typescript
{
  is_enabled: boolean
}
```

**Response (200):**
```typescript
{
  schedule: AgentSchedule
}
```

---

### Agent Conversations

#### `GET /api/agent-conversations`
List conversations for an agent.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| agentId | UUID | Yes | Agent ID |
| workspaceId | UUID | Yes | Workspace context |

**Response (200):**
```typescript
[
  {
    id: string,
    title: string | null,
    created_at: string,
    updated_at: string
  }
]
```

Note: Only returns conversations belonging to the authenticated user.

---

#### `POST /api/agent-conversations`
Create a new conversation.

**Request Body:**
```typescript
{
  agentId: string,      // UUID required
  workspaceId: string,  // UUID required
  title?: string        // optional
}
```

**Response (201):**
```typescript
{
  id: string,
  title: string | null,
  created_at: string,
  updated_at: string
}
```

---

#### `GET /api/agent-conversations/[id]`
Get conversation with messages.

**Response (200):**
```typescript
{
  id: string,
  agent_id: string,
  workspace_id: string,
  title: string | null,
  created_at: string,
  updated_at: string,
  messages: AgentMessage[]
}
```

---

#### `PATCH /api/agent-conversations/[id]`
Update conversation title.

**Request Body:**
```typescript
{
  title: string
}
```

---

#### `DELETE /api/agent-conversations/[id]`
Delete conversation and all messages.

**Response (200):**
```typescript
{ success: true }
```

---

#### `POST /api/agent-conversations/[id]/messages`
Save messages to conversation.

**Request Body:**
```typescript
{
  messages: {
    role: 'user' | 'assistant',
    content: string,
    parts?: MessagePart[]
  }[]
}
```

**Response (201):**
```typescript
{
  messages: AgentMessage[]
}
```

Note: Auto-generates conversation title from first user message.

---

## Database Schema

### `agents` Table (Local Agent Records)
```sql
CREATE TABLE agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  ai_agent_id       UUID,  -- Reference to ai_agents (soft reference)
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  avatar_url        TEXT,
  system_prompt     TEXT NOT NULL,
  tools             TEXT[] DEFAULT '{}',
  model             VARCHAR(100) DEFAULT 'gpt-4o-mini',
  is_active         BOOLEAN DEFAULT true,
  hired_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_created_by ON agents(created_by);
CREATE INDEX idx_agents_ai_agent_id ON agents(ai_agent_id);
CREATE INDEX idx_agents_workspace_ai_agent ON agents(workspace_id, ai_agent_id);
```

---

### `agent_conversations` Table
```sql
CREATE TABLE agent_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id   UUID NOT NULL REFERENCES workspaces(id),
  user_id        UUID NOT NULL REFERENCES profiles(id),
  title          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_conversations_agent ON agent_conversations(agent_id);
CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX idx_agent_conversations_workspace ON agent_conversations(workspace_id);
CREATE INDEX idx_agent_conversations_updated ON agent_conversations(updated_at DESC);
```

---

### `agent_messages` Table
```sql
CREATE TABLE agent_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT NOT NULL,
  parts            JSONB,  -- AI SDK message parts
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX idx_agent_messages_created ON agent_messages(conversation_id, created_at);
```

---

### `agent_skills` Table
```sql
CREATE TABLE agent_skills (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id),
  name             TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon             TEXT DEFAULT '📋',
  content          TEXT NOT NULL,  -- Markdown instructions
  is_active        BOOLEAN DEFAULT true,
  is_system        BOOLEAN DEFAULT false,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);
```

---

### `agent_skill_assignments` Table
```sql
CREATE TABLE agent_skill_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_id   UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_id)
);
```

---

### `agent_memories` Table
```sql
CREATE TABLE agent_memories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id   UUID NOT NULL REFERENCES workspaces(id),
  path           TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, path)
);
```

---

### Referenced Admin Tables

#### `ai_agents` (Admin Schema)
Central agent definitions (managed by admin).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Agent name |
| slug | string | URL-friendly slug |
| description | string | Agent description |
| department_id | UUID | FK to departments |
| avatar_url | string | Avatar image URL |
| model | enum | 'sonnet', 'opus', 'haiku' |
| system_prompt | string | Base system prompt |
| permission_mode | enum | 'default', 'acceptEdits', 'bypassPermissions' |
| max_turns | number | Max conversation turns |
| is_enabled | boolean | Agent is available |
| is_head | boolean | Department head agent |
| config | jsonb | Additional config |
| current_version | number | Current version |
| published_version | number | Published version |

#### `agent_schedules` (Admin Schema)
Scheduled tasks for agents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | FK to ai_agents |
| name | string | Schedule name |
| cron_expression | string | Cron schedule |
| timezone | string | Timezone |
| task_prompt | string | Task to execute |
| requires_approval | boolean | Needs approval |
| is_enabled | boolean | Schedule active |
| last_run_at | timestamp | Last execution |
| next_run_at | timestamp | Next execution |

#### `agent_schedule_executions` (Admin Schema)
Execution records for scheduled tasks.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| schedule_id | UUID | FK to schedules |
| agent_id | UUID | FK to ai_agents |
| scheduled_for | timestamp | Scheduled time |
| status | enum | Execution status |
| approved_by | UUID | Who approved |
| approved_at | timestamp | When approved |
| rejection_reason | string | Why rejected |
| result | jsonb | Execution result |
| tool_calls | jsonb[] | Tools used |
| error_message | string | Error if failed |
| tokens_input | number | Input tokens |
| tokens_output | number | Output tokens |
| cost_usd | number | Cost in USD |
| duration_ms | number | Duration |

---

## Type Definitions

### Core Enums
```typescript
type AgentModel = 'sonnet' | 'opus' | 'haiku'

type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions'

type ScheduleExecutionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

type ToolCategory =
  | 'finance'
  | 'crm'
  | 'team'
  | 'projects'
  | 'knowledge'
  | 'communications'
  | 'goals'
  | 'agents'
```

### Agent Types
```typescript
interface AIAgent {
  id: string
  name: string
  slug: string | null
  description: string | null
  department_id: string | null
  avatar_url: string | null
  model: AgentModel
  system_prompt: string
  permission_mode: PermissionMode
  max_turns: number
  is_enabled: boolean
  is_head: boolean
  config: Record<string, unknown>
  current_version: number
  published_version: number | null
  created_at: string
  updated_at: string
  department?: AgentDepartment | null
  tools?: AgentTool[]
  skills?: AgentSkill[]
  rules?: AgentRule[]
}

interface AgentWithHireStatus extends AIAgent {
  isHired: boolean
  localAgentId: string | null
  hiredAt: string | null
}

interface LocalAgent {
  id: string
  workspace_id: string
  ai_agent_id: string | null
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  tools: string[]
  model: string
  is_active: boolean
  created_by: string | null
  hired_at: string | null
  created_at: string
  updated_at: string
}
```

### Conversation Types
```typescript
interface AgentConversation {
  id: string
  agent_id: string
  workspace_id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface AgentMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  parts: MessagePart[] | null
  created_at: string
}

interface MessagePart {
  type: 'text' | 'reasoning' | 'tool-invocation' | 'tool-result'
  text?: string
  reasoning?: string
  toolInvocation?: {
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
    state: 'call' | 'result'
    result?: unknown
  }
}
```

### Schedule Types
```typescript
interface AgentSchedule {
  id: string
  agent_id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  task_prompt: string
  requires_approval: boolean
  output_config: Record<string, unknown>
  is_enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  agent?: AIAgent
}

interface AgentScheduleExecution {
  id: string
  schedule_id: string
  agent_id: string
  scheduled_for: string
  started_at: string | null
  completed_at: string | null
  status: ScheduleExecutionStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  result: Record<string, unknown> | null
  tool_calls: Record<string, unknown>[] | null
  error_message: string | null
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  duration_ms: number | null
  created_at: string
  schedule?: AgentSchedule
  agent?: AIAgent
}
```

---

## Tools System

### Available Tools
Agents can be configured with these tools:

| Tool | Category | Description |
|------|----------|-------------|
| transactions | finance | Query transactions |
| budgets | finance | Access budget data |
| accounts | finance | List accounts |
| goals | finance | Goal tracking |
| leads | crm | Lead management |
| opportunities | crm | Sales opportunities |
| tasks | crm | Task management |
| webSearch | general | Web search |
| dataExport | general | Export data |
| knowledge | knowledge | Knowledge base |
| projects | projects | Project data |
| projectTasks | projects | Project tasks |
| teamMembers | team | Team member info |

### Tool Schemas
```typescript
// Example: getTransactions
{
  limit?: number,        // Max results (default 50)
  category?: string,     // Filter by category
  startDate?: string,    // ISO date
  endDate?: string,      // ISO date
  search?: string        // Search term
}

// Example: getBudgets
{
  includeSpending?: boolean  // Include spending data
}

// Example: getAccounts
{
  type?: string  // Filter by account type
}

// Example: getGoals
{
  status?: string  // 'active' | 'completed' | 'all'
}
```

---

## Default Agents

New workspaces auto-seed with 7 default agents:

| Agent | Tools | Description |
|-------|-------|-------------|
| Budget Coach | budgets, transactions | Spending analysis |
| Sales Agent | leads, opportunities, tasks | Lead/opportunity management |
| Investment Advisor | goals, accounts | Goal tracking |
| Expense Auditor | transactions | Transaction analysis |
| Project Manager | projects, projectTasks | Project/task management |
| Report Generator | transactions, budgets, accounts | Financial reporting |
| Knowledge Curator | knowledge | Documentation management |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Successful GET/PATCH/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing required fields, validation errors |
| 401 | Unauthorized | No authentication session |
| 403 | Forbidden | Not workspace member, insufficient role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (e.g., already hired) |
| 500 | Server Error | Database/internal errors |

### Error Response Format
```typescript
{
  error: string,      // Error message
  message?: string    // Additional context
}
```

---

# Part 3: Client-Side State Management

---

## Agents Provider

The `useAgents()` hook provides centralized state management for the entire Agents product.

### Setup

Wrap your app with `AgentsProvider`:

```tsx
import { AgentsProvider } from "@/providers/agents-provider"

function App() {
  return (
    <AgentsProvider>
      {children}
    </AgentsProvider>
  )
}
```

### Full Interface

```typescript
interface AgentsContextType {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════

  agents: AgentWithHireStatus[]           // All agents with hire status
  myAgents: AgentWithHireStatus[]         // Filtered to hired agents only
  currentAgent: AIAgent | null            // Currently selected agent
  conversations: AgentConversation[]      // Conversations for current agent
  currentConversation: AgentConversation | null
  executions: AgentScheduleExecution[]    // Execution history
  pendingApprovals: AgentScheduleExecution[]  // Filtered to pending only
  schedules: AgentSchedule[]              // All schedules
  pendingCount: number                    // Count of pending approvals
  workspaceId: string | undefined         // Current workspace context

  // Loading states
  isLoading: boolean                      // Initial agents fetch
  isLoadingAgent: boolean                 // Single agent fetch
  isLoadingActivity: boolean              // Activity/executions fetch
  isLoadingSchedules: boolean             // Schedules fetch

  // ═══════════════════════════════════════════════════════════════
  // LOOKUP HELPERS
  // ═══════════════════════════════════════════════════════════════

  getAgentById(id: string): AgentWithHireStatus | undefined
  getLocalAgentById(id: string): AgentWithHireStatus | undefined
  getConversationById(id: string): AgentConversation | undefined

  // ═══════════════════════════════════════════════════════════════
  // AGENT ACTIONS
  // ═══════════════════════════════════════════════════════════════

  fetchAgents(filters?: AgentFilters): Promise<void>
  fetchAgent(id: string): Promise<AIAgent | null>
  hireAgent(agentId: string): Promise<LocalAgent | null>
  unhireAgent(localAgentId: string): Promise<void>
  refreshAgents(): Promise<void>

  // ═══════════════════════════════════════════════════════════════
  // CONVERSATION ACTIONS
  // ═══════════════════════════════════════════════════════════════

  fetchConversations(agentId: string): Promise<void>
  createConversation(agentId: string, title?: string): Promise<AgentConversation | null>
  setCurrentConversation(conversation: AgentConversation | null): void

  // ═══════════════════════════════════════════════════════════════
  // ACTIVITY ACTIONS
  // ═══════════════════════════════════════════════════════════════

  fetchActivity(filters?: ActivityFilters): Promise<void>
  fetchPendingApprovals(): Promise<void>
  approveExecution(executionId: string): Promise<void>
  rejectExecution(executionId: string, reason?: string): Promise<void>

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULE ACTIONS
  // ═══════════════════════════════════════════════════════════════

  fetchSchedules(): Promise<void>
  toggleSchedule(scheduleId: string, enabled: boolean): Promise<void>

  // ═══════════════════════════════════════════════════════════════
  // DIALOG STATE (for Hire dialog)
  // ═══════════════════════════════════════════════════════════════

  showHireAgent: boolean
  setShowHireAgent(show: boolean): void
  selectedAgentForHire: AIAgent | null
  setSelectedAgentForHire(agent: AIAgent | null): void
}
```

### Filter Types

```typescript
interface AgentFilters {
  search?: string           // Search by name/description
  category?: string         // Filter by category
  department_id?: string    // Filter by department
  hired_only?: boolean      // Only show hired agents
  limit?: number            // Pagination limit
  offset?: number           // Pagination offset
}

interface ActivityFilters {
  agent_id?: string         // Filter by agent
  status?: string           // Filter by status
  from_date?: string        // ISO date start
  to_date?: string          // ISO date end
  limit?: number            // Pagination limit
  offset?: number           // Pagination offset
}
```

### Usage Example

```tsx
import { useAgents } from "@/providers/agents-provider"

function MyAgentsPage() {
  const {
    myAgents,
    isLoading,
    fetchActivity,
    fetchSchedules,
  } = useAgents()

  useEffect(() => {
    fetchActivity({ limit: 50 })
    fetchSchedules()
  }, [fetchActivity, fetchSchedules])

  if (isLoading) return <Loading />

  return (
    <div>
      {myAgents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}
```

---

## How Agents Are Fetched

### Automatic Fetch on Mount

When the `AgentsProvider` mounts, it **automatically fetches all agents** for the current workspace:

```
┌─────────────────────────────────────────────────────────────────┐
│  App Mounts                                                      │
│      ↓                                                           │
│  AgentsProvider initializes                                      │
│      ↓                                                           │
│  useEffect detects workspaceId                                   │
│      ↓                                                           │
│  Calls fetchAgents() + fetchPendingApprovals() automatically     │
│      ↓                                                           │
│  GET /api/agents?workspaceId={id}                                │
│      ↓                                                           │
│  Response: { agents: AgentWithHireStatus[], total: number }      │
│      ↓                                                           │
│  State updated: agents, myAgents, isLoading=false                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────────┐     GET /api/agents      ┌──────────────────┐
│                  │  ─────────────────────►  │                  │
│  AgentsProvider  │     ?workspaceId=xxx     │   API Route      │
│                  │  ◄─────────────────────  │                  │
│  (Client)        │     { agents: [...] }    │   (Server)       │
└────────┬─────────┘                          └────────┬─────────┘
         │                                             │
         │ Sets state:                                 │ Queries:
         │ - agents[]                                  │ - ai_agents (all available)
         │ - myAgents[] (filtered)                     │ - agents (workspace hired)
         │ - isLoading                                 │ - Joins hire status
         │                                             │
         ▼                                             ▼
┌──────────────────┐                          ┌──────────────────┐
│  Components use  │                          │  Returns agents  │
│  useAgents()     │                          │  with isHired,   │
│  to access data  │                          │  localAgentId    │
└──────────────────┘                          └──────────────────┘
```

### Database Tables Queried

The `GET /api/agents` endpoint queries **two tables** and merges them:

| Table | Purpose | Scope |
|-------|---------|-------|
| `ai_agents` | Global agent catalog (all available agents) | Shared across all workspaces |
| `agents` | Local hired copies | Per-workspace (created when user hires) |

### Query Flow (Step by Step)

```sql
-- STEP 1: Get hired agents for this workspace
-- Creates a lookup map: ai_agent_id → { localAgentId, hiredAt }

SELECT id, ai_agent_id, hired_at
FROM agents                              -- ← Local workspace table
WHERE workspace_id = '{workspaceId}'
  AND is_active = true
  AND ai_agent_id IS NOT NULL;

-- Result: Builds a Map for quick lookup
-- Example: { "ai-agent-uuid-1" → { localAgentId: "local-uuid-123", hiredAt: "2024-01-15" } }
```

```sql
-- STEP 2: Get all available agents from global catalog

SELECT id, name, slug, description, avatar_url, model,
       system_prompt, permission_mode, max_turns, is_enabled,
       is_head, config, current_version, published_version,
       created_at, updated_at
FROM ai_agents                           -- ← Global catalog table
WHERE is_enabled = true
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

```typescript
// STEP 3: Merge hire status (done in code)

agents = aiAgents.map(agent => {
  const hireInfo = hiredMap.get(agent.id)  // Look up in Step 1 results

  return {
    ...agent,                               // All ai_agents fields
    isHired: !!hireInfo,                    // true if found in map
    localAgentId: hireInfo?.localAgentId,   // ID in workspace agents table
    hiredAt: hireInfo?.hiredAt,             // When they hired it
  }
})
```

### Visual: How Tables Relate

```
┌─────────────────────────────────────────────────────────────────┐
│  ai_agents (Global Catalog)                                      │
│  ═══════════════════════════                                     │
│  │ id          │ name           │ description        │ ...      │
│  ├─────────────┼────────────────┼────────────────────┼──────────┤
│  │ ai-uuid-1   │ Budget Coach   │ Helps with budgets │ ...      │
│  │ ai-uuid-2   │ Sales Agent    │ Manages leads      │ ...      │
│  │ ai-uuid-3   │ Report Gen     │ Creates reports    │ ...      │
│  └─────────────┴────────────────┴────────────────────┴──────────┘
                    │
                    │ When user hires, creates record pointing back
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  agents (Workspace Local)                                        │
│  ════════════════════════                                        │
│  │ id          │ workspace_id │ ai_agent_id │ hired_at   │ ...  │
│  ├─────────────┼──────────────┼─────────────┼────────────┼──────┤
│  │ local-123   │ ws-abc       │ ai-uuid-1   │ 2024-01-15 │ ...  │  ← Hired!
│  │ local-456   │ ws-abc       │ ai-uuid-3   │ 2024-01-20 │ ...  │  ← Hired!
│  └─────────────┴──────────────┴─────────────┴────────────┴──────┘
                                      │
                                      │ ai-uuid-2 NOT in this table
                                      │ = NOT hired by this workspace
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Final Response (merged)                                         │
│  ═══════════════════════                                         │
│  │ id        │ name         │ isHired │ localAgentId │ hiredAt  │
│  ├───────────┼──────────────┼─────────┼──────────────┼──────────┤
│  │ ai-uuid-1 │ Budget Coach │ true    │ local-123    │ 2024-01-15
│  │ ai-uuid-2 │ Sales Agent  │ false   │ null         │ null      │
│  │ ai-uuid-3 │ Report Gen   │ true    │ local-456    │ 2024-01-20
│  └───────────┴──────────────┴─────────┴──────────────┴──────────┘
```

### Why Two Tables?

1. **`ai_agents`** = The "App Store" of agents
   - Managed by admins
   - Defines what agents exist and their capabilities
   - Same for all workspaces

2. **`agents`** = Your workspace's "installed apps"
   - Created when you hire an agent
   - Stores workspace-specific config (if any)
   - `ai_agent_id` links back to the catalog

This separation allows:
- Central management of agent definitions
- Per-workspace hiring/configuration
- Soft delete (unhire sets `is_active = false`)

### What the API Returns

The `GET /api/agents` endpoint returns agents with hire status:

```typescript
// Request
GET /api/agents?workspaceId=abc-123

// Response
{
  agents: [
    {
      // Base agent info (from ai_agents table)
      id: "agent-uuid-1",
      name: "Budget Coach",
      description: "Helps track spending and budgets",
      avatar_url: "💰",
      model: "sonnet",
      system_prompt: "You are a budget coach...",
      tools: ["budgets", "transactions"],
      is_enabled: true,

      // Hire status (computed from workspace's agents table)
      isHired: true,                    // ← Is this agent hired?
      localAgentId: "local-uuid-123",   // ← ID in workspace agents table
      hiredAt: "2024-01-15T10:30:00Z"   // ← When was it hired?
    },
    {
      id: "agent-uuid-2",
      name: "Sales Agent",
      description: "Manages leads and opportunities",
      avatar_url: "📈",
      // ...

      isHired: false,                   // ← Not hired yet
      localAgentId: null,
      hiredAt: null
    }
  ],
  total: 2
}
```

### Client-Side Computed Values

The provider computes derived values from the fetched agents:

```typescript
// In AgentsProvider:

// All agents (hired + not hired)
const agents = data.agents  // ← Set from API response

// Only hired agents (filtered client-side)
const myAgents = agents.filter(a => a.isHired)

// Pending approvals (filtered from executions)
const pendingApprovals = executions.filter(e => e.status === "pending_approval")
const pendingCount = pendingApprovals.length
```

### When to Manually Fetch

The provider auto-fetches on mount, but you can manually refresh:

```typescript
const { fetchAgents, refreshAgents } = useAgents()

// With filters
await fetchAgents({
  search: "budget",        // Search by name/description
  hired_only: true,        // Only hired agents
  limit: 10,               // Pagination
  offset: 0,
})

// Or just refresh all
await refreshAgents()  // Same as fetchAgents() with no filters
```

### Hire Flow

When a user hires an agent:

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Hire Agent"                                        │
│      ↓                                                           │
│  Call hireAgent(agentId)                                         │
│      ↓                                                           │
│  POST /api/agents/{id}/hire  { workspaceId }                     │
│      ↓                                                           │
│  Server creates record in `agents` table (local workspace copy)  │
│      ↓                                                           │
│  Response: LocalAgent { id, workspace_id, ai_agent_id, ... }     │
│      ↓                                                           │
│  Provider updates state:                                         │
│  - agents[].isHired = true                                       │
│  - agents[].localAgentId = response.id                           │
│  - agents[].hiredAt = response.hired_at                          │
│      ↓                                                           │
│  myAgents automatically includes the new agent (computed)        │
└─────────────────────────────────────────────────────────────────┘
```

### Complete Example: Discover Page

```tsx
import { useAgents } from "@/providers/agents-provider"

function DiscoverPage() {
  const {
    agents,           // All agents (hired + not hired)
    myAgents,         // Just hired agents
    isLoading,
    hireAgent,
    showHireAgent,
    setShowHireAgent,
    selectedAgentForHire,
    setSelectedAgentForHire,
  } = useAgents()

  // Agents are already loaded by provider on mount!
  // No need to call fetchAgents() here

  const handleHire = async () => {
    if (!selectedAgentForHire) return

    const localAgent = await hireAgent(selectedAgentForHire.id)
    if (localAgent) {
      // Navigate to chat with the newly hired agent
      router.push(`/agents/${localAgent.id}`)
    }
  }

  return (
    <div>
      {/* Grid of all agents */}
      {agents.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onHire={() => {
            setSelectedAgentForHire(agent)
            setShowHireAgent(true)
          }}
        />
      ))}

      {/* Hire confirmation dialog */}
      <Dialog open={showHireAgent} onOpenChange={setShowHireAgent}>
        <DialogContent>
          <h2>Hire {selectedAgentForHire?.name}?</h2>
          <Button onClick={handleHire}>Confirm</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

# Part 4: Chat System

---

## Chat Hook

The `useAgentChat()` hook manages real-time chat with agents via SSE streaming.

### Options

```typescript
interface UseAgentChatOptions {
  agentId: string                                      // Required: Agent to chat with
  workspaceId: string                                  // Required: Workspace context
  conversationId?: string | null                       // Optional: Resume existing conversation
  initialMessages?: AgentMessage[]                     // Optional: Pre-populate messages
  onConversationCreated?: (id: string) => void         // Callback when new conversation created
  onError?: (error: Error) => void                     // Error callback
}
```

### Return Value

```typescript
interface UseAgentChatReturn {
  // State
  messages: AgentMessage[]              // All messages in conversation
  status: ChatStatus                    // "idle" | "connecting" | "streaming" | "error"
  error: Error | null                   // Current error if any
  conversationId: string | null         // Current conversation ID
  sessionId: string | null              // Claude SDK session ID
  isStreaming: boolean                  // Convenience: status === "streaming"
  usage: {                              // Token usage after completion
    inputTokens: number
    outputTokens: number
    costUsd: number
  } | null

  // Actions
  sendMessage(content: string): Promise<void>   // Send a message
  stopGeneration(): void                        // Abort current stream
  clearMessages(): void                         // Clear conversation
  setMessages(messages: AgentMessage[]): void   // Replace messages
}
```

### Message Types

```typescript
interface AgentMessage {
  id: string
  role: "user" | "assistant"
  content: string                       // Full text content
  parts: MessagePart[]                  // Structured parts
  createdAt: Date
}

type MessagePart = TextPart | ReasoningPart | ToolCallPart

interface TextPart {
  type: "text"
  text: string
}

interface ReasoningPart {
  type: "reasoning"
  reasoning: string                     // Extended thinking content
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

### Usage Example

```tsx
import { useAgentChat } from "@/hooks/use-agent-chat"

function AgentChatPage({ agentId, workspaceId }) {
  const {
    messages,
    status,
    isStreaming,
    usage,
    sendMessage,
    stopGeneration,
  } = useAgentChat({
    agentId,
    workspaceId,
    onConversationCreated: (id) => {
      router.push(`/agents/${agentId}?conversation=${id}`)
    },
  })

  const handleSubmit = async (content: string) => {
    await sendMessage(content)
  }

  return (
    <div>
      <MessageList messages={messages} />
      {isStreaming && <Button onClick={stopGeneration}>Stop</Button>}
      <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
      {usage && <UsageDisplay usage={usage} />}
    </div>
  )
}
```

---

## Chat Streaming Endpoint

### `POST /api/agent-chat`

Real-time chat with agents using Server-Sent Events (SSE).

**Request:**
```typescript
{
  message: string           // User message content
  agentId: string           // Local agent ID (from agents table)
  workspaceId: string       // Workspace context
  conversationId?: string   // Optional: Resume existing conversation
}
```

**Response:** `text/event-stream`

### SSE Event Format

Events are sent in standard SSE format:
```
event: <event_type>
data: <json_payload>

```

### Event Types

#### `session` - Session Established
```typescript
{
  type: "session"
  sessionId: string         // Claude SDK session ID for resumption
  conversationId: string    // Database conversation ID
  isResumed: boolean        // Whether this resumed an existing session
}
```

#### `text` - Streaming Text Content
```typescript
{
  type: "text"
  content: string           // Text chunk (append to previous)
  isComplete: boolean       // True when text block finished
}
```

#### `reasoning` - Extended Thinking
```typescript
{
  type: "reasoning"
  content: string           // Reasoning chunk (append to previous)
  isComplete: boolean       // True when reasoning block finished
}
```

#### `tool_start` - Tool Execution Started
```typescript
{
  type: "tool_start"
  toolName: string          // MCP tool name (e.g., "manageTransactions")
  toolCallId: string        // Unique tool call ID
  args: unknown             // Tool input arguments
  displayName: string       // Human-readable name (e.g., "Transactions")
}
```

#### `tool_result` - Tool Execution Complete
```typescript
{
  type: "tool_result"
  toolCallId: string        // Matches tool_start toolCallId
  toolName: string          // MCP tool name
  result: unknown           // Tool output
  success: boolean          // Whether tool succeeded
  durationMs: number        // Execution time
}
```

#### `error` - Error Occurred
```typescript
{
  type: "error"
  message: string           // Error message
  code?: string             // Error code if available
  recoverable: boolean      // Whether client can retry
}
```

#### `done` - Generation Complete
```typescript
{
  type: "done"
  usage: {
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  turnCount: number         // Number of agent turns used
}
```

### Example SSE Stream

```
event: session
data: {"type":"session","sessionId":"sess_abc123","conversationId":"conv_xyz789","isResumed":false}

event: text
data: {"type":"text","content":"Let me check your ","isComplete":false}

event: text
data: {"type":"text","content":"recent transactions.","isComplete":false}

event: text
data: {"type":"text","content":"","isComplete":true}

event: tool_start
data: {"type":"tool_start","toolName":"manageTransactions","toolCallId":"tc_001","args":{"limit":10},"displayName":"Transactions"}

event: tool_result
data: {"type":"tool_result","toolCallId":"tc_001","toolName":"manageTransactions","result":{"transactions":[...]},"success":true,"durationMs":142}

event: text
data: {"type":"text","content":"I found 10 recent transactions...","isComplete":false}

event: done
data: {"type":"done","usage":{"inputTokens":1523,"outputTokens":847,"costUsd":0.0089},"turnCount":2}
```

---

# Part 5: MCP Tools System

---

## Overview

Agents execute tools via Model Context Protocol (MCP) servers. Tools are workspace-scoped and provide access to application data.

## Available Tools

### Finance Tools (5)

| Tool | Description | Key Actions |
|------|-------------|-------------|
| `manageTransactions` | Financial transactions | Query, categorize, annotate |
| `manageBudgets` | Budget management | View status, create, track spending |
| `manageAccounts` | Account data | Query balances, net worth |
| `manageGoals` | Financial goals | Track progress, update targets |
| `exportData` | Data export | Export as CSV or JSON |

### Business Tools (2)

| Tool | Description | Key Actions |
|------|-------------|-------------|
| `manageCRM` | CRM data | Leads, opportunities, tasks |
| `manageProjects` | Project management | Projects, tasks, team assignments |

### Knowledge Tools (3)

| Tool | Description | Key Actions |
|------|-------------|-------------|
| `manageKnowledge` | Documentation | Create, update pages |
| `manageMemory` | Persistent memory | Store/retrieve agent memories |
| `searchWeb` | Web search | Search for information |

### Workspace Tools (3)

| Tool | Description | Key Actions |
|------|-------------|-------------|
| `manageMessaging` | Team messaging | Channels, messages, DMs |
| `manageSales` | Sales pipeline | Deals, activities, contacts |
| `queryAnalytics` | Analytics | Reports, KPIs, forecasts |

---

## Tool ID Mapping

Old tool IDs (stored in agent config) map to new MCP tool names:

```typescript
const toolIdMapping = {
  // Finance (1:1)
  transactions: "manageTransactions",
  budgets: "manageBudgets",
  accounts: "manageAccounts",
  goals: "manageGoals",
  dataExport: "exportData",

  // CRM → consolidated into manageCRM
  leads: "manageCRM",
  opportunities: "manageCRM",
  tasks: "manageCRM",

  // Projects → consolidated into manageProjects
  projects: "manageProjects",
  projectTasks: "manageProjects",
  teamMembers: "manageProjects",

  // Knowledge (1:1)
  knowledge: "manageKnowledge",
  memory: "manageMemory",
  webSearch: "searchWeb",

  // New tools
  messaging: "manageMessaging",
  sales: "manageSales",
  analytics: "queryAnalytics",
}
```

---

## Tool Metadata

Each tool has display metadata for UI:

```typescript
interface ToolMetadata {
  id: string          // Tool name
  name: string        // Display name
  description: string // Short description
  icon: string        // Lucide icon name
  server: string      // MCP server name
}

// Example
{
  id: "manageTransactions",
  name: "Transactions",
  description: "Query, categorize, and annotate financial transactions",
  icon: "Receipt",
  server: "finance-tools"
}
```

### All Tool Metadata

| Tool | Display Name | Icon |
|------|--------------|------|
| manageTransactions | Transactions | Receipt |
| manageBudgets | Budgets | PieChart |
| manageAccounts | Accounts | Wallet |
| manageGoals | Goals | Target |
| exportData | Data Export | Download |
| manageCRM | CRM | Users |
| manageProjects | Projects | FolderKanban |
| manageKnowledge | Knowledge | BookOpen |
| manageMemory | Memory | Brain |
| searchWeb | Web Search | Search |
| manageMessaging | Messaging | MessageSquare |
| manageSales | Sales | TrendingUp |
| queryAnalytics | Analytics | BarChart3 |

---

## Tool Execution Flow

1. **Agent Configuration**
   - Agent has `tools: string[]` (old tool IDs)
   - IDs are mapped to MCP tool names via `mapToolIdsToMCPNames()`

2. **Server Creation**
   - Workspace-scoped MCP server created with enabled tools
   - Server receives `workspaceId`, `userId`, `agentId` context

3. **Tool Call**
   - Claude Agent SDK invokes tool through MCP
   - Tool validates input against Zod schema
   - Tool executes with workspace context

4. **Result Streaming**
   - `tool_start` event sent when tool begins
   - `tool_result` event sent when complete
   - Results included in agent response

---

## Questions?

Reach out to the web team for clarification on any design or API decisions.
