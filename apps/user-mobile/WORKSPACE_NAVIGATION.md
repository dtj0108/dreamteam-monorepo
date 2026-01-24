# Workspace Navigation

This document explains the workspace navigation system in FinanceBro.

## Overview

The application is organized into **5 workspaces**, each representing a major product area:

| Workspace | Icon | URL Base | Purpose |
|-----------|------|----------|---------|
| Finance | $ | `/finance` | Financial management |
| Sales | Handshake | `/sales` | CRM and sales pipeline |
| Team | Users | `/team` | Team messaging (Slack-like) |
| Projects | Folder | `/projects` | Project management |
| Knowledge | Book | `/knowledge` | Documentation wiki |

Users can switch between workspaces via the sidebar dropdown. Access is controlled by the `allowedProducts` array in the user's profile.

---

## Workspace Routes

### Finance (`/finance`)

```
/finance
├── / .......................... Dashboard
├── /accounts
│   ├── / ...................... All Accounts
│   └── /new ................... Add Account
├── /transactions
│   ├── / ...................... All Transactions
│   ├── /new ................... Add Transaction
│   └── /import ................ Import CSV
├── /subscriptions ............. Subscription Tracking
├── /budgets ................... Budget Management
├── /analytics
│   ├── / ...................... Overview
│   ├── /income ................ Income Analysis
│   ├── /expenses .............. Expense Breakdown
│   ├── /profit-loss ........... P&L Statement
│   ├── /cash-flow ............. Cash Flow
│   ├── /budget ................ Budget vs Actual
│   ├── /calendar .............. Financial Calendar
│   └── /custom ................ Custom Reports
├── /kpis ...................... KPI Dashboard
├── /goals ..................... Financial Goals
└── /customize
    ├── / ...................... General Settings
    ├── /categories ............ Category Management
    └── /recurring ............. Recurring Rules
```

### Sales (`/sales`)

```
/sales
├── /pipeline .................. Pipeline Board (Kanban)
├── /deals ..................... Deal List
├── /leads ..................... Lead Management
├── /contacts .................. Contact Database
├── /workflows ................. Automation Workflows
├── /conversations ............. SMS/Call Threads
├── /activities ................ Activity Log
├── /reports ................... Sales Reports
└── /settings
    └── /phone-numbers ......... Twilio Number Management
```

### Team (`/team`)

```
/team
├── / .......................... Messages (default channel)
├── /channels .................. Channel List
├── /dm ........................ Direct Messages
├── /mentions .................. @Mentions
└── /search .................... Message Search
```

The Team workspace has a special sidebar showing:
- Channels (public/private)
- Direct message threads
- AI Agents

### Projects (`/projects`)

```
/projects
├── /all ....................... All Projects
├── /my-tasks .................. My Assigned Tasks
├── /timeline .................. Timeline View
├── /milestones ................ Milestone Tracker
├── /workload .................. Team Workload
└── /reports ................... Project Reports
```

### Knowledge (`/knowledge`)

```
/knowledge
├── / .......................... All Pages
├── /?filter=favorites ......... Favorites
├── /templates ................. Document Templates
└── /search .................... Search
```

---

## Sidebar Architecture

The sidebar is built from these components:

```
<Sidebar>
  ┌─────────────────────────────┐
  │  SidebarHeader              │
  │  └── WorkspaceSwitcher      │  ← Dropdown to switch workspaces
  ├─────────────────────────────┤
  │  SidebarContent             │
  │  ├── GetStartedChecklist    │  ← Finance only (onboarding)
  │  ├── NavMain                │  ← Main navigation items
  │  └── NavProjects            │  ← Finance only (goals)
  ├─────────────────────────────┤
  │  SidebarFooter              │
  │  ├── Learning Center Link   │  ← Finance & Projects only
  │  └── NavUser                │  ← User profile dropdown
  └─────────────────────────────┘
```

### Component Files

