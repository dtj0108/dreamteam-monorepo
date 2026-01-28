-- Set workspace(s) to Lean Startup agent tier
-- Run this migration to activate the startup tier for the workspace

UPDATE workspace_billing
SET
  agent_tier = 'startup',
  agent_status = 'active',
  plan = 'monthly',
  agent_period_end = NOW() + INTERVAL '1 year'
WHERE workspace_id IN (
  SELECT id FROM workspaces LIMIT 1
);
