-- Add workspace_id to communications table for multi-tenant filtering
ALTER TABLE communications ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_communications_workspace_id ON communications(workspace_id);

-- Backfill from leads table where lead_id is set
UPDATE communications c
SET workspace_id = l.workspace_id
FROM leads l
WHERE c.lead_id = l.id
  AND c.workspace_id IS NULL;

-- Backfill remaining rows via user's default workspace
UPDATE communications c
SET workspace_id = p.default_workspace_id
FROM profiles p
WHERE c.user_id = p.id
  AND c.workspace_id IS NULL
  AND p.default_workspace_id IS NOT NULL;
