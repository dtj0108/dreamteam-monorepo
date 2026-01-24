-- Add created_by column to agent_conversations table
-- This column is required by the agent-chat API endpoint

ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Backfill existing rows: set created_by to user_id for existing conversations
UPDATE agent_conversations 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Add index for created_by lookups
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_by 
ON agent_conversations(created_by);

