-- Add INSERT, UPDATE, DELETE RLS policies for twilio_numbers
-- These were missing from migration 094_add_workspace_to_twilio_numbers.sql

-- INSERT policy: Users can add phone numbers to their workspace
CREATE POLICY "Users can insert phone numbers in their workspace"
  ON twilio_numbers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = twilio_numbers.workspace_id
      AND profile_id = auth.uid()
    )
  );

-- UPDATE policy: Users can update phone numbers in their workspace
CREATE POLICY "Users can update workspace phone numbers"
  ON twilio_numbers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = twilio_numbers.workspace_id
      AND profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = twilio_numbers.workspace_id
      AND profile_id = auth.uid()
    )
  );

-- DELETE policy: Users can delete phone numbers in their workspace
CREATE POLICY "Users can delete workspace phone numbers"
  ON twilio_numbers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = twilio_numbers.workspace_id
      AND profile_id = auth.uid()
    )
  );