| Component | File | Purpose |
|-----------|------|---------|
| AppSidebar | `components/app-sidebar.tsx` | Main sidebar container |
| WorkspaceSwitcher | `components/workspace-switcher.tsx` | Workspace dropdown |
| NavMain | `components/nav-main.tsx` | Collapsible nav menu |
| NavProjects | `components/nav-projects.tsx` | Dynamic goals section |
| NavUser | `components/nav-user.tsx` | User profile menu |
| Sidebar (UI) | `components/ui/sidebar.tsx` | Base sidebar primitives |

---

## Workspace Switcher

The workspace switcher appears in the sidebar header and allows users to navigate between workspaces.

### Detection Logic

The current workspace is detected from the URL pathname:

```typescript
// components/workspace-switcher.tsx
export function useCurrentWorkspace(): WorkspaceId {
  const pathname = usePathname()

  if (pathname.startsWith("/sales")) return "sales"
  if (pathname.startsWith("/team")) return "team"
  if (pathname.startsWith("/projects")) return "projects"
  if (pathname.startsWith("/knowledge")) return "knowledge"
  return "finance"  // default
}
```

### Features

- **Dropdown menu** showing all 5 workspaces
- **Current workspace** highlighted with emoji and name
- **Home button** to return to hub (`/`)
- **Access control** - locked icon for restricted workspaces
- **Keyboard shortcuts** - `⌘1` through `⌘5` to switch

### Access Control

Workspaces the user doesn't have access to show:
- Lock icon instead of workspace emoji
- Disabled/grayed out appearance (opacity 0.5)
- Cannot be selected

Access is determined by `user.allowedProducts` array from `/api/auth/me`.

---

## Navigation Menu (NavMain)

The main navigation displays collapsible menu items specific to each workspace.

### Structure

```typescript
interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}
```

### Features

- **Collapsible sections** with chevron indicator
- **Active state** based on current route
- **Nested items** for sub-pages
- **Tooltips** on hover (in collapsed mode)
- **Smooth animations** for expand/collapse

### Example (Finance)

```typescript
const financeNavItems = [
  {
    title: "Dashboard",
    url: "/finance",
    icon: LayoutDashboard,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Wallet,
    items: [
      { title: "All Accounts", url: "/accounts" },
      { title: "Add Account", url: "/accounts/new" },
    ],
  },
  // ...
]
```

---

## User Menu (NavUser)

Located in the sidebar footer, provides user account access.

### Dropdown Items

```
┌────────────────────────────┐
│ [Avatar] User Name         │
│          user@email.com    │
├────────────────────────────┤
│ 🏢 Company Name            │
├────────────────────────────┤
│ ✨ Upgrade to Pro          │
├────────────────────────────┤
│ 🎫 Account                 │  → /account
│ 👥 Team                    │  → /account?tab=team
│ 💳 Billing                 │  → /billing
│ 🔔 Notifications           │  → /notifications
├────────────────────────────┤
│ 🚪 Log out                 │  (destructive)
└────────────────────────────┘
```

---

## Route Layouts

### Layout Hierarchy

```
app/layout.tsx (Root)
└── Providers (Theme, User, Call, etc.)
    └── app/(suite)/layout.tsx (Authenticated)
        └── DashboardLayout
            ├── app/finance/... (default)
            ├── app/sales/layout.tsx
            │   └── ProductGate + SalesProvider
            ├── app/team/layout.tsx
            │   └── ProductGate + TeamProvider + TeamSidebar
            ├── app/projects/layout.tsx
            │   └── ProductGate + ProjectsProvider
            └── app/knowledge/layout.tsx
                └── ProductGate
```

### ProductGate Component

Protects workspace routes based on user access:

```typescript
// components/product-gate.tsx
export function ProductGate({
  product,
  children,
  fallback = "/"
}: ProductGateProps) {
  const { user, loading } = useUser()

  // Check if user has access to this product
  const hasAccess = user?.allowedProducts?.includes(product)

  if (!hasAccess) {
    redirect(fallback)
  }

  return children
}
```

### DashboardLayout Component

Wraps all authenticated pages with sidebar:

