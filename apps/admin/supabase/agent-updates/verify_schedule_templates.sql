-- ============================================
-- VERIFICATION QUERIES: Per-Workspace Schedule Isolation
-- Run these after applying migration 104_schedule_templates.sql
-- ============================================

-- ============================================
-- 1. CHECK TEMPLATE STATUS
-- ============================================
-- Count templates vs workspace instances
SELECT
  CASE WHEN is_template THEN 'Templates (global)' ELSE 'Workspace Instances' END AS schedule_type,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE is_enabled) AS enabled,
  COUNT(*) FILTER (WHERE workspace_id IS NOT NULL) AS has_workspace
FROM agent_schedules
GROUP BY is_template
ORDER BY is_template DESC;

-- ============================================
-- 2. LIST ALL TEMPLATES
-- ============================================
-- These are the "master" schedules that get cloned on hire
SELECT
  s.id,
  a.name AS agent_name,
  s.name AS schedule_name,
  s.cron_expression,
  s.timezone,
  s.is_enabled
FROM agent_schedules s
JOIN ai_agents a ON a.id = s.agent_id
WHERE s.is_template = true
ORDER BY a.name, s.name;

-- ============================================
-- 3. WORKSPACES WITH THEIR SCHEDULED TASKS
-- ============================================
-- Main query: shows each workspace and their active schedules
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  a.name AS agent_name,
  s.name AS schedule_name,
  s.cron_expression,
  s.timezone,
  s.is_enabled,
  s.next_run_at,
  s.last_run_at
FROM workspaces w
LEFT JOIN agent_schedules s ON s.workspace_id = w.id AND s.is_template = false
LEFT JOIN ai_agents a ON a.id = s.agent_id
ORDER BY w.name, a.name, s.name;

-- ============================================
-- 4. WORKSPACE SCHEDULE SUMMARY
-- ============================================
-- Count of schedules per workspace
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COUNT(s.id) AS total_schedules,
  COUNT(s.id) FILTER (WHERE s.is_enabled) AS enabled_schedules,
  COUNT(DISTINCT s.agent_id) AS agents_with_schedules,
  MIN(s.next_run_at) AS next_scheduled_run
FROM workspaces w
LEFT JOIN agent_schedules s ON s.workspace_id = w.id AND s.is_template = false
GROUP BY w.id, w.name
HAVING COUNT(s.id) > 0
ORDER BY total_schedules DESC;

-- ============================================
-- 5. UPCOMING SCHEDULED TASKS (Next 24 hours)
-- ============================================
-- What's about to run?
SELECT
  w.name AS workspace_name,
  a.name AS agent_name,
  s.name AS schedule_name,
  s.next_run_at,
  s.next_run_at - NOW() AS time_until_run,
  s.cron_expression,
  s.timezone
FROM agent_schedules s
JOIN workspaces w ON w.id = s.workspace_id
JOIN ai_agents a ON a.id = s.agent_id
WHERE s.is_template = false
  AND s.is_enabled = true
  AND s.workspace_id IS NOT NULL
  AND s.next_run_at IS NOT NULL
  AND s.next_run_at <= NOW() + INTERVAL '24 hours'
ORDER BY s.next_run_at ASC
LIMIT 50;

-- ============================================
-- 6. SCHEDULES DUE NOW (What cron will pick up)
-- ============================================
-- These are ready to execute
SELECT
  w.name AS workspace_name,
  a.name AS agent_name,
  s.name AS schedule_name,
  s.next_run_at,
  NOW() - s.next_run_at AS overdue_by
FROM agent_schedules s
JOIN workspaces w ON w.id = s.workspace_id
JOIN ai_agents a ON a.id = s.agent_id
WHERE s.is_template = false
  AND s.is_enabled = true
  AND s.workspace_id IS NOT NULL
  AND s.next_run_at <= NOW()
ORDER BY s.next_run_at ASC;

-- ============================================
-- 7. WORKSPACES MISSING SCHEDULES
-- ============================================
-- Hired agents that should have schedules but don't
-- (useful for debugging backfill issues)
SELECT
  w.name AS workspace_name,
  a.name AS agent_name,
  ag.hired_at,
  'Missing schedules' AS issue
FROM agents ag
JOIN workspaces w ON w.id = ag.workspace_id
JOIN ai_agents a ON a.id = ag.ai_agent_id
WHERE ag.is_active = true
  AND EXISTS (
    -- Agent has templates
    SELECT 1 FROM agent_schedules t
    WHERE t.agent_id = ag.ai_agent_id AND t.is_template = true
  )
  AND NOT EXISTS (
    -- But workspace doesn't have instances
    SELECT 1 FROM agent_schedules s
    WHERE s.agent_id = ag.ai_agent_id
      AND s.workspace_id = ag.workspace_id
      AND s.is_template = false
  )
ORDER BY w.name, a.name;

-- ============================================
-- 8. RECENT SCHEDULE EXECUTIONS BY WORKSPACE
-- ============================================
-- See what's been running
SELECT
  w.name AS workspace_name,
  a.name AS agent_name,
  s.name AS schedule_name,
  e.status,
  e.scheduled_for,
  e.started_at,
  e.completed_at,
  e.duration_ms,
  e.error_message
FROM agent_schedule_executions e
JOIN agent_schedules s ON s.id = e.schedule_id
JOIN workspaces w ON w.id = s.workspace_id
JOIN ai_agents a ON a.id = s.agent_id
WHERE s.is_template = false
ORDER BY e.created_at DESC
LIMIT 50;

-- ============================================
-- 9. EXECUTION STATS BY WORKSPACE (Last 7 days)
-- ============================================
SELECT
  w.name AS workspace_name,
  COUNT(*) AS total_executions,
  COUNT(*) FILTER (WHERE e.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE e.status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE e.status = 'running') AS running,
  AVG(e.duration_ms) FILTER (WHERE e.status = 'completed') AS avg_duration_ms,
  SUM(e.cost_usd) AS total_cost_usd
FROM agent_schedule_executions e
JOIN agent_schedules s ON s.id = e.schedule_id
JOIN workspaces w ON w.id = s.workspace_id
WHERE s.is_template = false
  AND e.created_at >= NOW() - INTERVAL '7 days'
GROUP BY w.id, w.name
ORDER BY total_executions DESC;

-- ============================================
-- 10. QUICK HEALTH CHECK
-- ============================================
-- Single query to verify the system is working
SELECT
  (SELECT COUNT(*) FROM agent_schedules WHERE is_template = true) AS templates,
  (SELECT COUNT(*) FROM agent_schedules WHERE is_template = false) AS workspace_instances,
  (SELECT COUNT(*) FROM agent_schedules WHERE is_template = false AND is_enabled = true AND workspace_id IS NOT NULL) AS active_schedules,
  (SELECT COUNT(*) FROM agent_schedules WHERE is_template = false AND is_enabled = true AND next_run_at <= NOW()) AS due_now,
  (SELECT COUNT(*) FROM agent_schedule_executions WHERE created_at >= NOW() - INTERVAL '1 hour') AS executions_last_hour;
