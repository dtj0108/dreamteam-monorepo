-- Fix Push Notification Sender Name Bug
--
-- Problem: The trigger was using non-existent columns (full_name, display_name)
-- to look up sender names from the profiles table, causing notifications to
-- display "Someone" instead of the actual sender name.
--
-- Solution: Use the correct column name 'name' from the profiles table.

-- ============================================
-- UPDATE TRIGGER FUNCTION
-- ============================================
-- Replaces the existing trigger_send_push_notification function with
-- the corrected column reference

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
  -- FIX: Use 'name' column instead of non-existent 'full_name' and 'display_name'
  IF v_sender_name IS NULL THEN
    SELECT name
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
-- VERIFICATION
-- ============================================
-- After applying this migration:
--
-- 1. Test with an agent message:
--    INSERT INTO messages (content, sender_id, channel_id)
--    VALUES ('Test from agent', 'AGENT_PROFILE_ID', 'CHANNEL_ID');
--
-- 2. Verify the notification_logs table shows the correct sender name:
--    SELECT sender_name, content FROM notification_logs
--    ORDER BY created_at DESC LIMIT 5;
--
-- 3. The sender_name should now show the agent's actual name, not "Someone"
