# Comprehensive Application Audit Report

**Generated:** 2026-02-05
**Scope:** `apps/user-web/src/` — API routes, lib files, components

---

## Executive Summary

| Domain | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Workspace Isolation | 8 | 7 | 3 | 2 | 20 |
| Billing Integration | 2 | 1 | 1 | 2 | 6 |
| Type Safety | 5 | 12 | 7 | 5 | 29 |
| Error Handling | 1 | 3 | 14 | 19 | 37 |
| **Totals** | **16** | **23** | **25** | **28** | **92** |

---

## Critical Issues — Fix Immediately

### 1. Workflow SMS bypasses billing entirely
- **Domain:** Billing
- **File:** `src/lib/workflow-executor.ts:340`
- **Impact:** Users can send unlimited free SMS through workflow automations
- **Description:** The `send_sms` action calls `sendSMS()` directly from twilio.ts, bypassing `sendSMSWithCredits()`. No credit check, no deduction.
- **Fix:** Replace `sendSMS()` with `sendSMSWithCredits()` and pass `workspaceId` through workflow context.

### 2. Scheduled SMS bypasses billing entirely
- **Domain:** Billing
- **File:** `src/lib/scheduled-sms-processor.ts:65`
- **Impact:** Scheduled SMS messages consume no credits
- **Description:** The scheduled SMS processor calls `sendSMS()` directly, same bypass as workflows.
- **Fix:** Replace with `sendSMSWithCredits()` and resolve `workspaceId` from the scheduled record.

### 3. Stripe exported as `null as unknown as Stripe`
- **Domain:** Type Safety
- **File:** `src/lib/stripe.ts:25`
- **Impact:** Runtime crash when any Stripe method is called without the env var set
- **Description:** Dangerous double-cast exports `null` disguised as a `Stripe` instance. Callers have no way to know it's null.
- **Fix:** Export as `Stripe | null` and require callers to handle the null case, or throw at import time.

### 4. Unvalidated type assertions in Twilio webhooks
- **Domain:** Type Safety
- **Files:** `src/app/api/twilio/voice/route.ts:34`, `src/app/api/twilio/sms/route.ts:99`
- **Impact:** Authorization bypass if Supabase join shape changes
- **Description:** `(contact.leads as unknown as { user_id: string }).user_id` assumes structure without validation.
- **Fix:** Use type guards or validate shape before casting.

### 5. Authorization bypass via `as any` cast
- **Domain:** Type Safety
- **File:** `src/app/api/contacts/[id]/route.ts:67`
- **Impact:** Authorization check could silently fail
- **Description:** `(contact.lead as any)?.user_id` bypasses type checking in authorization code.
- **Fix:** Define proper types for nested relations.

### 6. Communications query leaks across workspaces
- **Domain:** Workspace Isolation
- **File:** `src/app/api/communications/route.ts:41`
- **Impact:** Users in multiple workspaces see all communications across workspaces
- **Description:** Query filters by `user_id` only, no `workspace_id` filter.
- **Fix:** Add `.eq('workspace_id', workspaceId)` after calling `getCurrentWorkspaceId()`.

### 7. Phone numbers accessible across workspaces (call route)
- **Domain:** Workspace Isolation
- **File:** `src/app/api/communications/call/route.ts:50`
- **Impact:** User can use phone numbers from other workspaces to make calls
- **Description:** `twilio_numbers` query filters by `user_id` but not `workspace_id`.
- **Fix:** Add `.eq('workspace_id', workspaceId)` to the query.

### 8. Phone numbers accessible across workspaces (SMS route)
- **Domain:** Workspace Isolation
- **File:** `src/app/api/communications/sms/route.ts:50`
- **Impact:** Same as above but for SMS sending
- **Fix:** Add `.eq('workspace_id', workspaceId)` to the query.

### 9. Phone numbers accessible across workspaces (Make.com route)
- **Domain:** Workspace Isolation
- **File:** `src/app/api/make/sms/route.ts:52`
- **Impact:** API-key-based SMS can use numbers from wrong workspace
- **Fix:** Add `.eq('workspace_id', auth.workspaceId)` to the query.

