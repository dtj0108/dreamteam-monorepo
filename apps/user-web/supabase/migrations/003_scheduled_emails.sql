-- Migration: Create scheduled_emails table
-- Description: Table for storing scheduled emails for future delivery via Nylas

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  grant_id UUID NOT NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_pending ON scheduled_emails(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user ON scheduled_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_workspace ON scheduled_emails(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_lead ON scheduled_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_contact ON scheduled_emails(contact_id);

-- Enable Row Level Security
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_emails
-- Users can view their own scheduled emails
CREATE POLICY "Users can view own scheduled emails"
  ON scheduled_emails FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own scheduled emails
CREATE POLICY "Users can insert own scheduled emails"
  ON scheduled_emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own scheduled emails
CREATE POLICY "Users can update own scheduled emails"
  ON scheduled_emails FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own scheduled emails
CREATE POLICY "Users can delete own scheduled emails"
  ON scheduled_emails FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_emails_updated_at
  BEFORE UPDATE ON scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_emails_updated_at();
