# Agent-Server Implementation Recap

> **Status: COMPLETED**
> All changes have been implemented and TypeScript compiles successfully.

---

## Overview

This document summarizes the agent-server changes for Phase 2 of the DreamTeam platform. The implementation enables:

1. **Direct agent routing** - Users can chat with specific agents (not just head agent)
2. **Channel-based delegation** - Inter-agent communication via Supabase channels
3. **Webhook-triggered specialist queries** - Supabase webhooks trigger specialist agents

**Repository:** `/Users/drewbaskin/financebro-1/apps/agent-server/`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Mobile App                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /agent-chat
                              │ { message, agentId?, workspaceId }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Server (Railway)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  agent-chat.ts                                            │   │
│  │  - Authenticates user                                     │   │
│  │  - Loads deployed team config                             │   │
│  │  - Routes to specific agent OR head agent                 │   │
│  │  - Runs Claude query with agent's config                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ (if delegation needed)            │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  delegation-handler.ts                                    │   │
│  │  - Option A: Inline delegation (runs specialist inline)   │   │
│  │  - Option B: Channel delegation (posts to agent channel)  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ (channel delegation)              │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase                                                 │   │
│  │  - messages table (agent channels)                        │   │
│  │  - Realtime subscription for response                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ Webhook trigger                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  agent-channel-handler.ts                                 │   │
│  │  - Receives webhook from Supabase                         │   │
│  │  - Runs specialist agent query                            │   │
│  │  - Posts response to channel                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Changed/Created

### Modified Files

| File | Changes |
|------|---------|
| `src/agent-chat.ts` | Fixed agent routing to respect `agentId` parameter |
| `src/lib/team-config.ts` | Added `getAgentById()` helper function |
| `src/lib/delegation-handler.ts` | Added `handleDelegationViaChannel()` function |
| `src/index.ts` | Added `/agent-channel-message` webhook route |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/agent-profile.ts` | Look up agent profile IDs |
| `src/lib/agent-channel.ts` | Agent channel operations (get, post, update) |
| `src/lib/channel-subscription.ts` | Realtime subscription for responses |
| `src/agent-channel-handler.ts` | Webhook endpoint handler |

---

## Detailed Changes

### 1. Agent Routing Fix (`src/agent-chat.ts`)

**Problem:** Always used head agent, ignored `agentId` parameter.

**Solution:** Now checks if `agentId` is provided and finds that agent in deployed config:

```typescript
if (deployedConfig) {
  let targetAgent = null

  // If user specified agentId, use that agent
  if (agentId) {
    targetAgent = deployedConfig.agents.find(a => a.id === agentId && a.is_enabled)
  }

  // Fall back to head agent
  if (!targetAgent) {
    targetAgent = getHeadAgent(deployedConfig)
  }

  // Use targetAgent's config (prompt, model, tools, etc.)
}
```

### 2. Helper Function (`src/lib/team-config.ts`)

Added `getAgentById()` alongside existing `getAgentBySlug()`:

```typescript
export function getAgentById(
  config: DeployedTeamConfig,
  agentId: string
): DeployedAgent | null {
  return config.agents.find(a => a.id === agentId && a.is_enabled) || null
}
```

### 3. Agent Profile Lookup (`src/lib/agent-profile.ts`)

```typescript
export async function getAgentProfile(
  workspaceId: string,
  agentSlug: string
): Promise<string | null>
```

Looks up agent profiles by `agent_workspace_id` and `agent_slug`.

### 4. Agent Channel Operations (`src/lib/agent-channel.ts`)

Three functions:

- `getAgentChannel(workspaceId, agentSlug)` - Find agent's channel
- `postToAgentChannel(channelId, profileId, content, requestId?)` - Post message
- `updateMessageStatus(requestId, status)` - Update delegation status

### 5. Realtime Subscription (`src/lib/channel-subscription.ts`)

```typescript
export async function waitForAgentResponse(
  channelId: string,
  requestId: string,
  timeoutMs: number = 60000
): Promise<{ content: string; status: string }>
```

Subscribes to channel and waits for response message with matching `requestId`.

### 6. Channel-Based Delegation (`src/lib/delegation-handler.ts`)

New function `handleDelegationViaChannel()`:

1. Gets specialist's channel
2. Gets head agent's profile ID
3. Posts delegation request to channel
4. Waits for response via realtime subscription
5. Falls back to inline delegation if no channel exists

### 7. Webhook Handler (`src/agent-channel-handler.ts`)

Handles `POST /agent-channel-message`:

1. Validates webhook payload (must be delegation request)
2. Looks up channel and linked agent
3. Loads deployed team config
4. Runs specialist agent query
5. Posts response to channel

### 8. Route Registration (`src/index.ts`)

```typescript
import { agentChannelMessageHandler } from './agent-channel-handler.js'

app.post('/agent-channel-message', agentChannelMessageHandler)
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/agent-chat` | POST | Main chat endpoint |
| `/agent-channel-message` | POST | Supabase webhook for delegation |

---

## Database Requirements

These columns must exist (from migration `078_agent_channels.sql`):

**channels table:**
- `is_agent_channel` (boolean)
- `linked_agent_id` (uuid)

**messages table:**
- `is_agent_request` (boolean)
- `agent_request_id` (uuid)
- `agent_response_status` (text: pending/completed/timeout/error)

**profiles table:**
- `is_agent` (boolean)
- `agent_workspace_id` (uuid)
- `agent_slug` (text)

---

## Supabase Webhook Setup

To enable channel-based delegation, configure a webhook:

1. Go to Supabase Dashboard → Database → Webhooks
2. Create new webhook:
   - **Table:** messages
   - **Events:** INSERT
   - **URL:** `https://your-railway-url.railway.app/agent-channel-message`
   - **Filter:** `is_agent_request = true`

---

## Testing

### Test 1: Direct Agent Routing

```bash
curl -X POST https://your-server/agent-chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the tax implications?",
    "agentId": "specific-agent-uuid",
    "workspaceId": "workspace-uuid"
  }'
```

**Expected:** Response comes from the specified agent, not head agent.

### Test 2: Channel Delegation

1. Deploy a team with Research + Tax agents
2. Send a message to head agent that triggers delegation
3. Check `#agent-research` channel for delegation request
4. Check channel for specialist response

### Test 3: Webhook

1. Manually insert a delegation request message
2. Verify webhook is triggered
3. Verify specialist response appears in channel

---

## Related Files (Admin Panel)

These were completed in Phase 1:

- `supabase/migrations/078_agent_channels.sql` - Database schema
- `src/types/teams.ts` - TypeScript types
- `src/lib/deployment.ts` - Deployment functions
- `RAILWAY_COMMUNICATION.md` - Architecture docs

---

## Next Steps

1. **Deploy to Railway** - Push changes and redeploy
2. **Configure Supabase webhook** - Point to Railway URL
3. **Test end-to-end** - Deploy a team and verify delegation flow
4. **Monitor logs** - Watch for delegation activity in Railway logs
