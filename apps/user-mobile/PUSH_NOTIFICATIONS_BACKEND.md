# Push Notifications - Backend Requirements

This document describes the backend changes needed to support push notifications in the DreamTeam mobile app. The mobile app is ready and waiting for these backend pieces.

---

## 1. Database Schema

Create the `user_push_tokens` table in Supabase:

```sql
-- Create the user_push_tokens table
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Index for fast lookups by user
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can insert own tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON user_push_tokens
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens" ON user_push_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can read all tokens (for sending notifications)
CREATE POLICY "Service can read all tokens" ON user_push_tokens
  FOR SELECT USING (auth.role() = 'service_role');
```

---

## 2. API Endpoints

The mobile app uses Supabase directly to manage tokens (see `lib/api/notifications.ts`), so no REST API endpoints are strictly needed for token registration. However, you may want an internal endpoint for triggering notifications.

### Optional: Internal Push Trigger Endpoint

```
POST /api/notifications/send (internal use only)
```

**Request Body:**
```json
{
  "userId": "uuid",           // Send to specific user
  "userIds": ["uuid", ...],   // Or send to multiple users
  "title": "New Message",
  "body": "You have a new message from John",
  "data": {
    "type": "message",        // Required for deep linking
    "channelId": "uuid",      // Optional, depends on type
    "dmId": "uuid",           // Optional
    "taskId": "uuid",         // Optional
    "projectId": "uuid"       // Optional
  }
}
```

---

## 3. Push Notification Service

Create a service to send notifications via the Expo Push API.

### Service Location
```
lib/services/push-notifications.ts  (or similar)
```

### Implementation

```typescript
import { createClient } from '@supabase/supabase-js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;           // Expo push token
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;   // Android notification channel
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
): Promise<void> {
  // Get user's push tokens
  const { data: tokens, error } = await supabase
    .from('user_push_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (error || !tokens?.length) {
    console.log(`No push tokens for user ${userId}`);
    return;
  }

  // Build messages for each token
  const messages: PushMessage[] = tokens.map(({ token, platform }) => ({
    to: token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    sound: 'default',
    channelId: platform === 'android' ? 'default' : undefined,
  }));

  // Send to Expo Push API
  await sendExpoPushNotifications(messages);
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
): Promise<void> {
  // Get all tokens for these users
  const { data: tokens, error } = await supabase
    .from('user_push_tokens')
    .select('token, platform, user_id')
    .in('user_id', userIds);

  if (error || !tokens?.length) {
    console.log('No push tokens found for users');
    return;
  }

  const messages: PushMessage[] = tokens.map(({ token, platform }) => ({
    to: token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    sound: 'default',
    channelId: platform === 'android' ? 'default' : undefined,
  }));

  await sendExpoPushNotifications(messages);
}

/**
 * Send notifications via Expo Push API
 * Handles batching (Expo limit is 100 per request)
 */
async function sendExpoPushNotifications(
  messages: PushMessage[]
): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = [];

  // Batch in groups of 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();

      if (result.data) {
        tickets.push(...result.data);
      }

      // Log any errors
      result.data?.forEach((ticket: ExpoPushTicket, index: number) => {
        if (ticket.status === 'error') {
          console.error(`Push failed for ${batch[index].to}:`, ticket.message);

          // Handle invalid tokens (should be removed from DB)
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // TODO: Delete this token from user_push_tokens
            console.log(`Token invalid, should remove: ${batch[index].to}`);
          }
        }
      });
    } catch (error) {
      console.error('Expo Push API error:', error);
    }
  }

  return tickets;
}
```

---

## 4. Notification Data Format (Deep Linking)

The mobile app expects specific `data` fields to handle deep linking when a notification is tapped.

### Supported Types and Required Fields

