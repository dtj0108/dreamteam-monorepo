# Agent Building Flow

Complete documentation of what happens when you build an agent - the full flow from UI to database.

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AGENT BUILDING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         ┌──────────────┐         ┌──────────────────────────┐
    │     USER     │         │      UI      │         │          API             │
    │              │         │              │         │                          │
    │ Opens Admin  │────────►│ /admin/agents│────────►│ GET /api/admin/agents    │
    │    Panel     │         │   (list)     │         │ Fetches all agents       │
    │              │         │              │         │                          │
    │ Clicks       │────────►│ Create Agent │────────►│ POST /api/admin/agents   │
    │ "Create"     │         │   Dialog     │         │ Creates + version 1      │
    │              │         │              │         │                          │
    │ Clicks       │────────►│ /admin/agents│────────►│ GET /api/admin/agents/id │
    │  Agent       │         │   /[id]      │         │ Full agent + relations   │
    │              │         │  (8 tabs)    │         │                          │
    │ Edits +      │────────►│ Save buttons │────────►│ PATCH/PUT endpoints      │
    │  Saves       │         │              │         │ Updates tables           │
    │              │         │              │         │                          │
    │ Publishes    │────────►│ Publish btn  │────────►│ POST .../publish         │
    │              │         │              │         │ Sets published_version   │
    │              │         │              │         │                          │
    │ Exports      │────────►│ Export btn   │────────►│ GET .../export           │
    │              │         │              │         │ Returns SDK config       │
    └──────────────┘         └──────────────┘         └──────────────────────────┘
                                                                   │
                                                                   ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                              DATABASE (Supabase)                             │
    │                                                                              │
    │  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────────────────┐  │
    │  │  ai_agents   │───│  ai_agent_tools  │───│      agent_tools (291)      │  │
    │  │  (core)      │   │  (assignments)   │   │      (tool registry)        │  │
    │  └──────────────┘   └──────────────────┘   └─────────────────────────────┘  │
    │         │                                                                    │
    │         ├───────────┬───────────────┬──────────────┬───────────────────┐    │
    │         ▼           ▼               ▼              ▼                   ▼    │
    │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
    │  │agent_rules │ │agent_      │ │agent_      │ │ai_agent_   │ │agent_      │ │
    │  │(guardrails)│ │delegations │ │versions    │ │skills      │ │schedules   │ │
    │  └────────────┘ │(team)      │ │(history)   │ │(assigned)  │ │(cron)      │ │
    │                 └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Flow

### Step 1: Create Agent

**Location:** `/admin/agents` (Create Agent dialog)

**What happens:**
1. User fills out form: name, description, model, system_prompt
2. Frontend calls `POST /api/admin/agents`
3. API validates inputs:
   - `name` required
   - `system_prompt` required
   - `model` must be `sonnet`, `opus`, or `haiku`
   - Auto-generates `slug` from name if not provided
4. API creates record in `ai_agents` table
5. API automatically creates version 1 snapshot via `create_agent_version()` DB function
6. User redirected to `/admin/agents/[id]` builder page

**Code path:**
```
UI: src/app/admin/agents/page.tsx → handleCreate()
API: src/app/api/admin/agents/route.ts → POST handler
DB:  ai_agents INSERT, agent_versions INSERT
```

---

### Step 2: Configure Agent (8-Tab Builder)

**Location:** `/admin/agents/[id]`

When user opens the builder, API returns full agent with all relations:

```typescript
// GET /api/admin/agents/[id] returns:
{
  agent: AgentWithRelations,  // Agent + tools, skills, delegations, rules, prompt_sections
  versions: AgentVersion[],    // Version history
  sdkConfig: AgentSDKConfig    // Pre-compiled SDK config
}
```

#### Tab 1: Identity
**Fields:** name, slug, description, model, permission_mode, max_turns, is_head

**Save flow:**
```
UI: saveIdentity() → PATCH /api/admin/agents/[id]
API: Updates ai_agents record
DB:  ai_agents UPDATE
```

#### Tab 2: Tools
**Purpose:** Select from 291 available tools across 8 categories

