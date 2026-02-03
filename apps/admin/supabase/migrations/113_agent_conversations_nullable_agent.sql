-- Make agent_id nullable in agent_conversations table
-- In team mode, agents come from workspace_deployed_teams rather than the legacy agents table
-- This allows conversations to be created without requiring a legacy agent record

ALTER TABLE agent_conversations 
ALTER COLUMN agent_id DROP NOT NULL;

-- Add a comment explaining why this is nullable
COMMENT ON COLUMN agent_conversations.agent_id IS 'Optional reference to legacy agents table. NULL in team mode where agents come from workspace_deployed_teams.';