| Type | Required Data Fields | Navigates To |
|------|---------------------|--------------|
| `message` | `channelId` | Channel chat screen |
| `channel` | `channelId` | Channel chat screen |
| `dm` | `dmId` | DM conversation screen |
| `mention` | `channelId` or `dmId` | Respective chat screen |
| `task` | `taskId`, `projectId` | Project detail screen |
| `reminder` | (none) | Hub screen |

### Example Payloads

**New Channel Message:**
```json
{
  "title": "#general",
  "body": "John: Hey team, check this out!",
  "data": {
    "type": "message",
    "channelId": "abc-123"
  }
}
```

**Direct Message:**
```json
{
  "title": "John Doe",
  "body": "Hey, are you free for a call?",
  "data": {
    "type": "dm",
    "dmId": "def-456"
  }
}
```

**Mention:**
```json
{
  "title": "Mentioned in #general",
  "body": "John mentioned you: @drew can you review this?",
  "data": {
    "type": "mention",
    "channelId": "abc-123",
    "messageId": "msg-789"
  }
}
```

**Task Assignment:**
```json
{
  "title": "New Task Assigned",
  "body": "John assigned you: Update homepage design",
  "data": {
    "type": "task",
    "taskId": "task-111",
    "projectId": "proj-222"
  }
}
```

---

## 5. Event Triggers

Add push notification calls to these existing backend functions/webhooks:

### Team Messages
When a new message is sent to a channel:
- Get all channel members (except sender)
- Filter out users who are currently online/active
- Send push with `type: "message"` or `type: "channel"`

### Direct Messages
When a DM is sent:
- Send push to the other participant
- Use `type: "dm"` with `dmId`

### Mentions
When parsing a message that contains `@username`:
- Send push to mentioned user
- Use `type: "mention"`

### Task Assignments
When a task is assigned or reassigned:
- Send push to the assignee
- Use `type: "task"` with `taskId` and `projectId`

### Task Due Soon
Scheduled job (e.g., daily at 9am):
- Find tasks due within 24 hours
- Send push to assignees
- Use `type: "reminder"`

---

## 6. Checking User Online Status (Optional)

To avoid sending pushes to users who are already active in the app, you can:

1. **Use Supabase Presence** - Track active users via realtime presence
2. **Check `user_presence` table** - Look at `last_seen_at` timestamp
3. **Simple approach** - Always send push, let the app decide whether to show it

The mobile app already handles foreground notifications appropriately.

---

## 7. Testing

### Manual Testing with Expo Push Tool

1. Get a push token from the mobile app (check console logs on login)
2. Go to https://expo.dev/notifications
3. Enter the Expo push token
4. Send a test notification with the data format above
5. Verify the notification appears and deep links correctly

### Testing Token Registration

1. Login on mobile app
2. Check Supabase `user_push_tokens` table for new row
3. Sign out on mobile app
4. Verify the token row is deleted

### Testing via API (if you create the endpoint)

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_TOKEN" \
  -d '{
    "userId": "user-uuid-here",
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {
      "type": "reminder"
    }
  }'
```

---

## 8. Platform Credentials (Required)

Before push notifications will work, credentials must be configured in Expo/EAS:

### iOS (APNs)
1. Apple Developer Portal → Keys → Create APNs Key
2. Download `.p8` file
3. Upload to Expo via `eas credentials` or Expo dashboard

### Android (FCM)
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key (JSON)
3. Upload to Expo via `eas credentials` or Expo dashboard

**Note:** After configuring credentials, new native app builds are required:
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## Summary Checklist

- [ ] Create `user_push_tokens` table with RLS policies
- [ ] Create push notification service (`sendPushToUser`, `sendPushToUsers`)
- [ ] Add push triggers to message sending logic
- [ ] Add push triggers to task assignment logic
- [ ] (Optional) Create internal `/api/notifications/send` endpoint
- [ ] (Optional) Set up scheduled job for due date reminders
- [ ] Configure APNs credentials in Expo
- [ ] Configure FCM credentials in Expo
- [ ] Build and deploy new native app versions
