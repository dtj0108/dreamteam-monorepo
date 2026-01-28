# MCP Server Test Fix Agent Swarm Plan

## Problem Analysis
The tests expect `error()` responses (with `isError: true`) for:
1. "not found" cases - when a resource doesn't exist
2. "no fields to update" cases - when update is called without any fields

But many implementations return `success()` with a message instead of proper errors.

## Key Functions
- `success(data)` - returns ToolResult without `isError`
- `error(message, category)` - returns ToolResult WITH `isError: true`
- Tests use `expectError(result, 'message')` which checks `result.isError === true`

## Failing Test Categories

### 1. CRM Tools (24 failures)
- **deals.test.ts**: 9 failures - deal_get, deal_create, deal_update, deal_delete, deal_move_stage, deal_mark_won, deal_mark_lost, deal_get_activities
- **activities.test.ts**: 6 failures - activity_get, activity_create, activity_update, activity_delete, activity_mark_complete
- **pipelines.test.ts**: 1 failure - pipeline_get
- **leads.test.ts**: 8 failures - lead_get, lead_update, lead_delete, lead_change_status, lead_add_task, lead_get_tasks, lead_get_opportunities, lead_get_contacts

### 2. Team Tools (17 failures)
- **messages.test.ts**: 7 failures - message_list, message_get, message_update, message_delete, message_add_reaction, message_get_thread, message_pin
- **channels.test.ts**: 10 failures - channel_get, channel_update (no fields), channel_update (not found), channel_delete, channel_join, channel_leave (2 tests), channel_add_member, channel_remove_member, channel_get_members

### 3. Finance Tools (5 failures)
- **transactions.test.ts**: 5 failures - transaction_get, transaction_create, transaction_update (no fields), transaction_update (not found), transaction_create_transfer

### 4. Projects Tools (estimated ~12 failures based on patterns)
- Similar "not found" patterns

## Fix Pattern

### Before (failing):
```typescript
if (!data || data.length === 0) {
  return success({ message: 'Deal not found' })  // ❌ Wrong
}
```

### After (fixed):
```typescript
if (!data || data.length === 0) {
  return error('Deal not found', 'not_found')  // ✅ Correct
}
```

### For "no fields to update":
```typescript
if (Object.keys(updateData).length === 0) {
  return error('No fields provided to update', 'validation')  // ✅ Correct
}
```

## Agent Task Assignments

### Agent 1: CRM Deals Fix
**Files**: `src/tools/crm/deals.ts`
**Tests**: `src/__tests__/tools/crm/deals.test.ts`
**Failures**: 9
**Fixes needed**:
- deal_get: return error when not found
- deal_create: return error when lead/contact not found
- deal_update: return error when not found + when no fields
- deal_delete: return error when not found
- deal_move_stage: return error when not found
- deal_mark_won: return error when not found
- deal_mark_lost: return error when not found
- deal_get_activities: return error when deal not found

### Agent 2: CRM Activities Fix
**Files**: `src/tools/crm/activities.ts`
**Tests**: `src/__tests__/tools/crm/activities.test.ts`
**Failures**: 6
**Fixes needed**:
- activity_get: return error when not found
- activity_create: return error when contact/deal not found
- activity_update: return error when not found
- activity_delete: return error when not found
- activity_mark_complete: return error when not found

### Agent 3: CRM Pipelines & Leads Fix
**Files**: `src/tools/crm/pipelines.ts`, `src/tools/crm/leads.ts`
**Tests**: `src/__tests__/tools/crm/pipelines.test.ts`, `src/__tests__/tools/crm/leads.test.ts`
**Failures**: 1 + 8 = 9
**Fixes needed**:
- pipeline_get: return error when not found
- lead_get: return error when not found
- lead_update: return error when not found
- lead_delete: return error when not found
- lead_change_status: return error when not found
- lead_add_task: return error when lead not found
- lead_get_tasks: return error when lead not found
- lead_get_opportunities: return error when lead not found
- lead_get_contacts: return error when lead not found

### Agent 4: Team Messages Fix
**Files**: `src/tools/team/messages.ts`
**Tests**: `src/__tests__/tools/team/messages.test.ts`
**Failures**: 7
**Fixes needed**:
- message_list: return error when channel not found
- message_get: return error when not found
- message_update: return error when not found
- message_delete: return error when not found
- message_add_reaction: return error when message not found
- message_get_thread: return error when parent not found
- message_pin: return error when not found

### Agent 5: Team Channels Fix
**Files**: `src/tools/team/channels.ts`
**Tests**: `src/__tests__/tools/team/channels.test.ts`
**Failures**: 10
**Fixes needed**:
- channel_get: return error when not found
- channel_update: return error when no fields to update
- channel_update: return error when not found
- channel_delete: return error when not found
- channel_join: return error when channel not found
- channel_leave: return error when channel not found
- channel_leave: return error when creator tries to leave
- channel_add_member: return error when channel not found
- channel_remove_member: return error when channel not found
- channel_get_members: return error when channel not found

### Agent 6: Finance Transactions Fix
**Files**: `src/tools/finance/transactions.ts`
**Tests**: `src/__tests__/tools/finance/transactions.test.ts`
**Failures**: 5
**Fixes needed**:
- transaction_get: return error when not found
- transaction_create: return error when account not found
- transaction_update: return error when no fields to update
- transaction_update: return error when transaction not found
- transaction_create_transfer: return error when accounts not found

### Agent 7: Projects Fix
**Files**: `src/tools/projects/projects.ts`, `src/tools/projects/tasks.ts`, etc.
**Tests**: `src/__tests__/tools/projects/*.test.ts`
**Failures**: ~12 (estimated)
**Fixes needed**:
- Similar patterns for "not found" and "no fields" cases

## Verification Steps
1. Run tests for each fixed file: `npm test -- src/__tests__/tools/<category>/<file>.test.ts`
2. Ensure all tests in that file pass
3. Check for TypeScript errors: `npx tsc --noEmit`
4. Run full test suite at the end

## Success Criteria
- All 137 previously failing tests now pass
- No new test failures introduced
- TypeScript compilation succeeds
- No changes to test files (only implementation fixes)
