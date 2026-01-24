# Nylas Email & Calendar Integration

This document describes the complete Nylas integration for email and calendar functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [OAuth Flow](#oauth-flow)
4. [API Routes](#api-routes)
5. [Core Library](#core-library-libnylasts)
6. [Database Schema](#database-schema)
7. [Frontend Components](#frontend-components)
8. [State Management](#state-management-providers)
9. [Security](#security)
10. [Configuration](#configuration)

---

## Overview

The Nylas integration provides:
- **Email**: Read, send, reply, forward, search emails from Google and Microsoft accounts
- **Calendar**: View, create, update, delete calendar events
- **Unified Inbox**: Single interface for all connected accounts

### Supported Providers
- Google (Gmail + Google Calendar)
- Microsoft (Outlook/Exchange + Microsoft Calendar)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  InboxProvider          │  CalendarProvider                     │
│  - grants               │  - calendars                          │
│  - emails               │  - events                             │
│  - selectedEmail        │  - dateRange                          │
├─────────────────────────────────────────────────────────────────┤
│                      Components                                  │
│  MailSidebar │ MailList │ MailDisplay │ ComposeDialog           │
│  CalendarView │ EventDialog │ ConnectButtons                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes                                  │
│  /api/nylas/auth      - OAuth initiation                        │
│  /api/nylas/callback  - OAuth callback                          │
│  /api/nylas/grants    - Account management                      │
│  /api/nylas/emails/*  - Email operations                        │
│  /api/nylas/calendars - Calendar listing                        │
│  /api/nylas/events    - Event operations                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    lib/nylas.ts                                  │
│  - generateAuthUrl()    - OAuth URL generation                  │
│  - exchangeCodeForToken() - Token exchange                      │
│  - listEmails()         - Fetch emails                          │
│  - sendEmail()          - Send emails                           │
│  - listEvents()         - Fetch calendar events                 │
│  - createEvent()        - Create calendar events                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nylas API                                   │
│                  https://api.us.nylas.com                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## OAuth Flow

### Step-by-Step Process

1. **User clicks "Connect Google/Microsoft"**
   - Component: `GoogleSignInButton` or `MicrosoftSignInButton`
   - Request: `POST /api/nylas/auth { provider: 'google' | 'microsoft' }`

2. **Server generates OAuth URL**
   - Creates state: `{ userId, workspaceId, provider, timestamp }`
   - Encodes as base64url
   - Returns Nylas OAuth URL with scopes

3. **User authenticates with provider**
   - Redirected to Google/Microsoft login
   - Approves requested permissions

4. **Nylas callback**
   - Redirect: `/api/nylas/callback?code=...&state=...`
   - Server validates state (user, workspace, expiration)
   - Exchanges code for access token via `exchangeCodeForToken()`

5. **Grant stored in database**
   - Creates/updates `nylas_grants` record
   - Encrypts access token (AES-256-GCM)
   - Initializes sync cursors

6. **Success redirect**
   - Redirect: `/sales/inbox?success=nylas_connected`
   - Frontend refreshes grants list

### OAuth Scopes

**Google:**
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar
```

**Microsoft:**
```
Mail.Read Mail.Send Calendars.ReadWrite
```

---

## API Routes

### Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/nylas/auth` | POST | Generate OAuth URL |
| `/api/nylas/callback` | GET | Handle OAuth callback |

### Grants (Connected Accounts)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/nylas/grants` | GET | List all connected accounts |
| `/api/nylas/grants/[id]` | GET | Get account details |
| `/api/nylas/grants/[id]` | DELETE | Disconnect account |

### Emails

| Route | Method | Description |
|-------|--------|-------------|
| `/api/nylas/emails` | GET | List emails |
| `/api/nylas/emails/[id]` | GET | Get email with body |
| `/api/nylas/emails/[id]` | PATCH | Update email (read/star) |
| `/api/nylas/emails/send` | POST | Send email |
| `/api/nylas/emails/search` | GET | Search emails |

**Query Parameters for GET /emails:**
- `grantId` (required) - Internal grant UUID
- `folder` - Folder name (inbox, sent, etc.)
- `unread` - Filter by unread status
- `limit` - Results per page (1-50, default 25)
- `pageToken` - Pagination cursor

**Body for POST /emails/send:**
```json
{
  "grantId": "uuid",
  "to": [{ "email": "...", "name": "..." }],
  "cc": [],
  "bcc": [],
  "subject": "...",
  "body": "<html>...</html>",
  "replyToMessageId": "optional-for-threading"
}
```

### Calendar

| Route | Method | Description |
|-------|--------|-------------|
| `/api/nylas/calendars` | GET | List calendars |
| `/api/nylas/events` | GET | List events |
| `/api/nylas/events` | POST | Create event |
| `/api/nylas/events/[id]` | GET | Get event |
| `/api/nylas/events/[id]` | PATCH | Update event |
| `/api/nylas/events/[id]` | DELETE | Delete event |

---

## Core Library (lib/nylas.ts)

### Configuration

```typescript
const NYLAS_CLIENT_ID = process.env.NYLAS_CLIENT_ID
const NYLAS_API_KEY = process.env.NYLAS_API_KEY
const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com'
const NYLAS_REDIRECT_URI = process.env.NYLAS_REDIRECT_URI
const NYLAS_WEBHOOK_SECRET = process.env.NYLAS_WEBHOOK_SECRET
```

### OAuth Functions

```typescript
// Generate OAuth URL
generateAuthUrl(
  userId: string,
  workspaceId: string,
  provider: 'google' | 'microsoft',
  scopes?: string[]
): NylasResult<AuthUrlData>

// Parse OAuth state
parseOAuthState(state: string): {
  valid: boolean
  userId?: string
  workspaceId?: string
  provider?: 'google' | 'microsoft'
  error?: string
}

// Exchange code for token
exchangeCodeForToken(code: string): NylasResult<TokenExchangeData>
```

### Email Functions

```typescript
// List emails
listEmails(grantId: string, options?: {
  limit?: number
  pageToken?: string
  unread?: boolean
  in?: string
}): NylasResult<{ emails: NylasEmail[], nextCursor?: string }>

// Get single email
getEmail(grantId: string, messageId: string): NylasResult<NylasEmailDetail>

// Update email
updateEmail(grantId: string, messageId: string, updates: {
  unread?: boolean
  starred?: boolean
  folders?: string[]
}): NylasResult<void>

// Send email
sendEmail(grantId: string, email: {
  to: Array<{ email: string; name?: string }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject: string
  body: string
  replyToMessageId?: string
}): NylasResult<{ id: string }>

// Search emails
searchEmails(grantId: string, query: string, options?: {
  limit?: number
}): NylasResult<{ emails: NylasEmail[] }>
```

### Calendar Functions

```typescript
// List calendars
listCalendars(grantId: string): NylasResult<NylasCalendar[]>

// List events
listEvents(grantId: string, calendarId: string, options?: {
  startTime?: number  // Unix timestamp
  endTime?: number
  limit?: number
  pageToken?: string
}): NylasResult<{ events: NylasCalendarEvent[], nextCursor?: string }>

// Create event
createEvent(grantId: string, calendarId: string, event: {
  title: string
  description?: string
  location?: string
  when: { startTime: number; endTime: number }
  participants?: Array<{ email: string; name?: string }>
}): NylasResult<NylasCalendarEvent>

// Update event
updateEvent(grantId: string, calendarId: string, eventId: string,
  updates: Partial<CreateEventInput>
): NylasResult<NylasCalendarEvent>

// Delete event
deleteEvent(grantId: string, calendarId: string, eventId: string): NylasResult<void>
```

---

## Database Schema

### nylas_grants

Stores connected email/calendar accounts.

```sql
CREATE TABLE nylas_grants (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id               TEXT NOT NULL UNIQUE,  -- Nylas grant ID
  encrypted_access_token TEXT NOT NULL,         -- AES-256-GCM encrypted
  provider               TEXT NOT NULL,         -- 'google' | 'microsoft'
  email                  TEXT NOT NULL,         -- Connected email address
  scopes                 TEXT[] NOT NULL,       -- Granted OAuth scopes
  status                 TEXT DEFAULT 'active', -- 'active' | 'error' | 'expired'
  error_code             TEXT,                  -- Last Nylas error code
  error_message          TEXT,                  -- Last error message
  last_sync_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nylas_grants_workspace ON nylas_grants(workspace_id);
CREATE INDEX idx_nylas_grants_user ON nylas_grants(user_id);
CREATE INDEX idx_nylas_grants_email ON nylas_grants(email);
CREATE INDEX idx_nylas_grants_status ON nylas_grants(status);
```

### nylas_sync_cursors

Tracks sync state for incremental updates.

```sql
CREATE TABLE nylas_sync_cursors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nylas_grant_id UUID REFERENCES nylas_grants(id) ON DELETE CASCADE,
  resource_type  TEXT NOT NULL,  -- 'email' | 'calendar'
  cursor         TEXT,           -- Sync cursor for delta updates
  last_sync_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nylas_grant_id, resource_type)
);
```

---

## Frontend Components

### Location: `src/components/mail/`

| Component | Purpose |
|-----------|---------|
| `mail-sidebar.tsx` | Account selector, folder navigation, compose button |
| `mail-list.tsx` | Email list with sender, subject, date, unread indicator |
| `mail-display.tsx` | Email body, headers, action buttons |
| `compose-dialog.tsx` | Modal for composing/replying/forwarding emails |
| `email-editor.tsx` | TipTap WYSIWYG editor with formatting toolbar |
| `calls-list.tsx` | Call history list |
| `calls-display.tsx` | Call details with recording player |
| `texts-list.tsx` | SMS conversation threads |
| `texts-display.tsx` | SMS conversation with send input |

### Location: `src/components/nylas/`

| Component | Purpose |
|-----------|---------|
| `nylas-connect-button.tsx` | OAuth connect buttons (Google/Microsoft branded) |
| `connected-email-accounts.tsx` | Account management UI (list, disconnect) |

### Location: `src/components/calendar/`

| Component | Purpose |
|-----------|---------|
| `calendar-view.tsx` | Month/Week/Day calendar views |
| `event-dialog.tsx` | Create/edit calendar events |

---

## State Management (Providers)

### InboxProvider (`src/providers/inbox-provider.tsx`)

Manages email state for the inbox page.

**State:**
```typescript
{
  grants: NylasGrant[]           // Connected accounts
  selectedGrantId: string | null // Currently selected account
  folder: string                 // Current folder (inbox, calls, texts)
  emails: MailItem[]             // Email list
  selectedEmail: MailDetail      // Currently viewed email
  searchQuery: string            // Active search
  loading: boolean
  error: string | null
}
```

**Methods:**
- `fetchGrants()` - Load connected accounts
- `fetchEmails()` - Load emails for selected account/folder
- `selectEmail()` - Select and load email detail (auto-marks as read)
- `searchEmails()` - Search emails
- `toggleStar()` - Star/unstar email
- `toggleRead()` - Mark read/unread

### CalendarProvider (`src/providers/calendar-provider.tsx`)

Manages calendar state for the calendar page.

**State:**
```typescript
{
  grantId: string | null
  calendars: CalendarInfo[]
  selectedCalendarId: string | null
  events: CalendarEvent[]
  view: 'month' | 'week' | 'day'
  startDate: Date
  endDate: Date
  loading: boolean
  error: string | null
}
```

**Methods:**
- `fetchCalendars()` - Load calendars (auto-selects primary)
- `fetchEvents()` - Load events for date range
- `createEvent()` - Create new event
- `setDateRange()` - Change visible date range
- `setView()` - Switch between month/week/day

---

## Security

### Token Encryption
- Access tokens encrypted with AES-256-GCM before storage
- Uses `encryptToken()` and `decryptToken()` from `lib/encryption.ts`
- Tokens never exposed to client

### OAuth State Validation
- State contains userId + workspaceId + timestamp
- Expires after 1 hour
- Validates user hasn't changed during OAuth flow

### Row Level Security (RLS)
- All tables have RLS policies
- Grants accessible only by workspace members
- User ID verified for additional safety

### Workspace Isolation
- All queries filtered by `workspace_id`
- Cross-workspace access prevented at database level

### Webhook Verification
- HMAC-SHA256 signature verification
- Timing-safe comparison
- Secret from environment variable

---

## Configuration

### Required Environment Variables

```env
# Nylas API Credentials
NYLAS_CLIENT_ID=your_client_id
NYLAS_API_KEY=your_api_key

# OAuth Callback URL
NYLAS_REDIRECT_URI=https://your-domain.com/api/nylas/callback

# Optional: Webhook secret (for real-time updates)
NYLAS_WEBHOOK_SECRET=your_webhook_secret

# Optional: API region (defaults to US)
NYLAS_API_URI=https://api.us.nylas.com
```

### Nylas Dashboard Setup

1. Create application at [dashboard.nylas.com](https://dashboard.nylas.com)
2. Configure OAuth redirect URI
3. Enable Google and/or Microsoft connectors
4. Copy Client ID and API Key to environment

### Google Cloud Console Setup

1. Enable Gmail API and Google Calendar API
2. Configure OAuth consent screen
3. Add Nylas redirect URIs to authorized redirects

### Microsoft Azure Setup

1. Register application in Azure AD
2. Configure API permissions (Mail.Read, Mail.Send, Calendars.ReadWrite)
3. Add Nylas redirect URIs

---

## File Structure

```
apps/finance/src/
├── app/
│   ├── api/nylas/
│   │   ├── auth/route.ts           # OAuth initiation
│   │   ├── callback/route.ts       # OAuth callback
│   │   ├── grants/
│   │   │   ├── route.ts            # List grants
│   │   │   └── [id]/route.ts       # Get/delete grant
│   │   ├── emails/
│   │   │   ├── route.ts            # List emails
│   │   │   ├── [id]/route.ts       # Get/update email
│   │   │   ├── send/route.ts       # Send email
│   │   │   └── search/route.ts     # Search emails
│   │   ├── calendars/route.ts      # List calendars
│   │   └── events/
│   │       ├── route.ts            # List/create events
│   │       └── [id]/route.ts       # Get/update/delete event
│   └── sales/
│       ├── inbox/
│       │   ├── layout.tsx          # InboxProvider + ComposeContext
│       │   └── page.tsx            # Main inbox page
│       ├── calendar/
│       │   ├── layout.tsx          # CalendarProvider
│       │   └── page.tsx            # Calendar page
│       └── settings/
│           └── email/page.tsx      # Email settings
├── components/
│   ├── mail/
│   │   ├── mail-sidebar.tsx
│   │   ├── mail-list.tsx
│   │   ├── mail-display.tsx
│   │   ├── compose-dialog.tsx
│   │   ├── email-editor.tsx
│   │   ├── calls-list.tsx
│   │   ├── calls-display.tsx
│   │   ├── texts-list.tsx
│   │   └── texts-display.tsx
│   ├── nylas/
│   │   ├── nylas-connect-button.tsx
│   │   └── connected-email-accounts.tsx
│   └── calendar/
│       ├── calendar-view.tsx
│       └── event-dialog.tsx
├── providers/
│   ├── inbox-provider.tsx
│   └── calendar-provider.tsx
└── lib/
    └── nylas.ts                    # Core Nylas API wrapper
```

---

## Troubleshooting

### "Missing scope required to send email"
- OAuth scopes don't include send permission
- Solution: User must disconnect and reconnect account
- Scopes are set in `generateAuthUrl()` in `lib/nylas.ts`

### "Grant not found" or "Unauthorized"
- Grant may have expired or been revoked
- Check `status` field in `nylas_grants` table
- User should reconnect their account

### Emails not loading
- Verify grant is active (status = 'active')
- Check Nylas API key is valid
- Ensure user has proper workspace permissions

### Calendar events not syncing
- Verify calendar scopes are granted
- Check calendarId matches user's calendar
- Events use Unix timestamps (seconds, not milliseconds)
