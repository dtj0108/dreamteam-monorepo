-- 116_agent_tier_pending.sql
-- Track pending agent tier changes (downgrades or delayed upgrades)

ALTER TABLE workspace_billing
  ADD COLUMN IF NOT EXISTS agent_tier_pending TEXT
    CHECK (agent_tier_pending IN ('startup', 'teams', 'enterprise')),
  ADD COLUMN IF NOT EXISTS agent_tier_pending_effective_at TIMESTAMPTZ;

COMMENT ON COLUMN workspace_billing.agent_tier_pending
  IS 'Pending agent tier change awaiting activation or period-end';

COMMENT ON COLUMN workspace_billing.agent_tier_pending_effective_at
  IS 'When the pending agent tier change should take effect';
