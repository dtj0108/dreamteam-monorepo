# Team Module Documentation

This document provides comprehensive documentation for building the Team/Messaging workspace in the mobile app.

## Overview

The Team workspace is a Slack-like messaging platform with channels, direct messages, threaded conversations, and AI agents. It enables real-time team communication within a workspace.

### Core Features

| Feature | Description |
|---------|-------------|
| Channels | Public/private group conversations |
| Direct Messages | 1-on-1 private conversations |
| Threads | Reply threads on any message |
| Reactions | Emoji reactions on messages |
| Mentions | @user and @channel mentions |
| AI Agents | AI-powered chat assistants |
| Search | Full-text message search |
| Presence | Online/away/offline status |

---

## Routes & Screens

```
/team
├── / .......................... Default channel (redirects to general)
├── /channels .................. Channel list
├── /channels/[id] ............. Channel conversation view
├── /dm ........................ Direct messages list
├── /dm/[id] ................... DM conversation view
├── /messages .................. All messages (unified inbox)
├── /mentions .................. @Mentions view
├── /agents .................... AI agents list
├── /agents/[id] ............... AI agent chat
└── /search .................... Message search
```

### Screen Descriptions

| Route | Screen | Purpose |
|-------|--------|---------|
| `/team` | Default View | Redirects to #general channel or last viewed |
| `/team/channels` | Channel Browser | List all channels, create new, join/leave |
| `/team/channels/[id]` | Channel View | Message list, input, thread panel |
| `/team/dm` | DM List | All direct message conversations |
| `/team/dm/[id]` | DM View | 1-on-1 conversation |
| `/team/messages` | Unified Inbox | All messages across channels/DMs |
| `/team/mentions` | Mentions | Messages where user is @mentioned |
| `/team/agents` | AI Agents | List of available AI assistants |
| `/team/agents/[id]` | Agent Chat | Conversation with AI agent |
| `/team/search` | Search | Full-text search across messages |

---

## API Endpoints

### Workspace

#### Get Workspace Details
```
GET /api/workspace
```

**Response:**
```json
{
  "id": "ws_123",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logoUrl": "https://...",
  "createdAt": "2024-01-15T10:00:00Z",
  "settings": {
    "defaultChannel": "ch_general",
    "allowExternalInvites": true
  }
}
```

#### Get Workspace Members
```
GET /api/workspace/members
```

