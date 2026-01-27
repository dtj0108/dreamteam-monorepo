-- Migration: activity_assignees
-- Description: Add support for multi-user activity assignment
-- Each activity can have multiple assignees through this junction table

CREATE TABLE IF NOT EXISTS activity_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Index for querying assignees by activity
CREATE INDEX IF NOT EXISTS idx_activity_assignees_activity ON activity_assignees(activity_id);

-- Index for querying activities by user
CREATE INDEX IF NOT EXISTS idx_activity_assignees_user ON activity_assignees(user_id);

-- Enable RLS
ALTER TABLE activity_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view assignees for activities in their workspace
CREATE POLICY "Users can view activity assignees in their workspace"
  ON activity_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_assignees.activity_id
      AND a.profile_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert assignees for their own activities
CREATE POLICY "Users can insert activity assignees for their activities"
  ON activity_assignees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_assignees.activity_id
      AND a.profile_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete assignees from their own activities
CREATE POLICY "Users can delete activity assignees from their activities"
  ON activity_assignees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_assignees.activity_id
      AND a.profile_id = auth.uid()
    )
  );
