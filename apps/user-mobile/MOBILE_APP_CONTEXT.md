# Mobile App Development Context

This document provides comprehensive context for building a React Native/Expo mobile app for the FinanceBro platform.

## 1. Application Overview

**FinanceBro** (marketed as **dreamteam.ai**) is an AI-powered business management platform for founders and entrepreneurs. It unifies financial management, CRM, team collaboration, and project management into a single integrated workspace.

### Value Proposition
"Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need."

### Target Users
- Startup founders
- Small business owners
- Entrepreneurs managing finances, sales, and teams

---

## 2. Architecture Overview

### Monorepo Structure (Turborepo)
```
financebro/
├── apps/
│   ├── finance/          # Next.js 16 web application (port 3001)
│   └── mobile/           # React Native Expo app (to be built)
├── packages/
│   ├── ui/               # Shared UI components (shadcn/ui)
│   ├── database/         # Supabase client & TypeScript types
│   ├── auth/             # Session management utilities
│   └── config/           # Shared TypeScript & ESLint configs
└── supabase/
    └── migrations/       # 44 SQL migration files
```

### Tech Stack

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | Next.js 16 (React 19) | React Native + Expo |
| Styling | Tailwind CSS 4 | NativeWind (Tailwind for RN) |
| State | React Context + TanStack Query | Same patterns |
| Database | Supabase (PostgreSQL) | Supabase JS SDK |
| Auth | Supabase Auth + Twilio OTP | Same |
| Real-time | Supabase Realtime | Same |
| Voice/SMS | Twilio Voice SDK | react-native-twilio-phone-verify |

---

## 3. Feature Modules

### 3.1 Finance Module
Comprehensive financial tracking for business accounts.

**Features:**
- **Accounts**: 7 types (checking, savings, credit card, cash, investment, loan, other)
- **Transactions**: Income/expense tracking with categorization
- **Categories**: Hierarchical categorization with icons and colors
- **Budgets**: Period-based (weekly, biweekly, monthly, yearly) with alerts
- **Goals**: Financial goal setting and progress tracking
- **KPIs**: Industry-specific dashboards (SaaS, Retail, Service)
- **Subscriptions**: Recurring payment tracking
- **Analytics**: P&L, cash flow, expense breakdowns

**Key Screens:**
- Account list and detail
- Transaction list with filters
- Add/edit transaction form
- Budget overview and detail
- Goals tracker
- Analytics dashboard

### 3.2 CRM/Sales Module
Full-featured customer relationship management.

**Features:**
- **Leads**: Lead tracking with custom fields, location, and pipeline stages
- **Contacts**: Contact database with company info and tags
- **Pipelines**: Customizable sales pipelines with stages and probabilities
- **Deals**: Opportunity tracking with values and close dates
- **Activities**: Calls, emails, meetings, notes, tasks
- **Communications**: SMS and call threads grouped by phone number

**Key Screens:**
- Lead list with search/filter
- Lead detail with activity timeline
- Pipeline board (kanban view)
- Deal detail
- Contact list and detail
- Communication inbox

### 3.3 Team/Messaging Module
Slack-like team collaboration.

**Features:**
- **Workspaces**: Multi-tenant team organization
- **Channels**: Public/private channels with threading
- **Direct Messages**: Peer-to-peer conversations
- **Threads**: Nested discussions within channels
- **Reactions**: Emoji reactions on messages
- **Mentions**: @user notifications

**Key Screens:**
- Workspace selector
- Channel list
- Channel messages with threads
- DM list and conversation
- Member list

### 3.4 Projects Module
Project and task management.

**Features:**
- **Projects**: Status tracking (active, on_hold, completed, archived)
- **Tasks**: Task items with assignments
- **Milestones**: Project milestone tracking
- **Team**: Member assignments with hours/week
- **Comments**: Threaded discussions
- **Files**: Attached documents

**Key Screens:**
- Project list
- Project detail with tasks
- Task detail
- Milestone tracker