### 10. Twilio status webhook lacks workspace scoping
- **Domain:** Workspace Isolation
- **File:** `src/app/api/twilio/status/route.ts:56`
- **Impact:** Webhook could update communication records across workspaces
- **Fix:** Add workspace validation before updating records.

### 11. Inbound SMS matches threads across workspaces
- **Domain:** Workspace Isolation
- **File:** `src/app/api/twilio/sms/route.ts:40`
- **Impact:** Inbound SMS could be routed to wrong workspace's conversation thread
- **Description:** Queries `conversation_threads` by phone number only, no workspace filter.
- **Fix:** Add workspace context when looking up threads.

### 12. Inbound call matches contacts across workspaces
- **Domain:** Workspace Isolation
- **File:** `src/app/api/twilio/voice/route.ts:27`
- **Impact:** Inbound call could match a contact from another workspace
- **Fix:** Add `workspace_id` filter to contact query.

### 13. Conversations query leaks across workspaces
- **Domain:** Workspace Isolation
- **File:** `src/app/api/conversations/route.ts:87`
- **Impact:** User sees conversation history from all workspaces
- **Fix:** Add `.eq('workspace_id', workspaceId)` to communications query.

### 14. Fire-and-forget workflow execution can silently drop
- **Domain:** Error Handling
- **File:** `src/lib/workflow-trigger-service.ts:222`
- **Impact:** Workflows could be silently dropped if the promise chain fails to start
- **Fix:** Wrap `executeWorkflow` call in try/catch before the promise chain.

---

## High Severity Issues

### Workspace Isolation

| # | File | Line | Issue | Fix |
|---|---|---|---|---|
| 15 | `src/app/api/communications/threads/route.ts` | 26 | Threads query missing `workspace_id` | Add workspace filter |
| 16 | `src/app/api/deals/route.ts` | 23 | Deals query filters by `profile_id` only | Add `workspace_id` filter |
| 17 | `src/app/api/activities/route.ts` | 34 | Activities query missing `workspace_id` | Add workspace filter |
| 18 | `src/app/api/workflows/route.ts` | 16 | Workflows query missing `workspace_id` | Add workspace filter |
| 19 | `src/app/api/pipelines/route.ts` | 19 | Pipelines query missing `workspace_id` | Add workspace filter |
| 20 | `src/app/api/lead-pipelines/route.ts` | 21 | Lead pipelines missing `workspace_id` | Add workspace filter |
| 21 | `src/app/api/custom-fields/route.ts` | 20 | Custom fields missing `workspace_id` | Add workspace filter |

### Billing Integration

| # | File | Line | Issue | Fix |
|---|---|---|---|---|
| 22 | `src/app/api/twilio/voice/route.ts` | 1 | Inbound calls don't reserve minutes or track usage | Add `reserveCallMinutes()` for inbound calls |

### Type Safety

| # | File | Line | Issue | Fix |
|---|---|---|---|---|
| 23 | `src/app/api/sales/reports/custom/route.ts` | 49 | `supabase: any` — entire client untyped | Use `SupabaseClient` type |
| 24 | `src/lib/agent/tools/transactions.ts` | 23 | Return type includes `any` | Define `Transaction` type |
| 25 | `src/lib/agent/tools/transactions.ts` | 55 | Double-cast on category shape | Use type guard |
| 26 | `src/lib/agent/tools/budgets.ts` | 21 | Return type includes `budget?: any` | Define `Budget` type |
| 27 | `src/lib/agent/tools/budgets.ts` | 58 | Double-cast on category shape | Standardize query response |
| 28 | `src/lib/mcp-servers/business-tools.ts` | 96 | `(lead: any)` in map callbacks | Define `Lead` interface |
| 29 | `src/lib/mcp-servers/business-tools.ts` | 179 | `(opp: any)` in map callbacks | Define `Opportunity` interface |
| 30 | `src/lib/mcp-servers/business-tools.ts` | 265 | `(t: any)` in filter callbacks | Define `Task` interface |
| 31 | `src/lib/mcp-servers/finance-tools.ts` | 114 | `(tx: any)` in map callbacks | Define `Transaction` interface |
| 32 | `src/lib/mcp-servers/tools/analytics.ts` | 134 | `tx.categories as any` in reduce | Define category join type |
| 33 | `src/app/api/chat/route.ts` | 71 | `(s: any)` in skills loading | Define `AgentSkillAssignment` type |
| 34 | `src/app/api/agent-chat/route.ts` | 146 | `(chunk as any).text` in stream | Define stream chunk types |

