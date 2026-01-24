# Teams Module - Data Schema Documentation

This document explains the database schema and API structure for the Teams/messaging module.

## Overview

The Teams module provides Slack-like messaging with:
- **Channels**: Public/private group discussions
- **Direct Messages**: 1:1 conversations
- **Threads**: Nested replies to messages
- **Reactions**: Emoji reactions on messages
- **Real-time**: Live updates via Supabase subscriptions

---

## Database Schema

### Channels

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, name)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Parent workspace |
| `name` | VARCHAR(100) | Channel name (lowercase, dashes) |
| `description` | TEXT | Optional description |
| `is_private` | BOOLEAN | Private channels require membership |
| `is_archived` | BOOLEAN | Archived channels are read-only |
| `created_by` | UUID | User who created channel |

---

### Channel Members

```sql
CREATE TABLE channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  notifications VARCHAR(50) DEFAULT 'all',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, profile_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `channel_id` | UUID | The channel |
| `profile_id` | UUID | The user |
| `last_read_at` | TIMESTAMPTZ | For unread count calculation |
| `notifications` | VARCHAR(50) | `all`, `mentions`, or `none` |
| `joined_at` | TIMESTAMPTZ | When user joined |

---

### DM Conversations

```sql
CREATE TABLE dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Parent workspace |
| `created_at` | TIMESTAMPTZ | When created |

---

### DM Participants

```sql
CREATE TABLE dm_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, profile_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `conversation_id` | UUID | The DM conversation |
| `profile_id` | UUID | Participant user |
| `last_read_at` | TIMESTAMPTZ | For unread count calculation |

---

### Messages

Unified table for both channel and DM messages, including threads.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  dm_conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Message must be in exactly one place
  CHECK (
    (channel_id IS NOT NULL AND dm_conversation_id IS NULL) OR
    (channel_id IS NULL AND dm_conversation_id IS NOT NULL)
  )
);
```

| Column | Type | Description |
|--------|------|-------------|
| `channel_id` | UUID | Channel (NULL for DMs) |
| `dm_conversation_id` | UUID | DM conversation (NULL for channels) |
| `sender_id` | UUID | User who sent message |
| `parent_id` | UUID | Parent message for threads (NULL = top-level) |
| `content` | TEXT | Message text |
| `is_edited` | BOOLEAN | Whether message was edited |
| `is_deleted` | BOOLEAN | Soft delete flag |

---

### Message Reactions

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, profile_id, emoji)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `message_id` | UUID | The message |
| `profile_id` | UUID | User who reacted |
| `emoji` | VARCHAR(50) | Emoji string (e.g., "👍") |

---

### Message Attachments

