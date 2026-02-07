-- Migration: Call enhancements
-- Description: Add notes, disposition to communications; transcription to recordings; scheduled_calls table

-- =============================================
-- 1. Add notes and disposition to communications
-- =============================================
ALTER TABLE communications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS disposition TEXT;

-- Create index for disposition filtering
CREATE INDEX IF NOT EXISTS idx_communications_disposition ON communications(disposition) WHERE disposition IS NOT NULL;

-- =============================================
-- 2. Add transcription fields to call_recordings
-- =============================================
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS transcription_status TEXT DEFAULT 'pending'
  CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed'));

-- Create index for finding recordings that need transcription
CREATE INDEX IF NOT EXISTS idx_call_recordings_transcription_status ON call_recordings(transcription_status)
  WHERE transcription_status IN ('pending', 'processing');

-- =============================================
-- 3. Create scheduled_calls table
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reminded', 'completed', 'missed', 'cancelled')),
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  notes TEXT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_pending ON scheduled_calls(status, scheduled_for)
  WHERE status IN ('pending', 'reminded');
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_user ON scheduled_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_lead ON scheduled_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_contact ON scheduled_calls(contact_id);

-- Enable Row Level Security
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_calls
-- Users can view their own scheduled calls
CREATE POLICY "Users can view own scheduled calls"
  ON scheduled_calls FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own scheduled calls
CREATE POLICY "Users can insert own scheduled calls"
  ON scheduled_calls FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own scheduled calls
CREATE POLICY "Users can update own scheduled calls"
  ON scheduled_calls FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own scheduled calls
CREATE POLICY "Users can delete own scheduled calls"
  ON scheduled_calls FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_calls_updated_at
  BEFORE UPDATE ON scheduled_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_calls_updated_at();
