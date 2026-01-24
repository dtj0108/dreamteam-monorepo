# Workspace & Company Data

This document explains how workspace (company/organization) data is structured, fetched, and used throughout the application.

## Overview

The application uses a **multi-tenant architecture** where each workspace represents a company or organization. All data is scoped to a workspace, ensuring complete isolation between different organizations.

### Key Concepts

| Concept | Description |
|---------|-------------|
| Workspace | A company/organization container for all data |
| Workspace Member | A user's membership in a workspace with role |
| Default Workspace | The workspace a user sees on login |
| Allowed Products | Which modules a user can access (finance, sales, etc.) |

### Data Isolation

- Every table includes a `workspace_id` column
- Row Level Security (RLS) policies enforce workspace boundaries
- Users can only see data from workspaces they belong to

---

## Database Schema

### Workspaces Table

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Workspace display name |
| `slug` | VARCHAR(100) | URL-friendly unique identifier |
| `avatar_url` | TEXT | Workspace logo/avatar |
| `owner_id` | UUID | User who owns the workspace |

### Workspace Members Table

```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  display_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  status_text VARCHAR(100),
  allowed_products TEXT[],
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, profile_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `workspace_id` | UUID | The workspace |
| `profile_id` | UUID | The user |
| `role` | VARCHAR(50) | `owner`, `admin`, or `member` |
| `display_name` | VARCHAR(100) | Custom name within workspace |
| `status` | VARCHAR(50) | `active`, `away`, `dnd` |
| `status_text` | VARCHAR(100) | Custom status message |
| `allowed_products` | TEXT[] | Array of product IDs user can access |

### Profiles Table (User Link)

```sql
-- Profiles have a default workspace reference
ALTER TABLE profiles
ADD COLUMN default_workspace_id UUID REFERENCES workspaces(id);
```

The `default_workspace_id` determines which workspace the user sees on login.

### Pending Invites Table

```sql
CREATE TABLE pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, email)
);
```

Used for email-based invitations before a user signs up.

---

## User Context API

### Get Current User with Workspace

```
GET /api/auth/me
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "companyName": "Acme Corp",
    "industryType": "technology",
    "workspaceId": "workspace-uuid",
    "workspaceName": "Acme Corp",
    "workspaceRole": "owner",
    "allowedProducts": ["finance", "sales", "team", "projects", "knowledge"],
    "pending2FA": false,
    "phoneVerified": true
  }
}
```

**User Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | User's profile ID |
| `email` | string | User's email address |
| `name` | string | User's display name |
| `phone` | string | Phone number (for 2FA) |
| `companyName` | string \| null | Company name from profile |
| `industryType` | string \| null | Industry classification |
| `workspaceId` | string \| null | Current workspace ID |
| `workspaceName` | string \| null | Current workspace name |
| `workspaceRole` | string \| null | Role in workspace: `owner`, `admin`, `member` |
| `allowedProducts` | string[] | Products user can access |
| `pending2FA` | boolean | Whether 2FA setup is pending |
| `phoneVerified` | boolean | Whether phone is verified |

**How It Works:**

1. Get authenticated user from Supabase Auth
2. Fetch profile with `default_workspace_id`
3. Query workspaces table for workspace name
4. Query workspace_members for `allowed_products`
5. Determine role based on workspace owner or member role
6. Return combined User object

---

## Workspace Data Flow

### Initialization Flow

```
App Launch
    ↓
Check Auth State (Supabase)
    ↓
GET /api/auth/me
    ↓
Store User in Context/State
    ├── workspaceId
    ├── workspaceName
    ├── workspaceRole
    └── allowedProducts
    ↓
