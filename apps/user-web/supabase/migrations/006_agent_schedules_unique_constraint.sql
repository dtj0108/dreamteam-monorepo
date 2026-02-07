-- Add unique constraint to prevent duplicate schedule clones
-- This ensures that concurrent cloning operations don't create duplicates
-- The partial index only applies to non-template schedules with a workspace

CREATE UNIQUE INDEX IF NOT EXISTS agent_schedules_workspace_agent_name_unique
ON agent_schedules (workspace_id, agent_id, name)
WHERE is_template = false AND workspace_id IS NOT NULL;