**Response:**
```json
{
  "members": [
    {
      "id": "mem_123",
      "userId": "user_456",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://...",
      "role": "admin",
      "status": "online",
      "statusMessage": "In meetings today",
      "joinedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### Channels

#### List Channels
```
GET /api/channels
GET /api/channels?type=public
GET /api/channels?type=private
GET /api/channels?joined=true
```

**Response:**
```json
{
  "channels": [
    {
      "id": "ch_123",
      "name": "general",
      "description": "General discussion",
      "type": "public",
      "isStarred": true,
      "isMuted": false,
      "memberCount": 45,
      "unreadCount": 3,
      "lastMessageAt": "2024-01-20T14:30:00Z",
      "createdAt": "2024-01-15T10:00:00Z",
      "createdBy": "user_456"
    }
  ]
}
```

#### Get Channel
```
GET /api/channels/[id]
```

**Response:**
```json
{
  "id": "ch_123",
  "name": "general",
  "description": "General discussion for all team members",
  "type": "public",
  "topic": "Welcome to the team!",
  "isStarred": false,
  "isMuted": false,
  "memberCount": 45,
  "members": [
    {
      "userId": "user_456",
      "name": "John Doe",
      "avatarUrl": "https://...",
      "role": "admin",
      "joinedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "createdBy": "user_456"
}
```

#### Create Channel
```
POST /api/channels
```

**Request:**
```json
{
  "name": "engineering",
  "description": "Engineering team discussions",
  "type": "public",
  "memberIds": ["user_456", "user_789"]
}
```

#### Update Channel
```
PATCH /api/channels/[id]
```

**Request:**
```json
{
  "name": "dev-team",
  "description": "Updated description",
  "topic": "Sprint 42 in progress"
}
```

#### Delete Channel
```
DELETE /api/channels/[id]
```

#### Join Channel
```
POST /api/channels/[id]/join
```

#### Leave Channel
```
POST /api/channels/[id]/leave
```

#### Star/Unstar Channel
```
POST /api/channels/[id]/star
DELETE /api/channels/[id]/star
```

#### Mute/Unmute Channel
```
POST /api/channels/[id]/mute
DELETE /api/channels/[id]/mute
```

#### Get Channel Members
```
GET /api/channels/[id]/members
```

#### Add Channel Member
```
POST /api/channels/[id]/members
```

**Request:**
```json
{
  "userId": "user_789"
}
```

#### Remove Channel Member
```
DELETE /api/channels/[id]/members/[userId]
```

---

### Messages

#### List Messages
```
GET /api/channels/[id]/messages
GET /api/channels/[id]/messages?limit=50
GET /api/channels/[id]/messages?before=msg_123
GET /api/channels/[id]/messages?after=msg_456
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "content": "Hello team! Here's the update...",
      "contentHtml": "<p>Hello team! Here's the update...</p>",
      "type": "text",
      "channelId": "ch_123",
      "userId": "user_456",
      "user": {
        "id": "user_456",
        "name": "John Doe",
        "avatarUrl": "https://..."
      },
      "threadId": null,
      "replyCount": 5,
      "reactions": [
        {
          "emoji": "👍",
          "count": 3,
          "users": ["user_456", "user_789", "user_101"]
        }
      ],
      "attachments": [
        {
          "id": "att_123",
          "type": "image",
          "url": "https://...",
          "name": "screenshot.png",
          "size": 102400
        }
      ],
      "mentions": ["user_789"],
      "isEdited": false,
      "isPinned": false,
      "createdAt": "2024-01-20T14:30:00Z",
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  ],
  "hasMore": true,
  "nextCursor": "msg_122"
}
```

#### Send Message
```
POST /api/channels/[id]/messages
```

**Request:**
```json
{
  "content": "Hello team!",
  "attachments": [
    {
      "type": "image",
      "url": "https://..."
    }
  ],
  "mentions": ["user_789"]
}
```

#### Get Message
```
GET /api/messages/[id]
```

#### Update Message
```
PATCH /api/messages/[id]
```

**Request:**
```json
{
  "content": "Updated message content"
}
```

#### Delete Message
```
DELETE /api/messages/[id]
```

#### Pin Message
```
POST /api/messages/[id]/pin
DELETE /api/messages/[id]/pin
```

---

### Threads

#### Get Thread Messages
```
GET /api/messages/[id]/thread
GET /api/messages/[id]/thread?limit=50
```

**Response:**
```json
{
  "parentMessage": {
    "id": "msg_123",
    "content": "Original message...",
    "user": { ... },
    "replyCount": 5,
    "createdAt": "2024-01-20T14:30:00Z"
  },
  "replies": [
    {
      "id": "msg_124",
      "content": "Reply to thread...",
      "threadId": "msg_123",
      "user": { ... },
      "createdAt": "2024-01-20T14:35:00Z"
    }
  ],
  "hasMore": false
}
```

#### Reply to Thread
```
POST /api/messages/[id]/thread
```

**Request:**
```json
{
  "content": "This is a thread reply"
}
```

---

### Reactions

#### Add Reaction
```
POST /api/messages/[id]/reactions
```

**Request:**
```json
{
  "emoji": "👍"
}
```

#### Remove Reaction
```
DELETE /api/messages/[id]/reactions/[emoji]
```

#### Get Reactions
```
GET /api/messages/[id]/reactions
```

**Response:**
```json
{
  "reactions": [
    {
      "emoji": "👍",
      "count": 3,
      "users": [
        {
          "id": "user_456",
          "name": "John Doe"
        }
      ]
    }
  ]
}
```

---

### Direct Messages

#### List DM Conversations
```
GET /api/dm
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "dm_123",
      "participant": {
        "id": "user_789",
        "name": "Jane Smith",
        "avatarUrl": "https://...",
        "status": "online"
      },
      "lastMessage": {
        "id": "msg_999",
        "content": "Sounds good!",
        "createdAt": "2024-01-20T15:00:00Z"
      },
      "unreadCount": 2,
      "isMuted": false
    }
  ]
}
```

#### Get DM Conversation
```
GET /api/dm/[id]
```

**Response:**
```json
{
  "id": "dm_123",
  "participant": {
    "id": "user_789",
    "name": "Jane Smith",
    "avatarUrl": "https://...",
    "status": "online",
    "statusMessage": "Working from home"
  },
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Start DM Conversation
```
POST /api/dm
```

**Request:**
```json
{
  "userId": "user_789"
}
```

**Response:**
```json
{
  "id": "dm_123",
  "participant": { ... },
  "isNew": true
}
```

#### List DM Messages
```
GET /api/dm/[id]/messages
GET /api/dm/[id]/messages?limit=50
GET /api/dm/[id]/messages?before=msg_123
```

**Response:** Same format as channel messages

#### Send DM Message
```
POST /api/dm/[id]/messages
```

**Request:**
```json
{
  "content": "Hey, quick question..."
}
```

---

### Presence & Status

#### Update Presence
```
POST /api/presence
```

**Request:**
```json
{
  "status": "online",
  "statusMessage": "In meetings today",
  "statusEmoji": "📅",
  "statusExpiry": "2024-01-20T18:00:00Z"
}
```

**Status values:** `online`, `away`, `dnd` (do not disturb), `offline`

#### Get User Presence
```
GET /api/users/[id]/presence
```

**Response:**
```json
{
  "userId": "user_456",
  "status": "online",
  "statusMessage": "In meetings today",
  "statusEmoji": "📅",
  "lastSeenAt": "2024-01-20T15:30:00Z"
}
```

---

### Typing Indicators

#### Send Typing Indicator
```
POST /api/channels/[id]/typing
POST /api/dm/[id]/typing
```

*No request body needed. Typing status expires after 5 seconds.*

---

### Mentions

#### Get My Mentions
```
GET /api/mentions
GET /api/mentions?unread=true
```

**Response:**
```json
{
  "mentions": [
    {
      "id": "mention_123",
      "message": {
        "id": "msg_456",
        "content": "Hey @john can you review this?",
        "channel": {
          "id": "ch_123",
          "name": "engineering"
        },
        "user": {
          "id": "user_789",
          "name": "Jane Smith"
        },
        "createdAt": "2024-01-20T14:30:00Z"
      },
      "isRead": false,
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ]
}
```

#### Mark Mention as Read
```
POST /api/mentions/[id]/read
```

#### Mark All Mentions as Read
```
POST /api/mentions/read-all
```

---

### Search

#### Search Messages
```
GET /api/search/messages?q=keyword
GET /api/search/messages?q=keyword&channel=ch_123
GET /api/search/messages?q=keyword&from=user_456
GET /api/search/messages?q=keyword&after=2024-01-01
GET /api/search/messages?q=keyword&before=2024-01-20
```

**Response:**
```json
{
  "results": [
    {
      "message": {
        "id": "msg_123",
        "content": "...keyword match...",
        "highlightedContent": "...{keyword} match...",
        "channel": {
          "id": "ch_123",
          "name": "general"
        },
        "user": {
          "id": "user_456",
          "name": "John Doe"
        },
        "createdAt": "2024-01-20T14:30:00Z"
      },
      "score": 0.95
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

### AI Agents

#### List Agents
```
GET /api/agents
```

**Response:**
```json
{
  "agents": [
    {
      "id": "agent_123",
      "name": "Budget Assistant",
      "description": "Helps with financial questions and budget tracking",
      "avatarUrl": "https://...",
      "emoji": "💰",
      "isEnabled": true,
      "capabilities": ["finance", "budgets", "transactions"],
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Get Agent
```
GET /api/agents/[id]
```

#### Chat with Agent
```
POST /api/agents/[id]/chat
```

**Request:**
```json
{
  "message": "What's my budget status for this month?",
  "conversationId": "conv_123"
}
```

**Response:** Streamed via SSE (Server-Sent Events)

```
event: message
data: {"type": "text", "content": "Let me check your budget..."}

event: tool_call
data: {"type": "tool_call", "name": "get_budgets", "args": {"month": "2024-01"}}

event: tool_result
data: {"type": "tool_result", "name": "get_budgets", "result": {...}}

event: message
data: {"type": "text", "content": "Your January budget shows..."}

event: done
data: {}
```

#### Get Agent Conversation History
```
GET /api/agents/[id]/conversations/[conversationId]
```

---

### File Uploads

#### Upload Attachment
```
POST /api/uploads
Content-Type: multipart/form-data
```

**Request:**
- `file`: File to upload
- `type`: `image`, `document`, `video`, `audio`

**Response:**
```json
{
  "id": "upload_123",
  "url": "https://...",
  "type": "image",
  "name": "screenshot.png",
  "size": 102400,
  "mimeType": "image/png",
  "dimensions": {
    "width": 1920,
    "height": 1080
  }
}
```

---

## Data Models

### Channel

```typescript
interface Channel {
  id: string
  workspaceId: string
  name: string                    // lowercase, no spaces
  description: string | null
  topic: string | null            // current topic/purpose
  type: "public" | "private"
  isArchived: boolean
  isDefault: boolean              // #general is typically default
  memberCount: number
  createdBy: string               // userId
  createdAt: string
  updatedAt: string
}

interface ChannelMembership {
  channelId: string
  userId: string
  role: "admin" | "member"
  isStarred: boolean
  isMuted: boolean
  lastReadAt: string              // for unread tracking
  joinedAt: string
}
```

### Message

```typescript
interface Message {
  id: string
  channelId: string | null        // null for DMs
  dmId: string | null             // null for channel messages
  userId: string
  content: string                 // raw text/markdown
  contentHtml: string | null      // rendered HTML
  type: "text" | "system" | "file"
  threadId: string | null         // parent message ID if reply
  replyCount: number
  reactions: Reaction[]
  attachments: Attachment[]
  mentions: string[]              // array of userIds
  isEdited: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface Attachment {
  id: string
  type: "image" | "document" | "video" | "audio" | "file"
  url: string
  name: string
  size: number                    // bytes
  mimeType: string
  dimensions?: {
    width: number
    height: number
  }
  thumbnail?: string
}
```

### Reaction

```typescript
interface Reaction {
  emoji: string                   // emoji character or custom :name:
  count: number
  users: string[]                 // userIds who reacted
  includesMe: boolean
}
```

### Direct Message

```typescript
interface DirectMessageConversation {
  id: string
  workspaceId: string
  participantIds: [string, string]   // exactly 2 user IDs
  lastMessageAt: string | null
  createdAt: string
}

interface DirectMessageMembership {
  dmId: string
  userId: string
  isMuted: boolean
  lastReadAt: string
}
```

### Presence

```typescript
interface UserPresence {
  userId: string
  status: "online" | "away" | "dnd" | "offline"
  statusMessage: string | null
  statusEmoji: string | null
  statusExpiry: string | null     // when custom status expires
  lastSeenAt: string
  updatedAt: string
}
```

### Member

```typescript
interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: "owner" | "admin" | "member"
  displayName: string | null      // workspace-specific display name
  title: string | null            // job title
  timezone: string | null
  joinedAt: string
  invitedBy: string | null

  user: {
    id: string
    name: string
    email: string
    phone: string | null
    avatarUrl: string | null
  }

  presence: UserPresence
}
```

### Agent

```typescript
interface Agent {
  id: string
  workspaceId: string
  name: string
  description: string
  avatarUrl: string | null
  emoji: string
  systemPrompt: string
  model: string                   // "claude-3-sonnet", etc.
  capabilities: string[]          // feature tags
  tools: AgentTool[]
  isEnabled: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface AgentTool {
  name: string
  description: string
  parameters: object              // JSON Schema
}

interface AgentConversation {
  id: string
  agentId: string
  userId: string
  title: string | null
  messages: AgentMessage[]
  createdAt: string
  updatedAt: string
}

interface AgentMessage {
  role: "user" | "assistant" | "tool"
  content: string
  toolCalls?: object[]
  toolResults?: object[]
  createdAt: string
}
```

---

## Features by Screen

### Channels List (`/team/channels`)

**Features:**
- List all channels user has access to
- Filter: All, Joined, Starred, Archived
- Search channels by name
- Create new channel button
- Unread badge count per channel
- Last message preview

**UI Elements:**
- Search input at top
- Filter tabs/chips
- Channel list with:
  - Channel icon (# for public, lock for private)
  - Channel name
  - Description snippet
  - Member count
  - Unread badge
- Floating action button for create

### Channel View (`/team/channels/[id]`)

**Features:**
- Message list (infinite scroll, load more on scroll up)
- Message composer with:
  - Text input with markdown support
  - Emoji picker
  - File attachment
  - @ mentions autocomplete
  - Send button
- Message actions (long press or hover):
  - Reply in thread
  - Add reaction
  - Edit (own messages)
  - Delete (own messages)
  - Pin message
  - Copy text
- Channel header with:
  - Channel name
  - Member count (tap to see members)
  - Star toggle
  - Mute toggle
  - Settings (admins)
- Thread panel (slide-in from right)

**Message Types:**
- Text messages with markdown
- File attachments (images, documents)
- System messages (joins, leaves, topic changes)
- Messages with thread replies

### Thread Panel

**Features:**
- Shows parent message at top
- List of thread replies below
- Reply composer at bottom
- Close button to return to main channel
- Real-time updates

### Direct Messages List (`/team/dm`)

**Features:**
- List all DM conversations
- Search users to start new DM
- Presence indicator (online dot)
- Last message preview
- Unread badge
- Timestamp of last message

### DM View (`/team/dm/[id]`)

**Features:**
- Same as channel view but for 1-on-1
- User header with:
  - Avatar
  - Name
  - Presence status
  - Status message if set

### Mentions (`/team/mentions`)

**Features:**
- List of all messages where user is @mentioned
- Filter: All, Unread
- Mark as read action
- Mark all as read button
- Navigate to original message context

### AI Agents (`/team/agents`)

**Features:**
- List of available AI agents
- Agent cards with:
  - Avatar/emoji
  - Name
  - Description
  - Capabilities tags
- Start conversation button

### Agent Chat (`/team/agents/[id]`)

**Features:**
- Chat-style interface
- Message history
- Typing indicator while AI responds
- Tool call visualizations
- Suggested prompts/actions
- New conversation button

### Search (`/team/search`)

**Features:**
- Full-text search input
- Filter by:
  - Channel
  - From user
  - Date range
  - Has: attachments, links, reactions
- Search results with:
  - Message snippet with highlights
  - Channel/DM context
  - Timestamp
  - Jump to message action

---

## Real-time Features

### Supabase Realtime Subscriptions

```typescript
// Subscribe to channel messages
const channel = supabase
  .channel(`channel:${channelId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        // Add new message to list
      } else if (payload.eventType === 'UPDATE') {
        // Update existing message (edit, reaction)
      } else if (payload.eventType === 'DELETE') {
        // Remove message from list
      }
    }
  )
  .subscribe()
```

### Typing Indicators

**Implementation:**
- Send typing event when user starts typing
- Expire after 5 seconds of inactivity
- Show "User is typing..." indicator
- Multiple users: "John, Jane are typing..."

```typescript
// Broadcast channel for typing
const typingChannel = supabase
  .channel(`typing:${channelId}`)
  .on('broadcast', { event: 'typing' }, (payload) => {
    // Update typing indicators UI
    // payload: { userId, userName }
  })
  .subscribe()

// Send typing event
typingChannel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId, userName }
})
```

### Presence Sync

```typescript
// Track online presence
const presenceChannel = supabase
  .channel('presence')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState()
    // Update online users list
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    // User came online
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    // User went offline
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        online_at: new Date().toISOString(),
        user_id: currentUserId
      })
    }
  })
