-- Add business_context JSONB column to workspaces table for workspace-level agent autonomy settings
-- This stores guided questions and custom context that applies to ALL agents in the workspace

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS business_context JSONB DEFAULT '{}';

COMMENT ON COLUMN workspaces.business_context IS 'Workspace-level business context for agent autonomy - applies to all agents in the workspace';
