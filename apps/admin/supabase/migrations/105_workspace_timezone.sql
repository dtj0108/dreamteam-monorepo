-- Add timezone column to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
COMMENT ON COLUMN workspaces.timezone IS 'Workspace timezone in IANA format (e.g., America/New_York)';