```typescript
// components/dashboard-layout.tsx
export function DashboardLayout({
  children,
  title,
  actions,
  noPadding = false,
  defaultCollapsed = false,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={!defaultCollapsed}>
      <AppSidebar user={user} />
      <SidebarInset>
        <header>
          <SidebarTrigger />
          {title && <h1>{title}</h1>}
          {actions}
        </header>
        <main className={noPadding ? "" : "p-4"}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

---

## Sidebar Behavior

### States

| State | Width | Description |
|-------|-------|-------------|
| Expanded | 16rem (256px) | Full sidebar with text labels |
| Collapsed | 3rem (48px) | Icon-only mode |
| Mobile | 18rem (288px) | Sheet overlay |

### Persistence

Sidebar state is persisted via cookie:

```typescript
// Cookie name: sidebar_state
// Values: "expanded" | "collapsed"
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘B` / `Ctrl+B` | Toggle sidebar |
| `⌘1` | Switch to Finance |
| `⌘2` | Switch to Sales |
| `⌘3` | Switch to Team |
| `⌘4` | Switch to Projects |
| `⌘5` | Switch to Knowledge |

### Mobile Behavior

On mobile (< 768px):
- Sidebar renders as a Sheet (slide-out overlay)
- Trigger button in header opens/closes
- Dropdown menus position at bottom
- Touch-friendly sizing

---

## Context Providers

### UserProvider

Provides authenticated user data including workspace access:

```typescript
interface User {
  id: string
  email: string
  name: string
  workspaceId?: string
  workspaceName?: string
  workspaceRole?: "owner" | "admin" | "member"
  allowedProducts?: ProductId[]
  // ...
}

type ProductId = "finance" | "sales" | "team" | "projects" | "knowledge"
```

### Workspace-Specific Providers

| Provider | Workspace | Purpose |
|----------|-----------|---------|
| SalesProvider | Sales | Leads, pipelines, deals state |
| TeamProvider | Team | Channels, messages, agents |
| ProjectsProvider | Projects | Projects, tasks state |

---

## Team Workspace Special Layout

The Team workspace has a unique layout with a secondary sidebar:

```
┌──────────────────────────────────────────────────┐
│  Main Sidebar  │  TeamSidebar  │  Content Area   │
│                │               │                 │
│  [Workspace    │  Channels     │  Messages       │
│   Switcher]    │  - general    │                 │
│                │  - random     │                 │
│  [Nav Items]   │               │                 │
│                │  Direct Msgs  │                 │
│                │  - @user1     │                 │
│                │  - @user2     │                 │
│                │               │                 │
│  [User Menu]   │  AI Agents    │                 │
│                │  - Budget Bot │                 │
└──────────────────────────────────────────────────┘
```

TeamSidebar includes:
- Channel list with create button
- DM conversations with start button
- AI agents list with create button

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/(suite)/layout.tsx` | Authenticated route wrapper |
| `app/sales/layout.tsx` | Sales workspace layout |
| `app/team/layout.tsx` | Team workspace layout |
| `app/projects/layout.tsx` | Projects workspace layout |
| `components/app-sidebar.tsx` | Main sidebar component |
| `components/workspace-switcher.tsx` | Workspace dropdown |
| `components/nav-main.tsx` | Navigation menu |
| `components/nav-user.tsx` | User profile menu |
| `components/nav-projects.tsx` | Goals section (Finance) |
| `components/product-gate.tsx` | Access control |
| `components/dashboard-layout.tsx` | Page layout wrapper |
| `components/ui/sidebar.tsx` | Sidebar UI primitives |
| `providers/user-provider.tsx` | User context |

---

## Mobile App Considerations

For React Native, implement navigation using:

1. **Bottom Tab Navigator** for workspace switching
2. **Stack Navigator** within each workspace
3. **Drawer Navigator** for sidebar-like menu

```typescript
// Example structure for Expo Router
app/
├── (auth)/
│   └── login.tsx
├── (main)/
│   ├── _layout.tsx        // Tab navigator
│   ├── finance/
│   │   ├── _layout.tsx    // Stack navigator
│   │   ├── index.tsx      // Dashboard
│   │   └── accounts.tsx
│   ├── sales/
│   ├── team/
│   ├── projects/
│   └── knowledge/
```

Use the same `allowedProducts` check to show/hide tabs.