```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Endpoints

### Channels

#### List Channels
```
GET /api/team/channels?workspaceId={uuid}
```

**Response:**
```json
{
  "channels": [
    {
      "id": "channel-uuid",
      "name": "general",
      "description": "General discussion",
      "is_private": false,
      "unread_count": 5,
      "member_count": 12
    }
  ]
}
```

#### Create Channel
```
POST /api/team/channels
```

**Request:**
```json
{
  "workspaceId": "workspace-uuid",
  "name": "engineering",
  "description": "Engineering team",
  "is_private": false
}
```

#### Add Channel Member
```
POST /api/team/channels/{channelId}/members
```

**Request:**
```json
{
  "profileId": "user-uuid"
}
```

#### Mark Channel as Read
```
PATCH /api/team/channels/{channelId}/read
```

---

### Direct Messages

#### List DM Conversations
```
GET /api/team/dm?workspaceId={uuid}
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "conversation-uuid",
      "otherParticipants": [
        {
          "id": "user-uuid",
          "name": "John Doe",
          "avatar_url": "https://..."
        }
      ],
      "unread_count": 2,
      "last_message": {
        "content": "Hey!",
        "created_at": "2024-01-15T10:00:00Z"
      }
    }
  ]
}
```

#### Start/Get DM Conversation
```
POST /api/team/dm
```

**Request:**
```json
{
  "workspaceId": "workspace-uuid",
  "participantId": "other-user-uuid"
}
```

Returns existing conversation if one exists, otherwise creates new one.

---

### Messages

#### List Messages
```
GET /api/team/messages?channelId={uuid}&limit=50&before={timestamp}
```
or
```
GET /api/team/messages?dmConversationId={uuid}&limit=50&before={timestamp}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "message-uuid",
      "content": "Hello everyone!",
      "sender_id": "user-uuid",
      "parent_id": null,
      "created_at": "2024-01-15T10:00:00Z",
      "is_edited": false,
      "is_deleted": false,
      "sender": {
        "id": "user-uuid",
        "name": "John Doe",
        "avatar_url": "https://..."
      },
      "reactions": [
        { "emoji": "👍", "count": 3, "reacted": true }
      ],
      "reply_count": 2
    }
  ]
}
```

#### Get Thread Replies
```
GET /api/team/messages?parentId={messageId}
```

#### Send Message
```
POST /api/team/messages
```

**Request (Channel Message):**
```json
{
  "channelId": "channel-uuid",
  "content": "Hello everyone!"
}
```

**Request (DM):**
```json
{
  "dmConversationId": "conversation-uuid",
  "content": "Hey!"
}
```

**Request (Thread Reply):**
```json
{
  "channelId": "channel-uuid",
  "parentId": "parent-message-uuid",
  "content": "Great point!"
}
```

#### Edit Message
```
PUT /api/team/messages/{messageId}
```

**Request:**
```json
{
  "content": "Updated message content"
}
```

#### Delete Message (Soft Delete)
```
DELETE /api/team/messages/{messageId}
```

---

### Reactions

#### Add Reaction
```
POST /api/team/messages/{messageId}/reactions
```

**Request:**
```json
{
  "emoji": "👍"
}
```

#### Remove Reaction
```
DELETE /api/team/messages/{messageId}/reactions?emoji=👍
```

---

## Key Concepts

### Threads

Threads use the `parent_id` field:
- **Top-level messages**: `parent_id = NULL`
- **Thread replies**: `parent_id = {parent_message_id}`

```typescript
// Fetch thread
const { data: thread } = await supabase
  .from('messages')
  .select('*, sender:profiles(*)')
  .or(`id.eq.${parentId},parent_id.eq.${parentId}`)
  .order('created_at', { ascending: true })
```

### Unread Counts

Calculated by comparing `last_read_at` with message timestamps:

```typescript
// Channel unread count
const unreadCount = messages.filter(
  m => m.created_at > channelMember.last_read_at &&
       m.sender_id !== currentUserId
).length
```

### Mentions

Currently stored as text in message content (e.g., `@username`). Parse on the client:

```typescript
const mentionRegex = /@(\w+)/g
const mentions = content.match(mentionRegex)
```

### Real-time Subscriptions

Use Supabase Realtime for live updates:

```typescript
// Subscribe to new messages
supabase
  .channel(`messages:${channelId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `channel_id=eq.${channelId}`
  }, (payload) => {
    // Add new message to state
  })
  .subscribe()

// Typing indicators (broadcast)
supabase
  .channel(`typing:${channelId}`)
  .on('broadcast', { event: 'typing' }, ({ payload }) => {
    // Show typing indicator
  })
  .subscribe()
```

---

## Mobile Implementation

### Fetch Channels on Load

```typescript
async function fetchChannels(workspaceId: string) {
  const response = await fetch(
    `${API_URL}/api/team/channels?workspaceId=${workspaceId}`,
    { headers: await getAuthHeaders() }
  )
  return response.json()
}
```

### Send a Message

```typescript
async function sendMessage(channelId: string, content: string) {
  const response = await fetch(`${API_URL}/api/team/messages`, {
    method: 'POST',
    headers: {
      ...await getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ channelId, content })
  })
  return response.json()
}
```

### Mark as Read

```typescript
async function markChannelRead(channelId: string) {
  await fetch(`${API_URL}/api/team/channels/${channelId}/read`, {
    method: 'PATCH',
    headers: await getAuthHeaders()
  })
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/012_create_messaging_tables.sql` | Main messaging schema |
| `supabase/migrations/020_add_dm_policies.sql` | DM RLS policies |
| `apps/finance/src/app/api/team/channels/route.ts` | Channels API |
| `apps/finance/src/app/api/team/dm/route.ts` | DM API |
| `apps/finance/src/app/api/team/messages/route.ts` | Messages API |
| `apps/finance/src/hooks/use-team-messages.ts` | React hook with caching |
