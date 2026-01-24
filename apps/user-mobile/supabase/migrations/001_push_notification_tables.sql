-- Push Notifications Tables for DreamTeam Mobile
-- Run this in the Supabase Dashboard SQL Editor

-- ============================================
-- 1. USER PUSH TOKENS TABLE
-- ============================================
-- Stores Expo push tokens for each user's devices

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own tokens
CREATE POLICY "Users can insert own tokens"
  ON user_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON user_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON user_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can access all tokens (for Edge Functions)
CREATE POLICY "Service role full access"
  ON user_push_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================
-- 2. NOTIFICATION LOGS TABLE
-- ============================================
-- For debugging and monitoring push notification delivery

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  recipient_id UUID,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'no_token')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs by message or recipient
CREATE INDEX IF NOT EXISTS idx_notification_logs_message_id ON notification_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_id ON notification_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Enable RLS (admins only, or via service role)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert/read logs
CREATE POLICY "Service role can insert logs"
  ON notification_logs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can read logs"
  ON notification_logs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================
-- 3. UPDATED_AT TRIGGER FOR PUSH TOKENS
-- ============================================
-- Automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the tables were created:
--
-- SELECT * FROM user_push_tokens LIMIT 5;
-- SELECT * FROM notification_logs LIMIT 5;
