# Agent Chat API Fix Required

## Problem Summary

The mobile app's text chat feature for agents is returning a **500 Internal Server Error** when users try to send messages.

---

## Root Cause (Confirmed via Debug Logs)

The `/api/agent-chat` endpoint on the backend is failing when creating a new conversation in the `agent_conversations` table.

### Error 1: Missing `created_by` Column
```
Failed to create conversation: Could not find the 'created_by' column of 'agent_conversations' in the schema cache
```

**Fix:** Add the `created_by` column to the `agent_conversations` table:

```sql
ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
```

### Error 2: NULL `user_id` Constraint Violation
```
Failed to create conversation: null value in column "user_id" of relation "agent_conversations" violates not-null constraint
```

**Fix:** The server code that creates conversations is not passing the authenticated user's ID. The backend needs to extract `user_id` from the session and include it in the INSERT.

---

## What the Mobile App Sends (Verified Working)

```json
{
  "message": "hello",
  "agentId": "4ef0b5e7-fdba-4d7d-9f73-d83b2af172b4",
  "workspaceId": "3559717e-5e99-4381-b9c3-7011333114da",
  "conversationId": null
}
```

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <valid_access_token>` ✅

The mobile app is sending all required data correctly. The issue is entirely server-side.

---

## Backend Changes Required

### 1. Database Migration

Run this SQL on the Supabase database:

```sql
-- Add created_by column if missing
ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Backfill existing rows
UPDATE agent_conversations 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_by 
ON agent_conversations(created_by);
```

### 2. Fix `/api/agent-chat` Endpoint

The endpoint that creates conversations needs to include `user_id` and `created_by` when inserting:

```typescript
// In the agent-chat API route handler:

// 1. Get the authenticated user from the session
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

// 2. When creating a new conversation, include user_id and created_by
const { data: conversation, error } = await supabase
  .from('agent_conversations')
  .insert({
    agent_id: agentId,
    workspace_id: workspaceId,
    user_id: user.id,        // ← REQUIRED - currently missing/null
    created_by: user.id,     // ← REQUIRED - column was missing
    title: null,
  })
  .select()
  .single();
```

---

## Expected `agent_conversations` Table Schema

```sql
CREATE TABLE agent_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id   UUID NOT NULL REFERENCES workspaces(id),
  user_id        UUID NOT NULL REFERENCES profiles(id),  -- Must not be NULL
  created_by     UUID REFERENCES profiles(id),           -- New column
  title          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## How to Verify the Fix

After applying the backend changes:

1. Send a test message to an agent from the mobile app
2. Check that no 500 error occurs
3. Verify the conversation is created in the database with correct `user_id` and `created_by` values

---

## Files to Check in Backend Repo

Look for the agent chat API route handler, likely at:
- `app/api/agent-chat/route.ts`
- `pages/api/agent-chat.ts`
- Or similar path

Search for where `agent_conversations` INSERT happens and ensure `user_id` is being passed.

---

---

## UPDATE: Root Cause Identified (January 18, 2026)

After adding more detailed instrumentation, the **actual root cause** has been identified.

### Error Message from Backend

The backend is returning a 200 OK with SSE content-type, but the actual response contains an error event:

```
event: error
data: {"type":"error","message":"Claude Code executable not found at /var/task/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.1.76_zod@4.2.1/node_modules/@anthropic-ai/claude-agent-sdk/cli.js. Is options.pathToClaudeCodeExecutable set?","recoverable":false}
```

### What This Means

The **Claude Agent SDK** is misconfigured on the Vercel deployment:

1. The SDK is looking for a CLI executable at a hardcoded path that doesn't exist in the Vercel serverless environment
2. The `pathToClaudeCodeExecutable` option is not set or is set incorrectly

### The Fix

In your backend code where you initialize the Claude Agent SDK, you need to configure the executable path correctly for Vercel:

```typescript
import { ClaudeAgent } from '@anthropic-ai/claude-agent-sdk';

// Option 1: Disable code execution entirely if not needed
const agent = new ClaudeAgent({
  // ... other options ...
  pathToClaudeCodeExecutable: null, // Disable if not using code execution
});

// Option 2: Set the correct path for Vercel
const agent = new ClaudeAgent({
  // ... other options ...
  pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_PATH, // Set via env var
});
```

### Vercel Configuration

If using Claude Code execution on Vercel, you may need to:

1. **Bundle the CLI** as part of your deployment
2. **Set the environment variable** `CLAUDE_CODE_PATH` to the correct path
3. **Or disable code execution** if not required for agent chat

### Why Mobile Shows "No response body"

The mobile app's React Native `fetch` implementation doesn't support `response.body.getReader()` for SSE streaming. The response body is accessible via `.text()` but not via streaming readers.

This is a secondary issue - the primary fix is the backend Claude SDK configuration.

---

## Summary of All Issues

| Issue | Status | Fix Location |
|-------|--------|--------------|
| Missing `created_by` column | ✅ Fixed | Database migration |
| NULL `user_id` constraint | ✅ Fixed | Backend code |
| Claude SDK path not found | ❌ **CURRENT** | Backend config |
| React Native SSE streaming | ⚠️ Workaround needed | Mobile client |

---

## Contact

Debug logs captured from mobile app on: January 18, 2026
Backend URL: `https://financebro-finance.vercel.app`