**Categories:**
- `finance` (62 tools): accounts, transactions, budgets, subscriptions, analytics
- `crm` (53 tools): contacts, deals, activities, pipelines
- `team` (38 tools): users, messages, availability
- `projects` (40 tools): projects, tasks, milestones
- `knowledge` (36 tools): search, documents, RAG
- `communications` (14 tools): email, notifications
- `goals` (21 tools): OKRs, metrics
- `agents` (27 tools): delegation, agent management

**Save flow:**
```
UI: saveTools() → PUT /api/admin/agents/[id]/tools
API: DELETE all ai_agent_tools for agent
     INSERT new ai_agent_tools for each selected tool_id
DB:  ai_agent_tools DELETE + INSERT
```

#### Tab 3: Skills
**Purpose:** Assign skills from the skills library

**Save flow:**
```
UI: saveSkills() → PUT /api/admin/agents/[id]/skills
API: Replace ai_agent_skills assignments
DB:  ai_agent_skills DELETE + INSERT
```

#### Tab 4: Prompt
**Purpose:** Edit the agent's system prompt

**Save flow:** Same as Identity tab (system_prompt is part of ai_agents)

#### Tab 5: Team
**Purpose:** Configure task delegation to other agents

**Data structure:**
```typescript
{
  to_agent_id: string,      // Target agent
  condition?: string,       // When to delegate (e.g., "billing questions")
  context_template?: string // What context to pass
}
```

**Save flow:**
```
UI: saveDelegations() → PUT /api/admin/agents/[id]/team
API: Replace agent_delegations records
DB:  agent_delegations DELETE + INSERT
```

#### Tab 6: Rules
**Purpose:** Add behavioral guardrails

**Rule types:**
- `always` - Agent must always do this
- `never` - Agent must never do this
- `when` - Conditional behavior (requires condition field)
- `respond_with` - Standard responses for specific situations

**Operations:**
```
Add:    POST /api/admin/agents/[id]/rules → agent_rules INSERT
Toggle: PATCH /api/admin/agents/[id]/rules/[ruleId] → agent_rules UPDATE
Delete: DELETE /api/admin/agents/[id]/rules/[ruleId] → agent_rules DELETE
```

#### Tab 7: Schedules
**Purpose:** Configure recurring/scheduled tasks

**Data structure:**
```typescript
{
  name: string,
  description?: string,
  cron_expression: string,  // e.g., "0 9 * * 1" (9 AM Monday)
  task_prompt: string,      // What agent should do
  requires_approval: boolean,
  timezone?: string
}
```

**Presets:**
- Daily: `0 9 * * *` (9 AM every day)
- Weekly: `0 9 * * 1` (9 AM Monday)
- Monthly: `0 9 1 * *` (1st of month)
- Quarterly: `0 9 1 1,4,7,10 *` (Q1/Q2/Q3/Q4)

**Operations:**
```
Create:  POST /api/admin/agents/[id]/schedules → agent_schedules INSERT
Toggle:  PATCH /api/admin/agents/[id]/schedules/[scheduleId] → UPDATE
Delete:  DELETE /api/admin/agents/[id]/schedules/[scheduleId] → DELETE
Run Now: POST /api/admin/agents/[id]/schedules/[scheduleId]/run
```

#### Tab 8: Test
**Purpose:** Sandbox environment to test agent behavior

**Flow:**
```
1. Start Session: POST /api/admin/agents/[id]/test
   → Creates agent_test_sessions record
   → Returns session ID

2. Send Messages: POST /api/admin/agents/[id]/test/[sessionId]/message
   → Executes in mock tool mode (tools don't actually run)
   → Saves to agent_test_messages
   → Returns user message, assistant response, tool calls

3. End Session: DELETE /api/admin/agents/[id]/test/[sessionId]
   → Marks session ended
```

---

### Step 3: API Processing

