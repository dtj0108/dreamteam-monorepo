-- Add workspace_id to workflows table for workspace scoping
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Backfill existing workflows with the owner's default workspace
UPDATE workflows w
SET workspace_id = p.default_workspace_id
FROM profiles p
WHERE w.user_id = p.id
  AND w.workspace_id IS NULL
  AND p.default_workspace_id IS NOT NULL;

-- Index for workspace-scoped lookups
CREATE INDEX IF NOT EXISTS idx_workflows_workspace_id ON workflows(workspace_id);
