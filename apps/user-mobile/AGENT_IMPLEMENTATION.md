# Agent Implementation Documentation

Technical reference for the DreamTeam Agent Builder system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [TypeScript Types](#typescript-types)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [Utility Libraries](#utility-libraries)
7. [Built-in Tools Registry](#built-in-tools-registry)
8. [Usage Examples](#usage-examples)

---

## Architecture Overview

The Agent Builder is a comprehensive system for creating, configuring, and managing AI agents powered by the Anthropic Claude SDK.

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (PostgreSQL with RLS)
- **AI Integration**: Anthropic Claude Agent SDK
- **Scheduling**: Vercel Cron

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Panel UI                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Agents List │  │ Agent       │  │ Scheduled Tasks         │  │
│  │ /admin/     │  │ Builder     │  │ /admin/scheduled-tasks  │  │
│  │ agents      │  │ /agents/[id]│  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                   │
│  /api/admin/agents/*  │  /api/admin/scheduled-tasks/*           │
│  /api/cron/check-schedules                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ ai_agents    │  │ agent_       │  │ agent_schedule_    │    │
│  │ agent_tools  │  │ versions     │  │ executions         │    │
│  │ agent_skills │  │ agent_rules  │  │ agent_schedules    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Agent Configuration**: Define agents with name, model, system prompt, tools, skills, rules
- **Version Control**: Track changes with automatic versioning and publish capability
- **Sandbox Testing**: Test agents in isolation with mock/simulate/live tool modes
- **Scheduling**: Create recurring tasks with cron expressions and approval workflows
- **SDK Integration**: Generate Anthropic Agent SDK-compatible configurations

---

## Database Schema

Three migration files establish the agent infrastructure.

### Migration 060: Core Agent Tables

**File**: `supabase/migrations/060_agent_builder.sql`

#### ai_agents

Main agent configuration table.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Agent display name |
| slug | TEXT | URL-friendly identifier (unique) |
| description | TEXT | Agent description |
| department_id | UUID | FK to agent_departments |
| avatar_url | TEXT | Agent avatar image URL |
| model | TEXT | 'sonnet' \| 'opus' \| 'haiku' |
| system_prompt | TEXT | Base system instructions |
| permission_mode | TEXT | 'default' \| 'acceptEdits' \| 'bypassPermissions' |
| max_turns | INTEGER | Maximum conversation turns (default: 10) |
| is_enabled | BOOLEAN | Whether agent is active |
| is_head | BOOLEAN | Whether agent is department head |
| config | JSONB | Additional configuration |
| current_version | INTEGER | Current version number |
| published_version | INTEGER | Published version number |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### agent_departments

Organizational units for grouping agents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Department name |
| description | TEXT | Department description |
| icon | TEXT | Icon identifier (default: 'building-2') |
| default_model | TEXT | Default model for department agents |
| head_agent_id | UUID | FK to ai_agents (department head) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### agent_tools

Registry of available tools (291 pre-built tools).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Tool name (unique) |
| description | TEXT | Tool description |
| category | TEXT | 'finance' \| 'crm' \| 'team' \| 'projects' \| 'knowledge' \| 'communications' \| 'goals' \| 'agents' |
| input_schema | JSONB | JSON Schema for tool inputs |
| is_builtin | BOOLEAN | Whether tool is system-provided |
| is_enabled | BOOLEAN | Whether tool is available |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### agent_skills

Reusable skill definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Skill name |
| description | TEXT | Skill description |
| department_id | UUID | FK to agent_departments |
| skill_content | TEXT | Skill instructions/content |
| is_enabled | BOOLEAN | Whether skill is available |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### mcp_integrations

MCP (Model Context Protocol) external tool connections.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Integration name |
| description | TEXT | Integration description |
| type | TEXT | 'stdio' \| 'sse' \| 'http' |
| config | JSONB | Connection configuration |
| auth_type | TEXT | 'none' \| 'api_key' \| 'oauth' \| 'basic' |
| auth_config | JSONB | Authentication configuration |
| is_enabled | BOOLEAN | Whether integration is active |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### Assignment Tables

**ai_agent_tools** (many-to-many agent-tool)
```sql
agent_id UUID, tool_id UUID, config JSONB
PRIMARY KEY (agent_id, tool_id)
```

**ai_agent_skills** (many-to-many agent-skill)
```sql
agent_id UUID, skill_id UUID
PRIMARY KEY (agent_id, skill_id)
```

**ai_agent_mcp_integrations** (many-to-many agent-mcp)
```sql
agent_id UUID, mcp_integration_id UUID
PRIMARY KEY (agent_id, mcp_integration_id)
```

#### agent_delegations

Agent-to-agent delegation rules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| from_agent_id | UUID | Delegating agent |
| to_agent_id | UUID | Target agent |
| condition | TEXT | When to delegate |
| context_template | TEXT | Context to pass |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

### Migration 062: Extended Agent Tables

**File**: `supabase/migrations/062_agent_builder_extended.sql`

#### agent_versions

Version control for agents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | FK to ai_agents |
| version | INTEGER | Version number |
| config_snapshot | JSONB | Full config at this version |
| change_type | TEXT | 'created' \| 'identity' \| 'tools' \| 'skills' \| 'prompt' \| 'team' \| 'rules' \| 'rollback' \| 'published' |
| change_description | TEXT | Description of changes |
| change_details | JSONB | Detailed change data |
| is_published | BOOLEAN | Whether version is published |
| published_at | TIMESTAMPTZ | Publication timestamp |
| published_by | UUID | User who published |
| created_by | UUID | User who created version |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Unique constraint**: `(agent_id, version)`

#### agent_rules

Behavioral guardrails for agents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | FK to ai_agents |
| rule_type | TEXT | 'always' \| 'never' \| 'when' \| 'respond_with' |
| rule_content | TEXT | Rule instruction |
| condition | TEXT | Condition for 'when' type rules |
| priority | INTEGER | Rule priority (higher = first) |
| is_enabled | BOOLEAN | Whether rule is active |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### agent_prompt_sections

Structured prompt building blocks.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | FK to ai_agents |
| section_type | TEXT | 'identity' \| 'personality' \| 'capabilities' \| 'constraints' \| 'examples' \| 'custom' |
| section_title | TEXT | Section heading |
| section_content | TEXT | Section content |
| position | INTEGER | Order in prompt |
| is_enabled | BOOLEAN | Whether section is included |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### agent_test_sessions

Sandbox testing sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | FK to ai_agents |
| version | INTEGER | Agent version being tested |
| started_by | UUID | User who started session |
| started_at | TIMESTAMPTZ | Session start time |
| ended_at | TIMESTAMPTZ | Session end time |
| test_config | JSONB | `{tool_mode: 'mock' \| 'simulate' \| 'live'}` |
| total_turns | INTEGER | Number of conversation turns |
| total_tokens | INTEGER | Total tokens used |
| total_cost_usd | NUMERIC | Estimated cost |
| status | TEXT | 'active' \| 'completed' \| 'failed' \| 'timeout' |
| error_message | TEXT | Error if failed |
| notes | TEXT | Session notes |

#### agent_test_messages

Test conversation history.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to agent_test_sessions |
| role | TEXT | 'user' \| 'assistant' \| 'system' \| 'tool_use' \| 'tool_result' |
| content | TEXT | Message content |
| tool_name | TEXT | Tool name (if tool call) |
| tool_input | JSONB | Tool input parameters |
| tool_output | JSONB | Tool result |
| tool_use_id | TEXT | Claude's tool_use ID |
| latency_ms | INTEGER | Response latency |
| tokens_input | INTEGER | Input tokens for this message |
| tokens_output | INTEGER | Output tokens for this message |
| sequence_number | INTEGER | Message order |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### agent_prompt_templates

Pre-defined prompt templates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Template name (unique) |
| description | TEXT | Template description |
| role | TEXT | Target role (e.g., 'sdr', 'account_executive') |
| department | TEXT | Target department |
| sections | JSONB | Array of `{type, title, content}` |
| is_system | BOOLEAN | Whether system-provided |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Seeded templates**: SDR Agent, Account Executive, AR Clerk, Customer Success Manager

---

### Migration 063: Scheduling Tables

**File**: `supabase/migrations/063_agent_schedules.sql`

#### agent_schedules

Recurring task definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | FK to ai_agents |
| name | TEXT | Schedule name |
| description | TEXT | Schedule description |
| cron_expression | TEXT | Cron expression (e.g., "0 9 * * *") |
| timezone | TEXT | Timezone (default: 'UTC') |
| task_prompt | TEXT | What the agent should do |
| requires_approval | BOOLEAN | Whether human approval needed |
| output_config | JSONB | Optional output configuration |
| is_enabled | BOOLEAN | Whether schedule is active |
| last_run_at | TIMESTAMPTZ | Last execution time |
| next_run_at | TIMESTAMPTZ | Next scheduled time |
| created_by | UUID | User who created schedule |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### agent_schedule_executions

Execution history for scheduled tasks.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| schedule_id | UUID | FK to agent_schedules |
| agent_id | UUID | FK to ai_agents |
| scheduled_for | TIMESTAMPTZ | When it was scheduled to run |
| started_at | TIMESTAMPTZ | Actual start time |
| completed_at | TIMESTAMPTZ | Completion time |
| status | TEXT | 'pending_approval' \| 'approved' \| 'rejected' \| 'running' \| 'completed' \| 'failed' \| 'cancelled' |
| approved_by | UUID | User who approved |
| approved_at | TIMESTAMPTZ | Approval timestamp |
| rejection_reason | TEXT | Reason for rejection |
| result | JSONB | Execution result |
| tool_calls | JSONB | Tools used during execution |
| error_message | TEXT | Error if failed |
| tokens_input | INTEGER | Input tokens used |
| tokens_output | INTEGER | Output tokens used |
| cost_usd | NUMERIC(10,6) | Execution cost |
| duration_ms | INTEGER | Execution duration |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

### Database Functions

#### generate_agent_sdk_config(agent_id UUID)

Generates an Anthropic SDK-compatible configuration from agent data.

```sql
SELECT generate_agent_sdk_config('agent-uuid-here');
-- Returns JSONB with full SDK config
```

#### create_agent_version(agent_id, change_type, description, details, created_by)

Creates a versioned snapshot of agent configuration.

```sql
SELECT create_agent_version(
  'agent-uuid',
  'tools',
  'Added finance tools',
  '{"added": ["account_list", "transaction_create"]}'::jsonb,
  'user-uuid'
);
```

#### publish_agent_version(agent_id, version, published_by)

Publishes a specific version for production use.

```sql
SELECT publish_agent_version('agent-uuid', 5, 'user-uuid');
```

---

## TypeScript Types

**File**: `src/types/agents.ts`

### Core Types

```typescript
type AgentModel = 'sonnet' | 'opus' | 'haiku'
type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions'
type RuleType = 'always' | 'never' | 'when' | 'respond_with'
type PromptSectionType = 'identity' | 'personality' | 'capabilities' | 'constraints' | 'examples' | 'custom'
type ToolCategory = 'finance' | 'crm' | 'team' | 'projects' | 'knowledge' | 'communications' | 'goals' | 'agents'
type TestSessionStatus = 'active' | 'completed' | 'failed' | 'timeout'
type TestToolMode = 'mock' | 'simulate' | 'live'
type ScheduleExecutionStatus = 'pending_approval' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed' | 'cancelled'
```

### Main Interfaces

```typescript
interface Agent {
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
}

interface AgentWithRelations extends Agent {
  department?: AgentDepartment | null
  tools?: AgentToolAssignment[]
  skills?: AgentSkillAssignment[]
  delegations?: AgentDelegation[]
  rules?: AgentRule[]
  prompt_sections?: AgentPromptSection[]
}

interface AgentRule {
  id: string
  agent_id: string
  rule_type: RuleType
  rule_content: string
  condition: string | null
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

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
}
```

### SDK Config Types

```typescript
interface AgentSDKConfig {
  name: string
  slug?: string
  description?: string
  model: SDKModelName
  systemPrompt: string
  maxTurns: number
  permissionMode: PermissionMode
  tools: SDKTool[]
  skills?: SDKSkill[]
  rules?: SDKRule[]
  promptSections?: SDKPromptSection[]
  delegations?: SDKDelegation[]
  isHead?: boolean
  departmentId?: string
}

type SDKModelName =
  | 'claude-sonnet-4-20250514'
  | 'claude-opus-4-20250514'
  | 'claude-3-5-haiku-20241022'
```

### Constants

```typescript
const MODEL_DISPLAY_NAMES: Record<AgentModel, string> = {
  haiku: 'Claude 3.5 Haiku',
  sonnet: 'Claude Sonnet 4',
  opus: 'Claude Opus 4'
}

const SCHEDULE_PRESETS = [
  { label: 'Daily', value: 'daily', cron: '0 9 * * *', description: 'Every day at 9:00 AM' },
  { label: 'Weekly', value: 'weekly', cron: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  { label: 'Monthly', value: 'monthly', cron: '0 9 1 * *', description: '1st of each month at 9:00 AM' },
  { label: 'Quarterly', value: 'quarterly', cron: '0 9 1 1,4,7,10 *', description: 'Jan, Apr, Jul, Oct 1st at 9:00 AM' },
  { label: 'Custom', value: 'custom', cron: '', description: 'Define your own schedule' }
]
```

---

## API Endpoints

All endpoints require superadmin authentication via `requireSuperadmin()`.

### Agent CRUD

#### List Agents
```
GET /api/admin/agents
Query: ?department_id=uuid&enabled=true&limit=50&offset=0
Response: { agents: Agent[], total: number }
```

#### Create Agent
```
POST /api/admin/agents
Body: { name, system_prompt, model?, description?, department_id?, permission_mode?, max_turns? }
Response: { agent: Agent }
```

#### Get Agent Detail
```
GET /api/admin/agents/[id]
Response: { agent: AgentWithRelations, versions: AgentVersion[], sdkConfig: AgentSDKConfig }
```

#### Update Agent
```
PATCH /api/admin/agents/[id]
Body: { name?, description?, model?, system_prompt?, permission_mode?, max_turns?, is_enabled?, is_head? }
Response: { agent: Agent, version: AgentVersion }
```

#### Delete Agent
```
DELETE /api/admin/agents/[id]
Response: { success: true }
```

### Tools Management

#### Update Agent Tools
```
PUT /api/admin/agents/[id]/tools
Body: { tool_ids: string[], configs?: Record<string, object> }
Response: { tools: AgentToolAssignment[], version: AgentVersion }
```

### Skills Management

#### Update Agent Skills
```
PUT /api/admin/agents/[id]/skills
Body: { skill_ids: string[] }
Response: { skills: AgentSkillAssignment[], version: AgentVersion }
```

### Rules Management

#### Create Rule
```
POST /api/admin/agents/[id]/rules
Body: { rule_type, rule_content, condition?, priority? }
Response: { rule: AgentRule, version: AgentVersion }
```

#### Update Rule
```
PATCH /api/admin/agents/[id]/rules/[ruleId]
Body: { rule_type?, rule_content?, condition?, priority?, is_enabled? }
Response: { rule: AgentRule, version: AgentVersion }
```

#### Delete Rule
```
DELETE /api/admin/agents/[id]/rules/[ruleId]
Response: { success: true, version: AgentVersion }
```

### Prompt Sections

#### Create Section
```
POST /api/admin/agents/[id]/prompt-sections
Body: { section_type, section_title, section_content, position? }
Response: { section: AgentPromptSection, version: AgentVersion }
```

#### Update Section
```
PATCH /api/admin/agents/[id]/prompt-sections/[sectionId]
Body: { section_type?, section_title?, section_content?, position?, is_enabled? }
Response: { section: AgentPromptSection, version: AgentVersion }
```

#### Delete Section
```
DELETE /api/admin/agents/[id]/prompt-sections/[sectionId]
Response: { success: true, version: AgentVersion }
```

### Team/Delegations

#### Update Delegations
```
PUT /api/admin/agents/[id]/team
Body: { delegations: [{ to_agent_id, condition?, context_template? }] }
Response: { delegations: AgentDelegation[], version: AgentVersion }
```

### Versions

#### Create Version
```
POST /api/admin/agents/[id]/versions
Body: { change_type, change_description?, change_details? }
Response: { version: AgentVersion }
```

#### Publish Version
```
POST /api/admin/agents/[id]/publish
Body: { version: number }
Response: { version: AgentVersion }
```

### Testing

#### Start Test Session
```
POST /api/admin/agents/[id]/test
Body: { tool_mode?: 'mock' | 'simulate' | 'live' }
Response: { session: AgentTestSession }
```

#### Send Test Message
```
POST /api/admin/agents/[id]/test/[sessionId]/message
Body: { content: string }
Response: { message: AgentTestMessage, assistantMessage?: AgentTestMessage, toolCalls?: AgentTestMessage[] }
```

#### End Test Session
```
DELETE /api/admin/agents/[id]/test/[sessionId]
Body: { notes?: string }
Response: { session: AgentTestSession }
```

### Scheduling

#### List Agent Schedules
```
GET /api/admin/agents/[id]/schedules
Response: { schedules: AgentSchedule[] }
```

#### Create Schedule
```
POST /api/admin/agents/[id]/schedules
Body: { name, cron_expression, task_prompt, description?, timezone?, requires_approval?, output_config? }
Response: { schedule: AgentSchedule }
```

#### Update Schedule
```
PATCH /api/admin/agents/[id]/schedules/[scheduleId]
Body: { name?, cron_expression?, task_prompt?, is_enabled?, requires_approval? }
Response: { schedule: AgentSchedule }
```

#### Delete Schedule
```
DELETE /api/admin/agents/[id]/schedules/[scheduleId]
Response: { success: true }
```

#### Run Schedule Now
```
POST /api/admin/agents/[id]/schedules/[scheduleId]/run
Response: { execution: AgentScheduleExecution }
```

### Scheduled Tasks (Cross-Agent)

#### List Pending Approvals
```
GET /api/admin/scheduled-tasks
Query: ?status=pending_approval&agent_id=uuid&limit=50
Response: { executions: AgentScheduleExecution[] }
```

#### Approve Execution
```
POST /api/admin/scheduled-tasks/[executionId]/approve
Response: { execution: AgentScheduleExecution, message: string }
```

#### Reject Execution
```
POST /api/admin/scheduled-tasks/[executionId]/reject
Body: { reason?: string }
Response: { execution: AgentScheduleExecution, message: string }
```

### Cron Endpoint

#### Check Due Schedules
```
GET /api/cron/check-schedules
Header: Authorization: Bearer {CRON_SECRET}
Response: { message, checked_at, count, results: [{ schedule_id, status, execution_id?, error? }] }
```

### Export & Templates

#### Export Agent Config
```
GET /api/admin/agents/[id]/export
Response: AgentSDKConfig (JSON)
```

#### List Prompt Templates
```
GET /api/admin/agents/prompt-templates
Response: { templates: AgentPromptTemplate[] }
```

---

## UI Components

### Agents List Page

**Path**: `/admin/agents`
**File**: `src/app/admin/agents/page.tsx`

Features:
- Table with columns: Name, Department, Model, Version, Status, Enabled, Actions
- Stats cards: Total Agents, Active, Department Heads, Published
- Create Agent dialog with name, description, model, initial system prompt
- Toggle enable/disable agents
- Navigate to Agent Builder via "Configure" button

### Agent Builder Page

**Path**: `/admin/agents/[id]`
**File**: `src/app/admin/agents/[id]/page.tsx`

8-tab interface:

1. **Identity Tab**: Core agent config (name, slug, description, model, permission_mode, max_turns, department_head flag)

2. **Tools Tab**: Search/filter 291 tools by category, select/deselect tools, save assignments

3. **Skills Tab**: Select from available skills, save skill assignments

4. **Prompt Tab**: Edit system prompt with character count and token estimation

5. **Team Tab**: Define agent delegations with conditions and context templates

6. **Rules Tab**: Create behavioral rules (always/never/when/respond_with) with conditions

7. **Schedules Tab**: Create/manage recurring tasks with cron presets, enable/disable, run now

8. **Test Tab**: Sandbox testing with mock tool mode, conversation history, end session

**Sidebar**: Version history showing version tree with publish capability, config preview and export

### Scheduled Tasks Page

**Path**: `/admin/scheduled-tasks`
**File**: `src/app/admin/scheduled-tasks/page.tsx`

Features:
- List all pending approval executions across agents
- Filter by status (pending, approved, rejected, completed, failed)
- Approve/reject actions with confirmation dialogs
- View execution details (task prompt, result, error, metrics)

---

## Utility Libraries

### Agent SDK Configuration

**File**: `src/lib/agent-sdk.ts`

#### generateAgentSDKConfig(agent: AgentWithRelations): AgentSDKConfig

Generates Anthropic SDK-compatible config from agent with relations.

```typescript
import { generateAgentSDKConfig } from '@/lib/agent-sdk'

const config = generateAgentSDKConfig(agentWithRelations)
// Returns full SDK config with compiled prompt, tools, rules, etc.
```

#### compileSystemPrompt(basePrompt, sections, skills, rules): string

Combines all prompt components into a single system prompt.

```typescript
// Internal function - called by generateAgentSDKConfig
// Combines:
// - Base prompt or prompt sections
// - Skills as "## Available Skills"
// - Rules as "## Always", "## Never", "## Conditional Behaviors"
```

#### generateAgentCodeSnippet(config: AgentSDKConfig): string

Creates TypeScript code snippet for SDK usage.

```typescript
const snippet = generateAgentCodeSnippet(config)
// Returns:
// import Agent from "@anthropic-ai/claude-agent-sdk";
// const agent = new Agent({ ... });
// const result = await agent.run({ content: "Your prompt here" });
```

#### validateAgentConfig(config): { valid: boolean, errors: string[] }

Validates config against SDK requirements.

```typescript
const { valid, errors } = validateAgentConfig(config)
if (!valid) console.log(errors) // ['Agent name is required', ...]
```

#### estimatePromptTokens(config: AgentSDKConfig): number

Rough token estimation (~4 chars per token).

```typescript
const tokens = estimatePromptTokens(config)
// Returns approximate token count for system prompt
```

### Cron Utilities

**File**: `src/lib/cron-utils.ts`

#### getNextRunTime(cronExpression, timezone?, after?): Date

Calculate next execution time from cron expression.

```typescript
import { getNextRunTime } from '@/lib/cron-utils'

const next = getNextRunTime('0 9 * * *', 'UTC', new Date())
// Returns next occurrence of daily 9:00 AM
```

**Cron format**: `minute hour day-of-month month day-of-week`

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Daily at 9:00 AM |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `0 9 1 * *` | 1st of each month at 9:00 AM |
| `0 9 1 1,4,7,10 *` | Quarterly (Jan, Apr, Jul, Oct 1st) at 9:00 AM |
| `*/15 * * * *` | Every 15 minutes |

#### describeCron(cronExpression): string

Human-readable description of cron expression.

```typescript
describeCron('0 9 * * *')      // "Daily at 9:00 AM"
describeCron('0 9 * * 1')      // "Every Monday at 9:00 AM"
describeCron('0 9 1 * *')      // "Monthly on day 1 at 9:00 AM"
describeCron('0 9 1 1,4,7,10 *') // "On Jan, Apr, Jul, Oct 1 at 9:00 AM"
```

#### isValidCron(cronExpression): boolean

Validate cron expression format.

```typescript
isValidCron('0 9 * * *')   // true
isValidCron('invalid')     // false
isValidCron('* * *')       // false (wrong number of parts)
```

---

## Built-in Tools Registry

291 pre-built tools across 8 categories:

| Category | Count | Examples |
|----------|-------|----------|
| Finance | 62 | account_list, transaction_create, budget_get_status, analytics_get_net_worth |
| CRM | 53 | contact_list, lead_create, deal_move_stage, activity_log_call |
| Team | 38 | channel_create, message_send, dm_create_conversation, workspace_member_invite |
| Projects | 40 | project_create, task_assign, milestone_get_progress, department_list |
| Knowledge | 36 | knowledge_page_create, knowledge_page_search, knowledge_whiteboard_create |
| Communications | 14 | sms_send, call_initiate, phone_number_provision |
| Goals & KPIs | 21 | goal_create, kpi_record, exit_plan_get_scenarios |
| Agents | 27 | agent_create, agent_conversation_send_message, workflow_execute |

Each tool has:
- Unique name
- Description
- Category
- Input schema (JSON Schema)
- is_builtin flag
- is_enabled flag

---

## Usage Examples

### Creating an Agent

```typescript
// 1. Create the agent
const response = await fetch('/api/admin/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'CFO Agent',
    model: 'sonnet',
    system_prompt: 'You are a Chief Financial Officer agent...',
    permission_mode: 'default',
    max_turns: 15
  })
})
const { agent } = await response.json()
```

### Assigning Tools

```typescript
// 2. Assign finance tools
await fetch(`/api/admin/agents/${agent.id}/tools`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool_ids: [
      'uuid-of-analytics_get_net_worth',
      'uuid-of-budget_list',
      'uuid-of-transaction_list'
    ]
  })
})
```

### Adding Rules

```typescript
// 3. Add behavioral rules
await fetch(`/api/admin/agents/${agent.id}/rules`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rule_type: 'never',
    rule_content: 'Never approve expenses over $10,000 without CFO review',
    priority: 10
  })
})
```

### Creating a Schedule

```typescript
// 4. Create quarterly budget review schedule
await fetch(`/api/admin/agents/${agent.id}/schedules`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Quarterly Budget Review',
    cron_expression: '0 9 1 1,4,7,10 *',
    timezone: 'America/New_York',
    task_prompt: 'Review the quarterly budget and flag any variances over 10%. Summarize key financial metrics.',
    requires_approval: true
  })
})
```

### Testing an Agent

```typescript
// 5. Start a test session
const { session } = await fetch(`/api/admin/agents/${agent.id}/test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tool_mode: 'mock' })
}).then(r => r.json())

// 6. Send a test message
const { assistantMessage } = await fetch(
  `/api/admin/agents/${agent.id}/test/${session.id}/message`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'What is our current cash position?' })
  }
).then(r => r.json())

// 7. End the session
await fetch(`/api/admin/agents/${agent.id}/test/${session.id}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes: 'Tested cash position query - working correctly' })
})
```

### Exporting SDK Config

```typescript
// Get the SDK-compatible configuration
const config = await fetch(`/api/admin/agents/${agent.id}/export`).then(r => r.json())