All API routes are in `src/app/api/admin/agents/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/agents` | GET | List all agents |
| `/api/admin/agents` | POST | Create new agent |
| `/api/admin/agents/[id]` | GET | Get agent with all relations |
| `/api/admin/agents/[id]` | PATCH | Update agent properties |
| `/api/admin/agents/[id]` | DELETE | Delete agent |
| `/api/admin/agents/[id]/tools` | PUT | Replace tool assignments |
| `/api/admin/agents/[id]/skills` | PUT | Replace skill assignments |
| `/api/admin/agents/[id]/team` | PUT | Replace delegations |
| `/api/admin/agents/[id]/rules` | POST | Add rule |
| `/api/admin/agents/[id]/rules/[ruleId]` | PATCH | Update rule |
| `/api/admin/agents/[id]/rules/[ruleId]` | DELETE | Delete rule |
| `/api/admin/agents/[id]/versions` | POST | Create version snapshot |
| `/api/admin/agents/[id]/publish` | POST | Publish specific version |
| `/api/admin/agents/[id]/test` | POST | Start test session |
| `/api/admin/agents/[id]/test/[sessionId]/message` | POST | Send test message |
| `/api/admin/agents/[id]/test/[sessionId]` | DELETE | End test session |
| `/api/admin/agents/[id]/schedules` | POST | Create schedule |
| `/api/admin/agents/[id]/schedules/[scheduleId]` | PATCH | Update schedule |
| `/api/admin/agents/[id]/schedules/[scheduleId]` | DELETE | Delete schedule |
| `/api/admin/agents/[id]/schedules/[scheduleId]/run` | POST | Trigger schedule manually |
| `/api/admin/agents/[id]/export` | GET | Export SDK config as JSON |

**Security:** All routes call `requireSuperadmin()` and log actions via `logAdminAction()`.

---

### Step 4: Database Storage

#### Core Tables

**`ai_agents`** - Main agent record
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
slug            TEXT UNIQUE
description     TEXT
department_id   UUID REFERENCES agent_departments
avatar_url      TEXT
model           TEXT NOT NULL  -- 'sonnet' | 'opus' | 'haiku'
system_prompt   TEXT NOT NULL
permission_mode TEXT DEFAULT 'default'
max_turns       INTEGER DEFAULT 25
is_enabled      BOOLEAN DEFAULT true
is_head         BOOLEAN DEFAULT false
config          JSONB
current_version INTEGER DEFAULT 0
published_version INTEGER
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**`ai_agent_tools`** - Tool assignments (junction table)
```sql
agent_id  UUID REFERENCES ai_agents ON DELETE CASCADE
tool_id   UUID REFERENCES agent_tools ON DELETE CASCADE
config    JSONB  -- Optional per-agent tool config
PRIMARY KEY (agent_id, tool_id)
```

**`ai_agent_skills`** - Skill assignments (junction table)
```sql
agent_id  UUID REFERENCES ai_agents ON DELETE CASCADE
skill_id  UUID REFERENCES agent_skills ON DELETE CASCADE
PRIMARY KEY (agent_id, skill_id)
```

**`agent_delegations`** - Inter-agent handoffs
```sql
id               UUID PRIMARY KEY
from_agent_id    UUID REFERENCES ai_agents ON DELETE CASCADE
to_agent_id      UUID REFERENCES ai_agents ON DELETE CASCADE
condition        TEXT      -- When to delegate
context_template TEXT      -- Context to pass
created_at       TIMESTAMPTZ
```

**`agent_rules`** - Behavioral guardrails
```sql
id           UUID PRIMARY KEY
agent_id     UUID REFERENCES ai_agents ON DELETE CASCADE
rule_type    TEXT NOT NULL  -- 'always' | 'never' | 'when' | 'respond_with'
rule_content TEXT NOT NULL  -- The actual rule
condition    TEXT           -- For 'when' rules
priority     INTEGER DEFAULT 0
is_enabled   BOOLEAN DEFAULT true
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

**`agent_versions`** - Version history
```sql
id               UUID PRIMARY KEY
agent_id         UUID REFERENCES ai_agents ON DELETE CASCADE
version          INTEGER NOT NULL
config_snapshot  JSONB NOT NULL     -- Full agent config at this point
change_type      TEXT NOT NULL      -- 'created' | 'identity' | 'tools' | etc.
change_description TEXT
change_details   JSONB
is_published     BOOLEAN DEFAULT false
published_at     TIMESTAMPTZ
published_by     UUID
created_by       UUID
created_at       TIMESTAMPTZ
UNIQUE (agent_id, version)
```

**`agent_schedules`** - Scheduled tasks
```sql
id               UUID PRIMARY KEY
agent_id         UUID REFERENCES ai_agents ON DELETE CASCADE
name             TEXT NOT NULL
description      TEXT
cron_expression  TEXT NOT NULL
timezone         TEXT DEFAULT 'UTC'
task_prompt      TEXT NOT NULL
requires_approval BOOLEAN DEFAULT false
output_config    JSONB
is_enabled       BOOLEAN DEFAULT true
last_run_at      TIMESTAMPTZ
next_run_at      TIMESTAMPTZ
created_by       UUID
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

