-- Add workspace_id to twilio_numbers for better multi-tenant support
-- This enables phone numbers to be scoped to workspaces instead of just users

-- Add workspace_id column
ALTER TABLE twilio_numbers ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for workspace queries
CREATE INDEX idx_twilio_numbers_workspace ON twilio_numbers(workspace_id);

-- Backfill workspace_id from user's default workspace
UPDATE twilio_numbers tn
SET workspace_id = p.default_workspace_id
FROM profiles p
WHERE tn.user_id = p.id
AND tn.workspace_id IS NULL;

-- Make workspace_id NOT NULL after backfill
ALTER TABLE twilio_numbers ALTER COLUMN workspace_id SET NOT NULL;

-- Add RLS policy for workspace-based access
CREATE POLICY "Users can view workspace phone numbers"
  ON twilio_numbers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = twilio_numbers.workspace_id
      AND profile_id = auth.uid()
    )
  );

-- Note: Other RLS policies (INSERT, UPDATE, DELETE) may need to be added
-- based on existing twilio_numbers policies. This migration only adds
-- the workspace_id column and basic SELECT policy.