```

### Message Read Receipts

- Track last read message per channel/DM
- Update on scroll to bottom
- Calculate unread count from last read

---

## Components Reference

### MessageItem

Renders a single message in the list.

```typescript
interface MessageItemProps {
  message: Message
  isOwn: boolean                  // current user's message
  showAvatar: boolean             // hide if consecutive from same user
  showTimestamp: boolean          // show full timestamp or relative
  isThreadParent: boolean         // message that has replies
  isInThread: boolean             // message inside thread panel
  onReply: () => void
  onReact: (emoji: string) => void
  onEdit: () => void
  onDelete: () => void
  onPin: () => void
  onPress: () => void             // open thread or context
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│ [Avatar]  Name              12:30 PM    │
│           Message content goes here     │
│           and can span multiple lines   │
│                                         │
│           [📎 attachment.pdf]           │
│                                         │
│           [👍 3] [❤️ 2]  💬 5 replies   │
└─────────────────────────────────────────┘
```

### MessageList

Virtualized, infinite-scrolling message list.

```typescript
interface MessageListProps {
  channelId?: string
  dmId?: string
  threadId?: string               // for thread views
  onLoadMore: () => Promise<void>
  onMessagePress: (message: Message) => void
}
```

**Features:**
- Inverted list (newest at bottom)
- Load more on scroll to top
- Date separators
- New message indicator
- Scroll to bottom button
- Maintain scroll position on new messages

### MessageInput

Composer for sending messages.

```typescript
interface MessageInputProps {
  channelId?: string
  dmId?: string
  threadId?: string
  placeholder: string
  onSend: (content: string, attachments: Attachment[]) => Promise<void>
  onTyping: () => void
  disabled?: boolean
}
```

**Features:**
- Multi-line text input
- Emoji picker button
- Attachment button
- @ mention autocomplete
- Send button (enabled when content present)
- Character count (optional)

### EmojiPicker

Emoji selection popover.

```typescript
interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  recentEmojis?: string[]
}
```

**Categories:**
- Recent
- Smileys & People
- Animals & Nature
- Food & Drink
- Activities
- Travel & Places
- Objects
- Symbols
- Flags

### ThreadPanel

Slide-in panel for thread conversations.

```typescript
interface ThreadPanelProps {
  parentMessage: Message
  isOpen: boolean
  onClose: () => void
}
```

**Layout:**
```
┌─────────────────────────┐
│ Thread        [X Close] │
├─────────────────────────┤
│ [Parent Message]        │
│ ───────────────────     │
│ [Reply 1]               │
│ [Reply 2]               │
│ [Reply 3]               │
│                         │
├─────────────────────────┤
│ [Reply Input...]   Send │
└─────────────────────────┘
```

### ChannelHeader

Header bar for channel view.

```typescript
interface ChannelHeaderProps {
  channel: Channel
  memberCount: number
  onMembersPress: () => void
  onSettingsPress: () => void
  onStarToggle: () => void
  onMuteToggle: () => void
}
```

### TeamSidebar (Web)

Secondary sidebar showing channels and DMs.

```typescript
interface TeamSidebarProps {
  channels: Channel[]
  dms: DirectMessageConversation[]
  agents: Agent[]
  currentChannelId?: string
  currentDmId?: string
  currentAgentId?: string
}
```

**Sections:**
- Channels (collapsible)
  - Starred channels first
  - Public channels
  - Private channels
- Direct Messages (collapsible)
  - With presence indicators
- AI Agents (collapsible)

### MentionInput

Text input with @ mention support.

```typescript
interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  members: WorkspaceMember[]
  channels: Channel[]
  onMentionSelect: (mention: MentionItem) => void
}

