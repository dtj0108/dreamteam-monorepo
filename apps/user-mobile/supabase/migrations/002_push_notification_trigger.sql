-- Push Notification Trigger for Team Messages
-- Run this in the Supabase Dashboard SQL Editor AFTER 001_push_notification_tables.sql

-- ============================================
-- PREREQUISITES
-- ============================================
-- 1. Enable the pg_net extension in Supabase Dashboard:
--    Database > Extensions > Search for "pg_net" > Enable
--
-- 2. The following tables must exist (from your Team module):
--    - messages (id, content, sender_id, channel_id, dm_conversation_id, created_at)
--    - channels (id, name)
--    - profiles/users (id, full_name or display_name)
--
-- 3. Set the SUPABASE_URL secret for the trigger:
--    Replace YOUR_PROJECT_REF below with your actual project ref

-- ============================================
-- 1. ENABLE PG_NET EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ============================================
-- 2. TRIGGER FUNCTION
-- ============================================
-- This function is called when a new message is inserted
-- It extracts context and calls the Edge Function via HTTP

CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_channel_name TEXT;
  v_notification_type TEXT;
  v_payload JSONB;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from vault or environment
  -- These should be set as secrets in your Supabase project
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback: If not set via app.settings, use environment
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://YOUR_PROJECT_REF.supabase.co';
  END IF;

  -- Get sender's display name
  -- First try auth.users for regular users
  SELECT COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
  INTO v_sender_name
  FROM auth.users
  WHERE id = NEW.sender_id;

  -- If not found in auth.users (e.g., agent-sent messages), try profiles table
  IF v_sender_name IS NULL THEN
    SELECT COALESCE(full_name, display_name)
    INTO v_sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
  END IF;

  -- Determine notification type and build payload
  IF NEW.channel_id IS NOT NULL THEN
    -- Channel message
    v_notification_type := 'channel_message';

    -- Get channel name
    SELECT name INTO v_channel_name
    FROM channels
    WHERE id = NEW.channel_id;

    v_payload := jsonb_build_object(
      'type', v_notification_type,
      'messageId', NEW.id::text,
      'senderId', NEW.sender_id::text,
      'senderName', COALESCE(v_sender_name, 'Someone'),
      'content', LEFT(NEW.content, 200),
      'channelId', NEW.channel_id::text,
      'channelName', COALESCE(v_channel_name, 'channel')
    );

  ELSIF NEW.dm_conversation_id IS NOT NULL THEN
    -- Direct message
    v_notification_type := 'dm';

    v_payload := jsonb_build_object(
      'type', v_notification_type,
      'messageId', NEW.id::text,
      'senderId', NEW.sender_id::text,
      'senderName', COALESCE(v_sender_name, 'Someone'),
      'content', LEFT(NEW.content, 200),
      'dmConversationId', NEW.dm_conversation_id::text
    );

  ELSE
    -- Unknown message type, skip notification
    RETURN NEW;
  END IF;

  -- Check for mentions in the message content (e.g., @user_id format)
  -- This is a simplified check - adjust based on your mention format
  IF NEW.content ~ '@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    -- Extract mentioned user IDs
    v_payload := v_payload || jsonb_build_object(
      'type', 'mention',
      'mentionedUserIds', (
        SELECT jsonb_agg(DISTINCT match[1])
        FROM regexp_matches(NEW.content, '@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'g') AS match
      )
    );
  END IF;

  -- Call the Edge Function via pg_net
  -- Note: This is async and non-blocking
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := v_payload
  );

  -- Always return NEW to allow the insert to complete
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the message insert
    RAISE WARNING 'Push notification trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 3. CREATE THE TRIGGER
-- ============================================
-- Only fire for new messages (not updates or deletes)

DROP TRIGGER IF EXISTS on_message_insert_send_push ON messages;

CREATE TRIGGER on_message_insert_send_push
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_push_notification();


-- ============================================
-- 4. CONFIGURE SETTINGS (REQUIRED)
-- ============================================
-- Run these commands to set up the required secrets.
-- Replace the values with your actual Supabase project details.
--
-- Option A: Using ALTER DATABASE (simpler, persists across sessions)
--
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--
-- Option B: Using Supabase Vault (more secure, recommended for production)
-- See: https://supabase.com/docs/guides/database/vault
--
-- SELECT vault.create_secret('service_role_key', 'YOUR_SERVICE_ROLE_KEY');


-- ============================================
-- VERIFICATION
-- ============================================
-- Test the trigger by inserting a test message:
--
-- INSERT INTO messages (content, sender_id, channel_id)
-- VALUES ('Test notification message', 'YOUR_USER_ID', 'YOUR_CHANNEL_ID');
--
-- Then check the notification_logs table:
-- SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 5;
