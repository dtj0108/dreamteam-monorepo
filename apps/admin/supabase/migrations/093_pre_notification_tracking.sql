-- Track which upcoming run we've already sent a pre-notification for
ALTER TABLE agent_schedules
ADD COLUMN IF NOT EXISTS pre_notified_for_run_at TIMESTAMPTZ;

-- Index for efficient pre-notification queries
CREATE INDEX IF NOT EXISTS idx_agent_schedules_pre_notify
ON agent_schedules(next_run_at, pre_notified_for_run_at)
WHERE is_enabled = true;