All API Calls Include workspaceId
```

### Data Scoping

Every API endpoint that returns workspace-specific data:

1. **Query Parameter:** `?workspaceId={uuid}`
2. **Server Validation:** Verifies user belongs to workspace
3. **RLS Policy:** Database enforces workspace boundaries

Example:
```
GET /api/leads?workspaceId=abc-123
GET /api/projects?workspaceId=abc-123
GET /api/team/members?workspaceId=abc-123
```

---

## Team Management APIs

### List Workspace Members

```
GET /api/team/members?workspaceId={uuid}
```

**Response:**
```json
{
  "members": [
    {
      "id": "member-uuid",
      "profile_id": "profile-uuid",
      "role": "owner",
      "display_name": "John D.",
      "status": "active",
      "status_text": "Working from home",
      "allowed_products": ["finance", "sales", "team", "projects", "knowledge"],
      "joined_at": "2024-01-15T10:00:00Z",
      "profile": {
        "id": "profile-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

### Invite Member

```
POST /api/team/members
```

**Request:**
```json
{
  "workspaceId": "workspace-uuid",
  "email": "newuser@example.com",
  "role": "member"
}
```

**Behavior:**
- If user exists: Adds directly to workspace_members
- If user doesn't exist: Creates pending_invite record

**Required Role:** `owner` or `admin`

### Check Pending Invites

```
POST /api/team/invites/check
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "invite": {
    "id": "invite-uuid",
    "workspace_id": "workspace-uuid",
    "role": "member",
    "workspace": {
      "name": "Acme Corp"
    }
  }
}
```

Used during signup to auto-join invited workspace.

### Get Feature Flags

```
GET /api/team/feature-flags?workspaceId={uuid}
```

**Response:**
```json
{
  "featureFlags": [
    {
      "id": "flag-uuid",
      "feature_key": "ai_capabilities",
      "is_enabled": true,
      "config": {}
    },
    {
      "id": "flag-uuid",
      "feature_key": "beta_features",
      "is_enabled": false,
      "config": {}
    }
  ]
}
```

**Default Feature Flags:**

| Key | Default | Description |
|-----|---------|-------------|
| `ai_capabilities` | true | AI assistant features |
| `beta_features` | false | Beta/experimental features |
| `advanced_analytics` | false | Advanced reporting |
| `api_access` | false | API key access |
| `webhook_integrations` | false | Webhook support |

---

## Roles & Permissions

### Workspace Roles

| Role | Description |
|------|-------------|
| `owner` | Full control, can delete workspace |
| `admin` | Can manage members, settings |
| `member` | Standard access |

### Role Capabilities

| Capability | Owner | Admin | Member |
|------------|-------|-------|--------|
| View workspace data | Yes | Yes | Yes |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes | No |
| Manage product access | Yes | Yes | No |
| Delete content | Yes | Yes | No |
| Export data | Yes | Yes | No |
| Manage feature flags | Yes | No | No |
| Delete workspace | Yes | No | No |

### Allowed Products

Products controlled via `workspace_members.allowed_products` array:

| Product ID | Description |
|------------|-------------|
| `finance` | Financial management |
| `sales` | CRM and sales pipeline |
| `team` | Team messaging |
| `projects` | Project management |
| `knowledge` | Knowledge wiki |

**Product Access Logic:**
- **Owners:** Automatically get all products
- **Admins/Members:** Get products from their `allowed_products` array

---

## Signup & Workspace Creation

### New User Signup Flow

```
User Signs Up
    ↓
Check pending_invites for email
    ↓
┌─────────────────┬──────────────────────┐
│ Has Invites     │ No Invites           │
├─────────────────┼──────────────────────┤
│ Join invited    │ Create new workspace │
│ workspace       │ with user as owner   │
│                 │                      │
│ Set as default  │ Create default       │
│ workspace       │ channels             │
│                 │                      │
│ Delete invite   │ Set as default       │
│ record          │ workspace            │
└─────────────────┴──────────────────────┘
```

### Workspace Creation (During Signup)

```typescript
// 1. Create workspace
const workspace = await supabase.from('workspaces').insert({
  name: companyName || `${name}'s Workspace`,
  slug: generateSlug(name),
  owner_id: userId,
})

// 2. Add user as owner member
await supabase.from('workspace_members').insert({
  workspace_id: workspace.id,
  profile_id: userId,
  role: 'owner',
})

// 3. Create default channels (Team workspace)
await supabase.from('channels').insert([
  { workspace_id: workspace.id, name: 'general', is_default: true },
  { workspace_id: workspace.id, name: 'random', is_default: false },
])

// 4. Update profile with default workspace
await supabase.from('profiles').update({
  default_workspace_id: workspace.id
}).eq('id', userId)
```

---

## Mobile Implementation

### Fetching Workspace on Launch

```typescript
// lib/api.ts
export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.user
}
```

### Storing in Global State (Zustand Example)

```typescript
// stores/user-store.ts
import { create } from 'zustand'

interface UserStore {
  user: User | null
  workspaceId: string | null
  isLoading: boolean

  fetchUser: () => Promise<void>
  setUser: (user: User | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  workspaceId: null,
  isLoading: true,

  fetchUser: async () => {
    set({ isLoading: true })
    const user = await fetchCurrentUser()
    set({
      user,
      workspaceId: user?.workspaceId || null,
      isLoading: false
    })
  },

  setUser: (user) => set({
    user,
    workspaceId: user?.workspaceId || null
  }),

  clearUser: () => set({
    user: null,
    workspaceId: null
  }),
}))
```

### Using Workspace ID in API Calls

```typescript
// hooks/useAPI.ts
import { useUserStore } from '@/stores/user-store'

