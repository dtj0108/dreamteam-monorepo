-- 117_create_agent_schedules_unique_index.sql
-- Helper function to create the unique index for schedule clones

CREATE OR REPLACE FUNCTION create_agent_schedules_unique_index()
RETURNS void AS $$
BEGIN
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS agent_schedules_workspace_agent_name_unique
           ON agent_schedules (workspace_id, agent_id, name)
           WHERE is_template = false AND workspace_id IS NOT NULL';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create the index
SELECT create_agent_schedules_unique_index();