### 3.5 Knowledge Module
Wiki and documentation system.

**Features:**
- **Documents**: Rich-text documentation pages
- **Categories**: Hierarchical organization
- **Whiteboards**: Visual collaboration (Excalidraw)
- **Links**: Internal document linking

**Key Screens:**
- Document list by category
- Document viewer/editor
- Category browser

### 3.6 AI Agents Module
AI-powered assistants for various tasks.

**Features:**
- **Budget Coach**: Intelligent budget guidance
- **Sales Agent**: Lead and pipeline management
- **Investment Advisor**: Goal tracking assistance
- **Expense Auditor**: Spending anomaly detection
- **Custom Agents**: Configurable agents with tools

**Key Screens:**
- Agent list
- Chat interface with agent
- Agent configuration (admin)

---

## 4. Database Schema

### Core Tables

#### Finance
| Table | Description |
|-------|-------------|
| `accounts` | Bank/cash accounts per user |
| `transactions` | Income/expense entries |
| `categories` | Transaction categories (hierarchical) |
| `budgets` | Budget definitions with periods |
| `goals` | Financial goals |
| `subscriptions` | Recurring payments |
| `recurring_rules` | Auto-transaction patterns |
| `kpi_inputs` | Industry KPI data |

#### CRM
| Table | Description |
|-------|-------------|
| `leads` | Sales leads with location |
| `contacts` | Contact information |
| `pipelines` | Sales pipeline definitions |
| `pipeline_stages` | Stages with probability |
| `deals` | Sales opportunities |
| `activities` | Calls, emails, meetings, notes, tasks |
| `communications` | SMS/call log with Twilio SIDs |
| `call_recordings` | Recording metadata |

#### Team
| Table | Description |
|-------|-------------|
| `workspaces` | Team workspaces |
| `workspace_members` | Membership with roles |
| `channels` | Communication channels |
| `channel_members` | Channel subscriptions |
| `messages` | Message content with threading |
| `message_reactions` | Emoji reactions |
| `dm_conversations` | DM threads |

#### Projects
| Table | Description |
|-------|-------------|
| `projects` | Project definitions |
| `project_members` | Team assignments |
| `project_tasks` | Task items |
| `project_milestones` | Milestones |
| `project_comments` | Discussions |

#### Knowledge
| Table | Description |
|-------|-------------|
| `knowledge_documents` | Wiki pages |
| `knowledge_categories` | Categories |
| `knowledge_whiteboards` | Visual boards |

#### AI
| Table | Description |
|-------|-------------|
| `agents` | Agent definitions with prompts/tools |
| `agent_conversations` | Chat history |
| `agent_memories` | Agent context |

### Key Relationships
```
profiles (1:1 with auth.users)
├── accounts → transactions → categories
├── budgets, goals, subscriptions
├── workspace_members → workspaces
│   ├── channels → messages
│   ├── projects → tasks, milestones
│   ├── agents → agent_conversations
│   └── pipelines → deals → contacts
└── leads → contacts, activities, communications
```

---

## 5. API Reference

### Base URL
```
https://your-domain.com/api
```

### Authentication

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+1234567890"  // E.164 format required
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+1234567890",
  "code": "123456"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+1234567890"
  },
  "session": {
    "access_token": "jwt...",
    "refresh_token": "..."
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>

Response:
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "phone": "+1234567890",
  "workspaceId": "uuid",
  "workspaceName": "My Workspace",
  "workspaceRole": "owner",
  "allowedProducts": ["finance", "sales", "team", "projects", "knowledge"]
}
```

### Finance Endpoints

```http
# Accounts
GET /api/accounts
POST /api/accounts
GET /api/accounts/:id
PUT /api/accounts/:id
DELETE /api/accounts/:id

# Transactions (with pagination)
GET /api/transactions?accountId=uuid&limit=50&offset=0&startDate=2024-01-01&endDate=2024-12-31
POST /api/transactions
GET /api/transactions/:id
PUT /api/transactions/:id
DELETE /api/transactions/:id

