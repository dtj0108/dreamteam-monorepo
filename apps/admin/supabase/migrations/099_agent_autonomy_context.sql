-- 099_agent_autonomy_context.sql
-- Add business context column to agents table for autonomy configuration

-- Add business_context column (JSONB for flexibility)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS business_context JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN agents.business_context IS 'User-configured business context: guided questions responses and custom context for agent autonomy';