interface MentionItem {
  type: "user" | "channel"
  id: string
  name: string
}
```

### PresenceIndicator

Online status dot.

```typescript
interface PresenceIndicatorProps {
  status: "online" | "away" | "dnd" | "offline"
  size?: "sm" | "md" | "lg"
}
```

**Colors:**
- Online: Green
- Away: Yellow
- DND: Red
- Offline: Gray

---

## Mobile Adaptation Guide

### Chat UI Patterns

**Message List:**
- Use `FlatList` with `inverted={true}` for chat order
- Implement `onEndReached` for pagination (loading older messages)
- Use `getItemLayout` for better scroll performance
- Maintain scroll position when new messages arrive

**Message Input:**
- Use `KeyboardAvoidingView` to handle keyboard
- Consider `react-native-keyboard-aware-scroll-view`
- Auto-grow text input up to max height
- Show/hide attachment options on focus

**Thread Panel:**
- Use bottom sheet or full-screen modal
- Native gesture to dismiss

### Real-time Implementation

**Supabase Realtime in React Native:**
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
})
```

**Background Handling:**
- Unsubscribe from realtime when app backgrounds
- Resubscribe and sync on foreground
- Use `AppState` API to detect state changes

### Push Notifications

**When to send:**
- New message in channel (if not muted)
- New DM message
- @mention
- Reply to your message