# Categories
GET /api/categories
POST /api/categories
PUT /api/categories/:id
DELETE /api/categories/:id

# Budgets
GET /api/budgets
POST /api/budgets
GET /api/budgets/:id  # Includes spending calculations
PUT /api/budgets/:id
DELETE /api/budgets/:id

# Goals
GET /api/goals
POST /api/goals
PUT /api/goals/:id
DELETE /api/goals/:id

# Subscriptions
GET /api/subscriptions
POST /api/subscriptions
PUT /api/subscriptions/:id
DELETE /api/subscriptions/:id

# Analytics
GET /api/analytics/overview
GET /api/analytics/cash-flow
GET /api/analytics/profit-loss
GET /api/analytics/expenses
GET /api/analytics/income
GET /api/analytics/calendar
```

### CRM Endpoints

```http
# Leads (with search/filter)
GET /api/leads?search=ABC&status=new&pipeline_id=uuid&stage_id=uuid&limit=50&offset=0
POST /api/leads
GET /api/leads/:id
PUT /api/leads/:id
DELETE /api/leads/:id

# Lead Activities
GET /api/leads/:id/activities
POST /api/leads/:id/activities

# Contacts
GET /api/contacts?leadId=uuid
POST /api/contacts
PUT /api/contacts/:id
DELETE /api/contacts/:id

# Pipelines
GET /api/lead-pipelines
POST /api/lead-pipelines
PUT /api/lead-pipelines/:id
DELETE /api/lead-pipelines/:id

# Deals
GET /api/deals?pipelineId=uuid&stageId=uuid
POST /api/deals
PUT /api/deals/:id
DELETE /api/deals/:id

# Communications
GET /api/communications?leadId=uuid&type=call&limit=50&offset=0
POST /api/communications
```

### Team Endpoints

```http
# Channels
GET /api/team/channels
POST /api/team/channels
GET /api/team/channels/:id
PUT /api/team/channels/:id

# Messages (cursor-based pagination)
GET /api/team/messages?channelId=uuid&limit=50&before=2024-01-15T10:00:00Z
POST /api/team/messages

# Direct Messages
GET /api/team/dm
POST /api/team/dm
GET /api/team/dm/:conversationId/messages

# Members
GET /api/team/members
```

### Project Endpoints

```http
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id

GET /api/projects/:id/tasks
POST /api/projects/:id/tasks
PUT /api/projects/:id/tasks/:taskId

GET /api/projects/:id/milestones
POST /api/projects/:id/milestones
```

### Knowledge Endpoints

```http
GET /api/knowledge/pages
POST /api/knowledge/pages
GET /api/knowledge/pages/:id
PUT /api/knowledge/pages/:id

GET /api/knowledge/categories
POST /api/knowledge/categories
```

### AI Chat Endpoints

#### Simple Chat
```http
POST /api/chat
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "agentId": "uuid"  // optional
}

Response: Server-Sent Events (SSE)
event: text
data: { "type": "text", "content": "Hello! How can I help?" }
```

#### Agent Chat (with tools)
```http
POST /api/agent-chat
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "message": "What's my budget status?",
  "agentId": "uuid",
  "workspaceId": "uuid",
  "conversationId": "uuid"  // optional, for resuming
}

Response: Server-Sent Events (SSE)
event: text
data: { "type": "text", "content": "..." }

event: tool_start
data: { "type": "tool_start", "name": "getBudgets" }

event: tool_result
data: { "type": "tool_result", "name": "getBudgets", "result": {...} }

event: done
data: { "type": "done" }
```

---

## 6. Twilio Voice Integration

### Getting a Voice Token
```http
GET /api/twilio/token
Authorization: Bearer <access_token>

Response:
{
  "token": "jwt_access_token",
  "identity": "user_uuid"
}
```

### Call Control Endpoints

```http
# Check for incoming calls
GET /api/calls/incoming

