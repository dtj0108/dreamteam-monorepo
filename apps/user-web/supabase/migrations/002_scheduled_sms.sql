-- Migration: Create scheduled_sms table
-- Description: Table for storing scheduled SMS messages for future delivery

CREATE TABLE IF NOT EXISTS scheduled_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_pending ON scheduled_sms(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_user ON scheduled_sms(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_lead ON scheduled_sms(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_contact ON scheduled_sms(contact_id);

-- Enable Row Level Security
ALTER TABLE scheduled_sms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_sms
-- Users can view their own scheduled SMS
CREATE POLICY "Users can view own scheduled sms"
  ON scheduled_sms FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own scheduled SMS
CREATE POLICY "Users can insert own scheduled sms"
  ON scheduled_sms FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own scheduled SMS
CREATE POLICY "Users can update own scheduled sms"
  ON scheduled_sms FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own scheduled SMS
CREATE POLICY "Users can delete own scheduled sms"
  ON scheduled_sms FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_sms_updated_at
  BEFORE UPDATE ON scheduled_sms
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_sms_updated_at();
