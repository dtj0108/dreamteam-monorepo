-- 118_billing_schedule_integrity.sql
-- Billing & schedule integrity: deployment tracking, canceled status, data remediation

-- ============================================
-- 1. ADD 'canceled' TO workspace_deployed_teams STATUS
-- ============================================

-- Drop and recreate the CHECK constraint to include 'canceled'
ALTER TABLE workspace_deployed_teams
  DROP CONSTRAINT IF EXISTS workspace_deployed_teams_status_check;

ALTER TABLE workspace_deployed_teams
  ADD CONSTRAINT workspace_deployed_teams_status_check
  CHECK (status IN ('active', 'paused', 'replaced', 'failed', 'canceled'));

-- ============================================
-- 2. ADD DEPLOYMENT TRACKING COLUMNS TO workspace_billing
-- ============================================

ALTER TABLE workspace_billing
  ADD COLUMN IF NOT EXISTS agent_deploy_status TEXT
    CHECK (agent_deploy_status IN ('pending', 'deployed', 'failed')),
  ADD COLUMN IF NOT EXISTS agent_deploy_error TEXT,
  ADD COLUMN IF NOT EXISTS agent_deploy_attempted_at TIMESTAMPTZ;

COMMENT ON COLUMN workspace_billing.agent_deploy_status
  IS 'Status of the most recent agent deployment attempt';

COMMENT ON COLUMN workspace_billing.agent_deploy_error
  IS 'Error message if the most recent deployment failed';

COMMENT ON COLUMN workspace_billing.agent_deploy_attempted_at
  IS 'Timestamp of the most recent deployment attempt';

-- ============================================
-- 3. PARTIAL INDEX FOR FAILED DEPLOYS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspace_billing_deploy_failed
  ON workspace_billing(workspace_id)
  WHERE agent_deploy_status = 'failed';

-- ============================================
-- 4. DATA REMEDIATION
-- ============================================

-- 4a. Mark orphaned deployments as 'canceled'
-- Deployments that are 'active' but belong to workspaces with agent_tier = 'none'
UPDATE workspace_deployed_teams wdt
SET status = 'canceled', updated_at = now()
WHERE wdt.status = 'active'
  AND EXISTS (
    SELECT 1 FROM workspace_billing wb
    WHERE wb.workspace_id = wdt.workspace_id
      AND wb.agent_tier = 'none'
  );

-- 4b. Disable non-template schedules for workspaces with no active deployment
UPDATE agent_schedules s
SET is_enabled = false, updated_at = now()
WHERE s.is_template = false
  AND s.is_enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM workspace_deployed_teams wdt
    WHERE wdt.workspace_id = s.workspace_id
      AND wdt.status = 'active'
  );