# Get call status
GET /api/calls/:id/status
Response:
{
  "id": "uuid",
  "twilioSid": "CA...",
  "status": "in-progress",  // ringing, in-progress, on-hold, completed
  "duration": 45,
  "isMuted": false,
  "isOnHold": false
}

# Mute/unmute
POST /api/calls/:id/mute
{ "muted": true }

# Hold
POST /api/calls/:id/hold
{ "hold": true }

# Send DTMF tones
POST /api/calls/:id/dtmf
{ "digits": "1234" }

# End call
POST /api/calls/:id/end

# Accept incoming call
POST /api/calls/incoming/:id/accept

# Decline incoming call
POST /api/calls/incoming/:id/decline
```

### React Native Integration

For React Native, use `@twilio/voice-react-native-sdk`:

```typescript
import { Voice } from '@twilio/voice-react-native-sdk';

// Initialize with token from API
const voice = new Voice();

// Register for incoming calls
voice.register(accessToken);

// Make outbound call
const call = await voice.connect(accessToken, {
  params: {
    To: '+1234567890'
  }
});

// Handle call events
call.on('connected', () => console.log('Call connected'));
call.on('disconnected', () => console.log('Call ended'));

// Control call
call.mute(true);
call.disconnect();
```

---

## 7. Authentication Flow

### Flow Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User       │────>│  App        │────>│  API        │
│  enters     │     │  calls      │     │  sends OTP  │
│  phone      │     │  /send-otp  │     │  via Twilio │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  App stores │<────│  API returns│<────│  User       │
│  tokens     │     │  JWT tokens │     │  enters OTP │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Token Storage (React Native)
```typescript
import * as SecureStore from 'expo-secure-store';

// Store tokens
await SecureStore.setItemAsync('access_token', session.access_token);
await SecureStore.setItemAsync('refresh_token', session.refresh_token);

// Retrieve for API calls
const accessToken = await SecureStore.getItemAsync('access_token');

// Add to requests
fetch('/api/accounts', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Token Refresh
Use Supabase client's built-in refresh:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true
  }
});
```

---

## 8. Design System

### Colors

| Name | Value | Usage |
|------|-------|-------|
| Primary | `#0ea5e9` (sky-500) | Main actions, links, accents |
| Secondary | `#f1f5f9` (slate-100) | Secondary buttons, backgrounds |
| Destructive | `#ef4444` (red-500) | Delete actions, errors |
| Success | `#22c55e` (green-500) | Success states |
| Warning | `#f59e0b` (amber-500) | Warning states |
| Background | `#ffffff` | Main background |
| Foreground | `#0f172a` (slate-900) | Primary text |
| Muted | `#64748b` (slate-500) | Secondary text |
| Border | `#e2e8f0` (slate-200) | Borders, dividers |

### Typography

| Style | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 24-32px | 700 | Page titles |
| Heading | 18-20px | 600 | Section headers |
| Body | 14-16px | 400 | Main content |
| Caption | 12px | 400 | Labels, hints |

**Font Family:** Inter (or system default)

### Spacing

Base unit: 8px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Default gap |
| md | 16px | Section padding |
| lg | 24px | Large gaps |
| xl | 32px | Page margins |

### Component Patterns

#### Cards
```tsx
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardTitle}>Title</Text>
    <Text style={styles.cardDescription}>Description</Text>
  </View>
  <View style={styles.cardContent}>
    {/* Content */}
  </View>
</View>
```

#### Buttons
- **Primary**: Filled sky-500 background, white text
- **Secondary**: Slate-100 background, slate-900 text
- **Outline**: Transparent with slate-200 border
- **Ghost**: Transparent, no border
- **Destructive**: Red-500 background

#### Lists
- Use `FlatList` with separator components
- 16px horizontal padding
- 12px vertical padding per item
- Chevron for navigation items

### Design Philosophy
- **Minimal & Clean**: Generous whitespace, no clutter
- **Content-First**: UI stays out of the way
- **Subtle Interactions**: Light animations, no flashy effects
- **Consistent Patterns**: Reuse component structures