**Notification payload:**
```json
{
  "title": "#general - John Doe",
  "body": "Hey team, check this out!",
  "data": {
    "type": "channel_message",
    "channelId": "ch_123",
    "messageId": "msg_456"
  }
}
```

**Deep linking:**
- Parse notification data
- Navigate to correct screen
- Scroll to specific message

### Offline Support

**Cache Strategy:**
- Cache recent messages per channel (last 100)
- Cache channel list
- Cache DM conversations
- Queue outgoing messages

**Sync on Reconnect:**
- Fetch messages since last sync
- Send queued messages
- Update presence

### Performance Tips

1. **Message Rendering:**
   - Memoize message components
   - Use `React.memo` with proper comparison
   - Avoid inline functions in list items

2. **Image Handling:**
   - Use thumbnail URLs for message list
   - Lazy load full images on tap
   - Cache images with `expo-image`

3. **Typing Indicators:**
   - Debounce typing events (300ms)
   - Don't persist to database
   - Use broadcast channels only

### Navigation Structure

```typescript
// Using Expo Router
app/
├── (main)/
│   └── team/
│       ├── _layout.tsx          // Tab navigator or stack
│       ├── index.tsx            // Redirect to channels
│       ├── channels/
│       │   ├── index.tsx        // Channel list
│       │   └── [id].tsx         // Channel view
│       ├── dm/
│       │   ├── index.tsx        // DM list
│       │   └── [id].tsx         // DM view
│       ├── mentions.tsx         // Mentions list
│       ├── agents/
│       │   ├── index.tsx        // Agent list
│       │   └── [id].tsx         // Agent chat
│       └── search.tsx           // Search
```