**`agent_test_sessions`** - Test sandbox sessions
```sql
id           UUID PRIMARY KEY
agent_id     UUID REFERENCES ai_agents ON DELETE CASCADE
version      INTEGER
started_by   UUID
started_at   TIMESTAMPTZ
ended_at     TIMESTAMPTZ
test_config  JSONB        -- { tool_mode: 'mock' | 'simulate' | 'live' }
total_turns  INTEGER DEFAULT 0
total_tokens INTEGER DEFAULT 0
total_cost_usd NUMERIC(10,6)
status       TEXT DEFAULT 'active'
error_message TEXT
notes        TEXT
```

**`agent_test_messages`** - Test conversation history
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES agent_test_sessions ON DELETE CASCADE
role            TEXT NOT NULL  -- 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result'
content         TEXT
tool_name       TEXT
tool_input      JSONB
tool_output     JSONB
tool_use_id     TEXT
latency_ms      INTEGER
tokens_input    INTEGER
tokens_output   INTEGER
sequence_number INTEGER
created_at      TIMESTAMPTZ
```

#### Shared Registry Tables

**`agent_tools`** - Tool registry (291 built-in tools)
```sql
id           UUID PRIMARY KEY
name         TEXT UNIQUE NOT NULL
description  TEXT
category     TEXT  -- 'finance' | 'crm' | 'team' | etc.
input_schema JSONB -- JSON Schema for tool parameters
is_builtin   BOOLEAN DEFAULT true
is_enabled   BOOLEAN DEFAULT true
created_at   TIMESTAMPTZ
```

**`agent_skills`** - Skill library
```sql
id              UUID PRIMARY KEY
name            TEXT UNIQUE NOT NULL
description     TEXT
department_id   UUID REFERENCES agent_departments
skill_content   TEXT NOT NULL
category        TEXT
version         INTEGER DEFAULT 1
triggers        JSONB    -- Keywords that activate skill
templates       JSONB    -- Response templates
edge_cases      JSONB    -- Special handling
is_enabled      BOOLEAN DEFAULT true
is_system       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

---

### Step 5: Version Control

**How versioning works:**

1. **Auto-increment:** Every significant change creates a new version
2. **Snapshot:** Each version stores complete `config_snapshot` (JSONB)
3. **Immutable:** Once created, version snapshots cannot be modified
4. **Current vs Published:**
   - `current_version` = latest development state
   - `published_version` = production-ready state

**Creating a version:**
```sql
-- Called by: POST /api/admin/agents/[id]/versions
-- Uses DB function:
SELECT * FROM create_agent_version(
  p_agent_id := 'uuid',
  p_change_type := 'tools',
  p_change_description := 'Added email tools',
  p_change_details := '{"added": ["email_send", "email_read"]}'::jsonb,
  p_created_by := 'user-uuid'
);
-- This function:
-- 1. Increments ai_agents.current_version
-- 2. Generates full config via generate_agent_sdk_config()
-- 3. Inserts new agent_versions record with snapshot
```

**Change types:**
- `created` - Initial creation
- `identity` - Name, model, permissions changed
- `tools` - Tool assignments changed
- `skills` - Skill assignments changed
- `prompt` - System prompt changed
- `team` - Delegations changed
- `rules` - Rules changed
- `rollback` - Restored from previous version
- `published` - Version was published

---

### Step 6: Publishing