---

## 9. Environment Setup

### Required Environment Variables

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# API Base URL (your Next.js server)
EXPO_PUBLIC_API_URL=https://your-domain.com/api

# Twilio (for push notifications)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

### Supabase Client Setup

```typescript
// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### API Client Setup

```typescript
// lib/api.ts
import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.access_token}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
```

---

## 10. Mobile-Specific Considerations

### Navigation Structure

Recommended structure using Expo Router:

```
app/
├── (auth)/
│   ├── login.tsx
│   └── verify-otp.tsx
├── (main)/
│   ├── _layout.tsx          # Tab navigator
│   ├── finance/
│   │   ├── index.tsx        # Dashboard
│   │   ├── accounts/
│   │   ├── transactions/
│   │   └── budgets/
│   ├── sales/
│   │   ├── index.tsx        # Pipeline view
│   │   ├── leads/
│   │   └── deals/
│   ├── team/
│   │   ├── index.tsx        # Channels
│   │   └── [channelId].tsx
│   ├── projects/
│   │   └── [projectId].tsx
│   └── knowledge/
│       └── [pageId].tsx
└── _layout.tsx              # Root layout with auth check
```

### Offline Support

Consider implementing offline-first patterns:

```typescript
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Queue mutations when offline
const mutationQueue: Array<{endpoint: string, data: any}> = [];

async function syncOfflineData() {
  const isConnected = await NetInfo.fetch().then(state => state.isConnected);

  if (isConnected && mutationQueue.length > 0) {
    for (const mutation of mutationQueue) {
      await apiClient(mutation.endpoint, {
        method: 'POST',
        body: JSON.stringify(mutation.data)
      });
    }
    mutationQueue.length = 0;
  }
}
```

### Push Notifications

For real-time updates, implement push notifications:

```typescript
import * as Notifications from 'expo-notifications';

// Register for push tokens
const { data: token } = await Notifications.getExpoPushTokenAsync();

// Send token to backend
await apiClient('/api/devices', {
  method: 'POST',
  body: JSON.stringify({ pushToken: token })
});
```

### Performance Tips

1. **Use FlatList** for long lists (transactions, messages)
2. **Implement pagination** - use `limit` and `offset` params
3. **Cache images** with `expo-image`
4. **Debounce search** inputs
5. **Use React Query** for data fetching and caching

### Biometric Authentication

For secure re-authentication:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function authenticateWithBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access FinanceBro'
    });
    return result.success;
  }
  return false;
}
```

---

## 11. Key File References

### Web App (for reference)
- `apps/finance/src/app/` - Page routes and layouts
- `apps/finance/src/components/` - UI components (226 files)
- `apps/finance/src/lib/` - Utilities, API clients, helpers
- `apps/finance/src/providers/` - React context providers

### Shared Packages
- `packages/database/src/queries.ts` - Query functions
- `packages/database/src/client.ts` - Supabase client setup
- `packages/auth/src/session.ts` - Session utilities

### Database
- `supabase/migrations/` - 44 SQL migration files

### Key Integration Files
- `apps/finance/src/lib/twilio.ts` - Twilio SDK wrapper
- `apps/finance/src/lib/ai.ts` - AI integrations
- `apps/finance/src/providers/call-provider.tsx` - Voice call state

---

## 12. Getting Started Checklist

1. [ ] Set up Expo project with TypeScript
2. [ ] Configure Supabase client with AsyncStorage
3. [ ] Implement phone OTP authentication flow
4. [ ] Create navigation structure (tabs + stacks)
5. [ ] Build Finance module screens
6. [ ] Add CRM/Sales screens
7. [ ] Implement Team messaging with real-time
8. [ ] Add Projects and Knowledge modules
9. [ ] Integrate AI chat
10. [ ] Add Twilio Voice SDK for calls
11. [ ] Implement push notifications
12. [ ] Add offline support
13. [ ] Performance optimization
14. [ ] Testing on iOS and Android
