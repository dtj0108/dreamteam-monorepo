-- 094_agent_schedules_workspace.sql
-- Add workspace_id to agent_schedules for direct workspace context
-- This fixes the hallucination bug where scheduled tasks had no access to MCP tools
-- because workspace_id couldn't be reliably resolved through the agents table lookup

-- ============================================
-- ADD WORKSPACE_ID COLUMN
-- ============================================
ALTER TABLE agent_schedules
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_agent_schedules_workspace ON agent_schedules(workspace_id);

-- ============================================
-- BACKFILL EXISTING SCHEDULES
-- ============================================
-- Try to resolve workspace from agents table for existing schedules
-- agents.ai_agent_id links to ai_agents.id, and agents.workspace_id gives us the workspace
UPDATE agent_schedules s
SET workspace_id = a.workspace_id
FROM agents a
WHERE a.ai_agent_id = s.agent_id
  AND a.is_active = true
  AND s.workspace_id IS NULL;

-- Note: Some schedules may not have a corresponding workspace if:
-- 1. The agent was never "hired" into a workspace (global agent only)
-- 2. The hiring record was deleted
-- These schedules will continue to work but without MCP tools until
-- workspace_id is manually set or they're recreated with workspace context.

-- ============================================
-- ADD COMMENT FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN agent_schedules.workspace_id IS
  'The workspace context for this schedule. Required for MCP tools to have access to workspace data. Can be NULL for global schedules that don''t need workspace context.';
