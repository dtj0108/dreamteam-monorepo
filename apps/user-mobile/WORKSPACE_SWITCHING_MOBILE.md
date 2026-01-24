# Workspace Switching - Mobile Developer Guide

This document explains how workspace (company) switching works in the FinanceBro platform, designed to help mobile developers implement the same functionality in native apps.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [State Management](#state-management)
5. [Data Flow](#data-flow)
6. [Product Access Control](#product-access-control)
7. [Data Isolation (RLS)](#data-isolation-rls)
8. [Mobile Implementation Guide](#mobile-implementation-guide)
9. [Key Files Reference](#key-files-reference)

---

## Overview

Users can belong to **multiple workspaces** (companies) simultaneously. Each workspace is isolated - users see different data (accounts, transactions, contacts, etc.) depending on which workspace is currently active.

**Key Concepts:**
- A **workspace** represents a company/organization
- Users are **members** of workspaces with roles: `owner`, `admin`, or `member`
- The **current workspace** determines what data the user sees
- **Product access** (Finance, Sales, Team, etc.) is controlled per-workspace per-user

---

## Database Schema

### `workspaces` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Display name (e.g., "Acme Corp") |
| `slug` | VARCHAR(100) | URL-safe identifier, unique |
| `avatar_url` | TEXT | Optional logo URL |
| `owner_id` | UUID | FK → `profiles.id` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `workspace_members` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | FK → `workspaces.id` |
| `profile_id` | UUID | FK → `profiles.id` |
| `role` | VARCHAR(50) | `'owner'`, `'admin'`, or `'member'` |
| `display_name` | VARCHAR(100) | Optional custom name in workspace |
| `status` | VARCHAR(50) | `'active'`, `'away'`, `'dnd'` |
| `status_text` | VARCHAR(100) | Custom status message |
| `allowed_products` | TEXT[] | Array of accessible products |
| `joined_at` | TIMESTAMPTZ | When user joined workspace |

**Unique constraint:** `(workspace_id, profile_id)` - user can only be member once per workspace.

### `profiles` Table (Relevant Fields)

| Column | Type | Description |
|--------|------|-------------|
| `default_workspace_id` | UUID | User's default workspace (fallback) |

---

## API Endpoints

### GET `/api/workspaces`

Lists all workspaces the authenticated user belongs to.

**Request:**
```http
GET /api/workspaces
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "workspaces": [
    {
      "id": "uuid-1",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "avatarUrl": "https://...",
      "ownerId": "uuid-owner",
      "role": "owner"
    },
    {
      "id": "uuid-2",
      "name": "Side Project LLC",
      "slug": "side-project",
      "avatarUrl": null,
      "ownerId": "uuid-other",
      "role": "member"
    }
  ],
  "currentWorkspaceId": "uuid-1"
}
```

**Error Responses:**
- `401` - Not authenticated

---

### POST `/api/workspaces/switch`

Switches the current workspace. Sets an HTTP-only cookie on the server.

**Request:**
```http
POST /api/workspaces/switch
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "workspaceId": "uuid-2"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Error Responses:**
- `400` - Missing `workspaceId`
- `401` - Not authenticated
- `403` - User is not a member of the workspace

**Server-Side Effect:**
Sets cookie `current_workspace_id` with:
- `httpOnly: true`
- `secure: true` (in production)
- `sameSite: 'lax'`
- `maxAge: 31536000` (1 year)

---

### POST `/api/workspaces`

Creates a new workspace. The creator becomes the owner.

**Request:**
```http
POST /api/workspaces
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "name": "New Company",
  "slug": "new-company"
}
```

**Response (200):**
```json
{
  "workspace": {
    "id": "uuid-new",
    "name": "New Company",
    "slug": "new-company",
    "avatarUrl": null,
    "ownerId": "uuid-creator",
    "role": "owner"
  }
}
```

**Slug Validation:**
- Must match `/^[a-z0-9-]+$/` (lowercase letters, numbers, hyphens only)
- Must be unique across all workspaces

**Error Responses:**
- `400` - Missing name/slug, invalid slug format, or slug already taken
- `401` - Not authenticated

---

### GET `/api/auth/me`

Returns the current user with workspace context.

**Request:**
```http
GET /api/auth/me
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-user",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "companyName": "Acme Corp",
    "industryType": "technology",
    "workspaceId": "uuid-workspace",
    "workspaceName": "Acme Corp",
    "workspaceRole": "owner",
    "allowedProducts": ["finance", "sales", "team", "projects", "knowledge"],
    "pending2FA": false,
    "phoneVerified": true
  }
}
```

**Key Fields for Mobile:**
- `workspaceId` - Current active workspace
- `workspaceName` - Display name for current workspace
- `workspaceRole` - User's role in current workspace
- `allowedProducts` - Which app features user can access

---

## State Management

### How Current Workspace is Determined

The server determines the current workspace in this priority order:

```
1. Cookie `current_workspace_id` (if set and user is still a member)
      ↓ (if not set or invalid)
2. Profile `default_workspace_id` (user's preferred default)
      ↓ (if not set)
3. First workspace in user's membership list
```

### Web Implementation (React)

The web app uses a React Context (`WorkspaceProvider`) that:

1. Fetches workspaces on mount via `GET /api/workspaces`
2. Tracks `currentWorkspace` and `workspaces` in state
3. Provides `switchWorkspace(workspaceId)` function that:
   - Calls `POST /api/workspaces/switch`
   - Updates local state
   - Navigates to home (`/`)
   - Forces a page refresh to reload data

**TypeScript Interfaces:**
```typescript
type WorkspaceRole = "owner" | "admin" | "member"

interface Workspace {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  ownerId: string
  role: WorkspaceRole
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
}
```

---

## Data Flow

### Complete Workspace Switch Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  1. User taps workspace in selector                              │
│                        ↓                                         │
│  2. App calls POST /api/workspaces/switch { workspaceId }        │
│                        ↓                                         │
│  3. Server validates: Is user a member of this workspace?        │
│         ├── NO  → Return 403 Forbidden                           │
│         └── YES → Continue                                       │
│                        ↓                                         │
│  4. Server sets HTTP-only cookie: current_workspace_id           │
│                        ↓                                         │
│  5. Server returns { success: true }                             │
│                        ↓                                         │
│  6. App calls GET /api/auth/me to refresh user context           │
│                        ↓                                         │
│  7. Server reads cookie, returns updated user object with:       │
│         - workspaceId (new workspace)                            │
│         - workspaceName                                          │
│         - workspaceRole                                          │
│         - allowedProducts                                        │
│                        ↓                                         │
│  8. App updates local user state                                 │
│                        ↓                                         │
│  9. App refreshes all data views (accounts, transactions, etc.)  │
│         - All subsequent API calls return data for new workspace │
└──────────────────────────────────────────────────────────────────┘
```

### Initial App Launch Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  1. App launches, user is authenticated                          │
│                        ↓                                         │
│  2. App calls GET /api/workspaces                                │
│                        ↓                                         │
│  3. Server returns:                                              │
│         - workspaces[] (all user's workspaces)                   │
│         - currentWorkspaceId (from cookie/default/first)         │
│                        ↓                                         │
│  4. App stores workspaces list and current selection             │
│                        ↓                                         │
│  5. App calls GET /api/auth/me for full user context             │
│                        ↓                                         │
│  6. App is ready - displays data for current workspace           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Product Access Control

Users have different feature access per workspace. This is controlled by the `allowed_products` array in `workspace_members`.

### Available Products

| Product ID | Feature |
|------------|---------|
| `finance` | Finance dashboard, accounts, transactions, budgets |
| `sales` | CRM, contacts, deals, pipelines |
| `team` | Team messaging, channels |
| `projects` | Project management |
| `knowledge` | Knowledge base, documents |

### Access Rules

1. **Owners** always have access to ALL products
2. **Admins/Members** access is controlled by `workspace_members.allowed_products`
3. Default for new members: `['finance', 'sales', 'team', 'projects', 'knowledge']`

### Mobile Implementation

```typescript
// After fetching user via GET /api/auth/me
const user = response.user

// Check if user can access a feature
function canAccessProduct(productId: string): boolean {
  return user.allowedProducts.includes(productId)
}

// Example: Conditionally show Finance tab
if (canAccessProduct('finance')) {
  showFinanceTab()
}
```

---

## Data Isolation (RLS)

All data is automatically scoped to the current workspace using Postgres Row Level Security (RLS).

### How It Works

1. Finance tables (`accounts`, `transactions`, `categories`, `budgets`, etc.) have a `workspace_id` column
2. RLS policies check membership via `is_workspace_member(workspace_id)` function
3. When you switch workspaces, all queries automatically return only that workspace's data

### Example RLS Policy

```sql
-- Users can only see accounts in workspaces they belong to
CREATE POLICY "Workspace members can view accounts"
  ON accounts FOR SELECT
  USING (is_workspace_member(workspace_id));
```

### For Mobile

- You don't need to manually filter by workspace in most queries
- The server handles scoping based on the `current_workspace_id` cookie
- After switching workspaces, simply refresh your data and you'll get the new workspace's data

---

## Mobile Implementation Guide

### Step 1: On App Launch / Login

```typescript
// Fetch user's workspaces
const workspacesResponse = await fetch('/api/workspaces', {
  headers: { Authorization: `Bearer ${sessionToken}` }
})
const { workspaces, currentWorkspaceId } = await workspacesResponse.json()

// Store workspaces list
store.setWorkspaces(workspaces)
store.setCurrentWorkspaceId(currentWorkspaceId)

// Fetch full user context
const meResponse = await fetch('/api/auth/me', {
  headers: { Authorization: `Bearer ${sessionToken}` }
})
const { user } = await meResponse.json()
store.setUser(user)
```

### Step 2: Display Workspace Selector

```typescript
// Show current workspace with role badge
const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId)

// UI: Avatar + Name + Role
<WorkspaceItem
  avatarUrl={currentWorkspace.avatarUrl}
  name={currentWorkspace.name}
  role={currentWorkspace.role}  // "owner", "admin", "member"
/>

// Dropdown/modal with all workspaces
workspaces.map(workspace => (
  <WorkspaceOption
    key={workspace.id}
    workspace={workspace}
    isSelected={workspace.id === currentWorkspaceId}
    onSelect={() => switchWorkspace(workspace.id)}
  />
))
```

### Step 3: Handle Workspace Switch

```typescript
async function switchWorkspace(workspaceId: string) {
  // 1. Call switch endpoint
  const response = await fetch('/api/workspaces/switch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ workspaceId })
  })

  if (!response.ok) {
    throw new Error('Failed to switch workspace')
  }

  // 2. Update local state
  store.setCurrentWorkspaceId(workspaceId)

  // 3. Refresh user context (to get new allowedProducts, etc.)
  const meResponse = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${sessionToken}` }
  })
  const { user } = await meResponse.json()
  store.setUser(user)

  // 4. Refresh all data views
  await Promise.all([
    refreshAccounts(),
    refreshTransactions(),
    refreshContacts(),
    // ... other data
  ])

  // 5. Navigate to home screen
  navigation.navigate('Home')
}
```

### Step 4: Handle Cookie/Session

For native mobile apps, you have two options:

**Option A: Cookie-based (Recommended)**
- Use a cookie-aware HTTP client that persists cookies
- The `current_workspace_id` cookie will be automatically sent with requests
- Works seamlessly with the web API

**Option B: Header-based**
- Store `currentWorkspaceId` locally
- Send it as a custom header: `X-Workspace-ID: uuid`
- Requires server-side changes to read from header as fallback

### Step 5: Check Product Access

```typescript
// Before showing a feature, check access
function renderTabBar() {
  const tabs = []

  if (user.allowedProducts.includes('finance')) {
    tabs.push({ id: 'finance', label: 'Finance', icon: '💰' })
  }
  if (user.allowedProducts.includes('sales')) {
    tabs.push({ id: 'sales', label: 'Sales', icon: '📈' })
  }
  if (user.allowedProducts.includes('team')) {
    tabs.push({ id: 'team', label: 'Team', icon: '👥' })
  }
  // ...

  return <TabBar tabs={tabs} />
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/finance/src/providers/workspace-provider.tsx` | React context for workspace state |
| `apps/finance/src/app/api/workspaces/route.ts` | GET/POST endpoints for workspaces |
| `apps/finance/src/app/api/workspaces/switch/route.ts` | POST endpoint for switching |
| `apps/finance/src/app/api/auth/me/route.ts` | GET endpoint for user + workspace context |
| `apps/finance/src/components/company-switcher.tsx` | UI dropdown component |
| `supabase/migrations/012_create_messaging_tables.sql` | Creates workspaces tables |
| `supabase/migrations/016_add_product_access.sql` | Adds allowed_products column |

---

## Summary

1. **Workspaces** represent companies/organizations
2. **Users** can belong to multiple workspaces with different roles
3. **Current workspace** is stored in an HTTP-only cookie
4. **Switching** requires validating membership, then refreshing data
5. **Product access** is per-user-per-workspace via `allowed_products`
6. **Data isolation** is automatic via RLS - no manual filtering needed

For questions, refer to the source files or contact the backend team.