// Use with Anthropic SDK
import Agent from "@anthropic-ai/claude-agent-sdk";

const agent = new Agent({
  name: config.name,
  model: config.model,
  tools: config.tools,
  system: config.systemPrompt,
  maxTurns: config.maxTurns
});

const result = await agent.run({ content: "Review Q4 budget" });
```

---

## Vercel Cron Configuration

**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/check-schedules",
      "schedule": "* * * * *"
    }
  ]
}
```

Set `CRON_SECRET` environment variable for production security.

---

## Security

### Row Level Security

All tables have RLS enabled. Access is restricted to superadmins:

```sql
CREATE POLICY "Superadmins can manage [table]" ON [table] FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));
```

### API Authentication

All API routes use `requireSuperadmin()` from `@/lib/admin-auth`:

```typescript
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  // ... handle request

  await logAdminAction(user!.id, 'agent_created', 'ai_agent', agentId, details, request)
}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/060_agent_builder.sql` | Core agent tables |
| `supabase/migrations/062_agent_builder_extended.sql` | Versions, rules, testing |
| `supabase/migrations/063_agent_schedules.sql` | Scheduling tables |
| `src/types/agents.ts` | TypeScript type definitions |
| `src/lib/agent-sdk.ts` | SDK config generation |
| `src/lib/cron-utils.ts` | Cron expression utilities |
| `src/app/admin/agents/page.tsx` | Agents list page |
| `src/app/admin/agents/[id]/page.tsx` | Agent Builder UI |
| `src/app/admin/scheduled-tasks/page.tsx` | Scheduled tasks page |
| `src/app/api/admin/agents/route.ts` | Agent CRUD API |
| `src/app/api/admin/agents/[id]/route.ts` | Single agent API |
| `src/app/api/admin/agents/[id]/tools/route.ts` | Tools assignment API |
| `src/app/api/admin/agents/[id]/skills/route.ts` | Skills assignment API |
| `src/app/api/admin/agents/[id]/rules/route.ts` | Rules API |
| `src/app/api/admin/agents/[id]/schedules/route.ts` | Schedules API |
| `src/app/api/admin/scheduled-tasks/route.ts` | Cross-agent tasks API |
| `src/app/api/cron/check-schedules/route.ts` | Vercel cron endpoint |
| `vercel.json` | Cron configuration |
