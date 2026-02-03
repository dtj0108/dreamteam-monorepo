-- 114_enforce_schedule_templates.sql
-- Enforce schedule template invariants and seed missing templates

-- ============================================
-- 1. BACKFILL TEMPLATE FLAGS FOR NULL WORKSPACE
-- ============================================
UPDATE agent_schedules
SET is_template = true,
    next_run_at = NULL
WHERE workspace_id IS NULL
  AND is_template = false;

UPDATE agent_schedules
SET is_template = false
WHERE is_template IS NULL;

UPDATE agent_schedules
SET is_template = false
WHERE workspace_id IS NOT NULL
  AND is_template = true;

-- ============================================
-- 2. SEED MISSING TEMPLATES FROM WORKSPACE SCHEDULES
-- ============================================
INSERT INTO agent_schedules (
  agent_id,
  name,
  description,
  cron_expression,
  timezone,
  task_prompt,
  requires_approval,
  output_config,
  is_enabled,
  is_template,
  next_run_at,
  created_by,
  workspace_id
)
SELECT DISTINCT ON (s.agent_id, s.name)
  s.agent_id,
  s.name,
  s.description,
  s.cron_expression,
  s.timezone,
  s.task_prompt,
  s.requires_approval,
  s.output_config,
  s.is_enabled,
  true,
  NULL,
  s.created_by,
  NULL
FROM agent_schedules s
WHERE s.is_template = false
  AND s.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM agent_schedules t
    WHERE t.agent_id = s.agent_id
      AND t.name = s.name
      AND t.is_template = true
  )
ORDER BY s.agent_id, s.name, s.created_at DESC;

-- ============================================
-- 3. ADD CONSTRAINT TO ENFORCE TEMPLATE RULES
-- ============================================
ALTER TABLE agent_schedules
  ADD CONSTRAINT agent_schedules_template_workspace_check
  CHECK (
    (is_template = true AND workspace_id IS NULL) OR
    (is_template = false AND workspace_id IS NOT NULL)
  );

-- ============================================
-- 4. TRIGGER TO AUTO-ENFORCE TEMPLATE FIELDS
-- ============================================
CREATE OR REPLACE FUNCTION enforce_agent_schedule_template_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    NEW.is_template := true;
    NEW.next_run_at := NULL;
  ELSE
    NEW.is_template := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_agent_schedule_template_fields ON agent_schedules;
CREATE TRIGGER set_agent_schedule_template_fields
BEFORE INSERT OR UPDATE ON agent_schedules
FOR EACH ROW EXECUTE FUNCTION enforce_agent_schedule_template_fields();
