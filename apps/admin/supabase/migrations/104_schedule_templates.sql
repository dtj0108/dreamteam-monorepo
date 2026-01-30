-- 104_schedule_templates.sql
-- Per-workspace schedule isolation with template pattern
--
-- Problem: All 175 schedules have workspace_id = NULL and next_run_at = NULL
-- This means:
--   1. If one workspace edits a schedule, it affects EVERYONE
--   2. Schedules run once globally, not once per workspace
--   3. No MCP tool access (requires workspace context)
--
-- Solution: Template pattern
--   - Existing schedules (workspace_id = NULL) become templates (not executed)
--   - When a workspace hires an agent, schedules are cloned for that workspace
--   - Each workspace gets its own copy with proper next_run_at

-- ============================================
-- 1. ADD is_template COLUMN
-- ============================================
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Add index for efficient template lookups
CREATE INDEX IF NOT EXISTS idx_agent_schedules_template ON agent_schedules(is_template) WHERE is_template = true;

-- ============================================
-- 2. MARK EXISTING SCHEDULES AS TEMPLATES
-- ============================================
-- Schedules without workspace_id are global definitions → mark as templates
UPDATE agent_schedules
SET is_template = true
WHERE workspace_id IS NULL;

-- ============================================
-- 3. UPDATE fetch_due_schedules TO EXCLUDE TEMPLATES
-- ============================================
-- Templates should NEVER be picked up by cron - only workspace instances should run
CREATE OR REPLACE FUNCTION fetch_due_schedules(batch_size int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  name text,
  cron_expression text,
  timezone text,
  task_prompt text,
  requires_approval boolean,
  is_enabled boolean,
  next_run_at timestamptz,
  workspace_id uuid,
  created_by uuid,
  output_config jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.agent_id,
    s.name,
    s.cron_expression,
    s.timezone,
    s.task_prompt,
    s.requires_approval,
    s.is_enabled,
    s.next_run_at,
    s.workspace_id,
    s.created_by,
    s.output_config
  FROM agent_schedules s
  WHERE s.is_enabled = true
    AND s.is_template = false              -- NEW: exclude templates
    AND s.workspace_id IS NOT NULL         -- NEW: require workspace context
    AND s.next_run_at IS NOT NULL          -- Must have calculated next run time
    AND s.next_run_at <= now()
  ORDER BY s.next_run_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fetch_due_schedules(int) IS
  'Fetches due schedules with row-level locking using SKIP LOCKED. Excludes templates and requires workspace_id for MCP tool access.';

-- ============================================
-- 4. BACKFILL: CLONE TEMPLATES FOR EXISTING HIRED AGENTS
-- ============================================
-- For workspaces that already hired agents, create schedule instances
-- This ensures existing users immediately get per-workspace schedules
INSERT INTO agent_schedules (
  agent_id,
  workspace_id,
  name,
  cron_expression,
  timezone,
  task_prompt,
  requires_approval,
  output_config,
  is_enabled,
  is_template,
  next_run_at,
  created_by,
  description
)
SELECT
  t.agent_id,
  a.workspace_id,
  t.name,
  t.cron_expression,
  COALESCE(t.timezone, 'UTC'),
  t.task_prompt,
  t.requires_approval,
  t.output_config,
  true,                          -- is_enabled
  false,                         -- is_template (these are instances)
  NOW() + INTERVAL '1 minute',   -- next_run_at (will trigger on next cron cycle)
  a.created_by,
  t.description
FROM agent_schedules t
JOIN agents a ON a.ai_agent_id = t.agent_id
WHERE t.is_template = true
  AND a.is_active = true
  AND NOT EXISTS (
    -- Prevent duplicates: don't clone if workspace already has this schedule
    SELECT 1 FROM agent_schedules existing
    WHERE existing.agent_id = t.agent_id
      AND existing.workspace_id = a.workspace_id
      AND existing.name = t.name
      AND existing.is_template = false
  );

-- ============================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN agent_schedules.is_template IS
  'When true, this schedule is a template that gets cloned when an agent is hired. Templates are never executed directly.';

-- ============================================
-- 6. CREATE RLS POLICIES FOR WORKSPACE SCHEDULES
-- ============================================
-- Workspace members can view their own schedules (non-templates)
DROP POLICY IF EXISTS "Workspace members can view their schedules" ON agent_schedules;
CREATE POLICY "Workspace members can view their schedules" ON agent_schedules
FOR SELECT TO authenticated
USING (
  is_template = false
  AND workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.profile_id = auth.uid()
  )
);

-- Workspace members can update their own schedule settings
DROP POLICY IF EXISTS "Workspace members can update their schedules" ON agent_schedules;
CREATE POLICY "Workspace members can update their schedules" ON agent_schedules
FOR UPDATE TO authenticated
USING (
  is_template = false
  AND workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.profile_id = auth.uid()
  )
);

-- Templates are read-only for non-superadmins
DROP POLICY IF EXISTS "Anyone can view schedule templates" ON agent_schedules;
CREATE POLICY "Anyone can view schedule templates" ON agent_schedules
FOR SELECT TO authenticated
USING (is_template = true);