---

## Emoji Reactions Reference

### Frequently Used

```
👍 👎 ❤️ 😂 🎉 🔥 👀 ✅ 💯 🙌
```

### Quick Reaction Bar

Show 6 most-used emojis for quick access:

```
[👍] [❤️] [😂] [🎉] [🔥] [+]
                         ↳ Opens full picker
```

### Reaction Display

- Show up to 6 unique reactions inline
- "+N more" for additional
- Tap reaction to see who reacted
- Tap own reaction to toggle off

---

## Key Files Reference (Web)

| File | Purpose |
|------|---------|
| `app/team/layout.tsx` | Team workspace layout with sidebar |
| `app/team/page.tsx` | Default redirect |
| `app/team/channels/page.tsx` | Channel browser |
| `app/team/channels/[id]/page.tsx` | Channel view |
| `app/team/dm/page.tsx` | DM list |
| `app/team/dm/[id]/page.tsx` | DM view |
| `app/team/mentions/page.tsx` | Mentions view |
| `app/team/agents/page.tsx` | AI agents list |
| `app/team/agents/[id]/page.tsx` | Agent chat |
| `app/team/search/page.tsx` | Search page |
| `components/team/team-sidebar.tsx` | Secondary sidebar |
| `components/team/message-list.tsx` | Message list component |
| `components/team/message-item.tsx` | Single message |
| `components/team/message-input.tsx` | Composer |
| `components/team/thread-panel.tsx` | Thread slide-in |
| `components/team/channel-header.tsx` | Channel header |
| `components/team/emoji-picker.tsx` | Emoji selector |
| `providers/team-provider.tsx` | Team context & state |
| `lib/realtime.ts` | Supabase realtime helpers |