export function useAPI() {
  const workspaceId = useUserStore(state => state.workspaceId)

  const fetchLeads = async () => {
    if (!workspaceId) throw new Error('No workspace')

    const response = await fetch(
      `${API_URL}/api/leads?workspaceId=${workspaceId}`,
      { headers: await getAuthHeaders() }
    )
    return response.json()
  }

  const fetchProjects = async () => {
    if (!workspaceId) throw new Error('No workspace')

    const response = await fetch(
      `${API_URL}/api/projects?workspaceId=${workspaceId}`,
      { headers: await getAuthHeaders() }
    )
    return response.json()
  }

  return { fetchLeads, fetchProjects }
}
```

### Checking Product Access

```typescript
// hooks/useProductAccess.ts
import { useUserStore } from '@/stores/user-store'

export function useProductAccess() {
  const user = useUserStore(state => state.user)
  const allowedProducts = user?.allowedProducts || []

  const hasAccess = (product: string) => {
    return allowedProducts.includes(product)
  }

  return {
    hasFinanceAccess: hasAccess('finance'),
    hasSalesAccess: hasAccess('sales'),
    hasTeamAccess: hasAccess('team'),
    hasProjectsAccess: hasAccess('projects'),
    hasKnowledgeAccess: hasAccess('knowledge'),
  }
}

// Usage in navigation
function TabNavigator() {
  const { hasSalesAccess, hasTeamAccess } = useProductAccess()

  return (
    <Tab.Navigator>
      <Tab.Screen name="Finance" component={FinanceStack} />
      {hasSalesAccess && <Tab.Screen name="Sales" component={SalesStack} />}
      {hasTeamAccess && <Tab.Screen name="Team" component={TeamStack} />}
      {/* ... */}
    </Tab.Navigator>
  )
}
```

### App Initialization

```typescript
// app/_layout.tsx (Expo Router)
import { useEffect } from 'react'
import { useUserStore } from '@/stores/user-store'

export default function RootLayout() {
  const { fetchUser, isLoading } = useUserStore()

  useEffect(() => {
    fetchUser()
  }, [])

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  )
}
```

---

## Row Level Security (RLS)

### Workspace Access Policy

```sql
-- Users can only view workspaces they belong to
CREATE POLICY "workspace_member_access" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND profile_id = auth.uid()
    )
  );
```

### Data Table Policy Pattern

```sql
-- Example for any workspace-scoped table (leads, projects, etc.)
CREATE POLICY "workspace_data_access" ON leads
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE profile_id = auth.uid()
    )
  );
```

### Why RLS Matters

- **Security:** Database-level enforcement, not just API
- **Simplicity:** Don't need to filter by workspace in every query
- **Protection:** Even direct database access respects boundaries

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/012_create_messaging_tables.sql` | Workspace tables |
| `supabase/migrations/014_create_pending_invites.sql` | Invite system |
| `supabase/migrations/015_add_default_workspace.sql` | Profile link |
| `supabase/migrations/035_create_team_permissions.sql` | Permissions |
| `app/api/auth/me/route.ts` | User context endpoint |
| `app/api/auth/signup/route.ts` | Workspace creation |
| `app/api/team/members/route.ts` | Member management |
| `app/api/team/feature-flags/route.ts` | Feature flags |
| `providers/user-provider.tsx` | User context provider |

---

## Summary

1. **Workspaces isolate data** - Each company/org has its own workspace
2. **Users belong to workspaces** - Via `workspace_members` with roles
3. **Default workspace** - Stored in `profiles.default_workspace_id`
4. **Fetch on login** - Call `/api/auth/me` to get user + workspace info
5. **Include in API calls** - Pass `workspaceId` to all workspace-scoped endpoints
6. **Check product access** - Use `allowedProducts` to show/hide features
7. **RLS enforces boundaries** - Database-level security for all data
