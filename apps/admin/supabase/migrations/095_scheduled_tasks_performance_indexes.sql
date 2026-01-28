-- 095_scheduled_tasks_performance_indexes.sql
-- Performance indexes for scheduled tasks system
-- Optimizes queries used by schedule processor and workflow processors

-- ============================================
-- AGENT SCHEDULES DUE INDEX
-- ============================================
-- Used by: schedule-processor.ts line 139-148
-- Optimizes finding enabled schedules that are due to run
-- Filters by is_enabled=true and orders by next_run_at
CREATE INDEX IF NOT EXISTS idx_agent_schedules_due 
ON agent_schedules(next_run_at, is_enabled) 
WHERE is_enabled = true;

-- ============================================
-- WORKFLOW SCHEDULED ACTIONS DUE INDEX
-- ============================================
-- Used by: scheduled-workflow-processor.ts line 40-46
-- Optimizes finding pending workflow actions that are scheduled
-- Filters by status='pending' and orders by scheduled_for
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_due 
ON workflow_scheduled_actions(scheduled_for, status) 
WHERE status = 'pending';

-- ============================================
-- APPROVED EXECUTIONS LOOKUP INDEX
-- ============================================
-- Used by: schedule-processor.ts line 243-252
-- Optimizes finding approved executions ready to run
-- Filters by status='approved' and orders by scheduled_for
CREATE INDEX IF NOT EXISTS idx_executions_approved_lookup 
ON agent_schedule_executions(status, scheduled_for) 
WHERE status = 'approved';

-- ============================================
-- AGENT LOOKUP INDEX (FOR N+1 FIX PREPARATION)
-- ============================================
-- Used for efficient agent lookups when resolving workspace context
-- Supports looking up active agents by ai_agent_id
CREATE INDEX IF NOT EXISTS idx_agents_ai_agent_lookup 
ON agents(ai_agent_id, is_active) 
WHERE is_active = true;

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- To rollback this migration, run:
--   DROP INDEX IF EXISTS idx_agent_schedules_due;
--   DROP INDEX IF EXISTS idx_workflow_scheduled_due;
--   DROP INDEX IF EXISTS idx_executions_approved_lookup;
--   DROP INDEX IF EXISTS idx_agents_ai_agent_lookup;