**Flow:**
```
UI: Click "Publish" on specific version
    → POST /api/admin/agents/[id]/publish { version: 3 }

API: Calls DB function publish_agent_version()

DB Function:
1. Sets is_published=false on currently published version
2. Sets is_published=true, published_at, published_by on target version
3. Updates ai_agents.published_version
```

**Why publish?**
- Development can continue on `current_version`
- Production systems only use `published_version`
- Rollback = publish an older version

---

### Step 7: SDK Export

**Location:** `src/lib/agent-sdk.ts`

**Main function:** `generateAgentSDKConfig(agent: AgentWithRelations)`

**Process:**
```typescript
// 1. Filter and map enabled tools
const tools = agent.tools
  .filter(t => t.is_builtin !== false && t.is_enabled !== false)
  .map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

// 2. Filter and map enabled skills
const skills = agent.skills
  .filter(s => s.is_enabled !== false)
  .map(s => ({ name: s.name, description: s.description, content: s.skill_content }));

// 3. Filter and map enabled rules
const rules = agent.rules
  .filter(r => r.is_enabled)
  .map(r => ({ type: r.rule_type, content: r.rule_content, condition: r.condition }));

// 4. Compile system prompt (base + sections + skills + rules)
const systemPrompt = compileSystemPrompt(
  agent.system_prompt,
  agent.prompt_sections,
  skills,
  rules
);

// 5. Map delegations
const delegations = agent.delegations.map(d => ({
  targetAgent: d.to_agent_name,
  condition: d.condition,
  contextTemplate: d.context_template
}));

// 6. Return SDK config
return {
  name: agent.name,
  model: MODEL_SDK_NAMES[agent.model],  // Maps to official model IDs
  systemPrompt,
  tools,
  maxTurns: agent.max_turns,
  delegations
};
```

**Model name mapping:**
```typescript
const MODEL_SDK_NAMES = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514'
};
```

**Export formats:**
- `GET /api/admin/agents/[id]/export` - JSON download
- UI "Copy Config" button - Copies to clipboard
- UI "Preview" - Shows in modal

---

## Key Files Reference

### UI Components
| File | Purpose |
|------|---------|
| `src/app/admin/agents/page.tsx` | Agent listing, creation dialog |
| `src/app/admin/agents/[id]/page.tsx` | 8-tab builder (1637 lines) |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/admin/agents/route.ts` | List & create agents |
| `src/app/api/admin/agents/[id]/route.ts` | Get, update, delete agent |
| `src/app/api/admin/agents/[id]/tools/route.ts` | Tool assignment management |
| `src/app/api/admin/agents/[id]/skills/route.ts` | Skill assignment management |
| `src/app/api/admin/agents/[id]/team/route.ts` | Delegation management |
| `src/app/api/admin/agents/[id]/rules/route.ts` | Rule CRUD |
| `src/app/api/admin/agents/[id]/versions/route.ts` | Version creation |
| `src/app/api/admin/agents/[id]/publish/route.ts` | Version publishing |
| `src/app/api/admin/agents/[id]/test/route.ts` | Test session management |
| `src/app/api/admin/agents/[id]/schedules/route.ts` | Schedule CRUD |
| `src/app/api/admin/agents/[id]/export/route.ts` | Config export |

### Core Libraries
| File | Purpose |
|------|---------|
| `src/lib/agent-sdk.ts` | SDK config generation |
| `src/types/agents.ts` | All type definitions |

### Database Migrations
| File | Purpose |
|------|---------|
| `supabase/migrations/060_agent_builder.sql` | Core schema, 291 tools |
| `supabase/migrations/061_skills_teaching_system.sql` | Skills library, learning |
| `supabase/migrations/062_agent_builder_extended.sql` | Versions, rules, tests |
| `supabase/migrations/063_agent_schedules.sql` | Scheduled tasks |

---

## Summary

Building an agent follows this path:

1. **Create** → `ai_agents` record + initial version
2. **Configure** → Updates to junction tables (tools, skills) and related tables (rules, delegations, schedules)
3. **Version** → Snapshot saved to `agent_versions` with full config
4. **Publish** → Marks specific version as production-ready
5. **Export** → Compiles all data into Claude Agent SDK format