### Error Handling

| # | File | Line | Issue | Fix |
|---|---|---|---|---|
| 35 | `src/app/api/communications/call/route.ts` | 172 | Generic "Internal server error" without trace ID | Add request/error IDs |
| 36 | `src/app/api/communications/sms/route.ts` | 166 | Generic "Internal server error" without trace ID | Add request/error IDs |
| 37 | `src/app/api/leads/import/route.ts` | 355 | Generic import failure message | Include specific error details |

---

## Medium Severity Issues

### Workspace Isolation (3)

- `src/app/api/twilio/status/route.ts:70` — Uses `default_workspace_id` instead of record's actual workspace
- `src/app/api/twilio/sms/route.ts:73` — Same `default_workspace_id` issue
- `src/app/api/twilio/voice/route.ts:51` — Same `default_workspace_id` issue

### Billing Integration (1)

- `src/lib/workflow-executor.ts:660` — Workflow `send_email` action is unmetered (may be intentional)

### Type Safety (7)

- `src/lib/workflow-executor.ts:1526` — Double-cast `as unknown as ConditionActionConfig`
- `src/lib/billing-queries.ts:176` — Double-cast for Stripe subscription data
- `src/lib/workflow-condition-evaluator.ts:36` — Context cast to `Record<string, unknown>`
- `src/app/api/reports/generate/route.ts:141` — `tx.categories as any` in grouping
- `src/app/api/analytics/overview/route.ts:100` — `tx.categories as any` in reduce
- `src/lib/agent/tools/knowledge.ts:20` — Returns `any[]` for BlockNote content
- `src/lib/agent/tools/knowledge.ts:83` — Accepts `any[]` for BlockNote content

### Error Handling (14)

Unchecked database operations in billing-critical paths:
- `src/lib/call-with-minutes.ts` — 6 unchecked updates (lines 59, 81, 125, 144, 185, 202)
- `src/lib/sms-with-credits.ts:143` — Refund update unchecked
- `src/lib/addons-queries.ts:68` — Manual credit addition unchecked
- `src/lib/addons-queries.ts:315` — Call minutes addition unchecked
- `src/app/api/twilio/status/route.ts:56` — Status update unchecked
- `src/app/api/auth/login/route.ts:56` — 2FA status update unchecked
- `src/app/api/billing/webhook/route.ts:81` — Checkout completion unchecked
- `src/app/api/leads/import/route.ts:221` — Partial failures not clearly reported
- `src/app/api/agents/schedules/[id]/route.ts:294` — Message send failures not tracked

---

## Recommended Fix Priority

### Phase 1 — Revenue & Security (Critical)
1. Fix billing bypasses in workflow executor and scheduled SMS processor
2. Add `workspace_id` filtering to communications, twilio_numbers, conversations routes
3. Add workspace scoping to Twilio webhook handlers

### Phase 2 — Data Isolation (High)
4. Add `workspace_id` filtering to deals, activities, workflows, pipelines, custom-fields routes
5. Fix Stripe null export
6. Fix authorization-related type assertions

### Phase 3 — Reliability (Medium)
7. Add error checking to billing-critical database operations
8. Fix `default_workspace_id` usage in webhook handlers
9. Replace `any` types in MCP/agent tools with proper interfaces

### Phase 4 — Quality (Low)
10. Add error checking to remaining unchecked database operations
11. Add request IDs to generic error responses
12. Fix remaining `any` types in component props and chart data
