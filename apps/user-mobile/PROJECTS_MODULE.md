# Projects Module Documentation

This document provides comprehensive documentation for building the Projects workspace in the mobile app.

## Overview

The Projects workspace is a full-featured project management system with Kanban boards, task management, milestones, timeline/Gantt views, team workload tracking, and knowledge base integration.

### Core Features

| Feature | Description |
|---------|-------------|
| Kanban Boards | Drag-and-drop task management across status columns |
| Task Management | Subtasks, dependencies, assignees, labels, comments |
| Milestones | Goal tracking with linked tasks and progress |
| Timeline/Gantt | Visual project scheduling |
| Calendar View | Month view of task due dates |
| Workload | Team capacity and utilization tracking |
| Knowledge Links | Attach docs and whiteboards to projects |
| Notifications | Real-time updates on assignments, comments, due dates |

---

## Routes & Screens

### Route Tree

```
/projects
├── / .......................... Landing (redirects to /all)
├── /all ....................... All Projects grid/list
├── /my-tasks .................. User's assigned tasks
├── /milestones ................ Global milestones view
├── /workload .................. Team capacity planning
├── /timeline .................. Global Gantt chart
├── /reports ................... Analytics & metrics
└── /[id]
    ├── / ...................... Kanban board (default)
    ├── /list .................. Task list view
    ├── /calendar .............. Month calendar view
    ├── /timeline .............. Project Gantt chart
    ├── /milestones ............ Project milestones
    ├── /settings .............. Project configuration
    └── /knowledge ............. Linked docs/whiteboards
```

### Screen Descriptions

#### Global Views

| Route | Screen | Purpose |
|-------|--------|---------|
| `/projects` | Landing | Redirect to /all or last viewed project |
| `/projects/all` | All Projects | Grid/list of all projects with filters |
| `/projects/my-tasks` | My Tasks | Tasks assigned to current user across all projects |
| `/projects/milestones` | Milestones | All milestones grouped by status |
| `/projects/workload` | Workload | Team capacity utilization |
| `/projects/timeline` | Timeline | Gantt chart of all project tasks |
| `/projects/reports` | Reports | Analytics dashboard |

#### Project Views

| Route | Screen | Purpose |
|-------|--------|---------|
| `/projects/[id]` | Kanban Board | Drag-drop task management |
| `/projects/[id]/list` | List View | Filterable, sortable task table |
| `/projects/[id]/calendar` | Calendar | Month view of task due dates |
| `/projects/[id]/timeline` | Timeline | Project-specific Gantt chart |
| `/projects/[id]/milestones` | Milestones | Manage project milestones |
| `/projects/[id]/settings` | Settings | Project configuration |
| `/projects/[id]/knowledge` | Knowledge | Linked documentation |

---

## API Endpoints

### Projects

#### List Projects
```
GET /api/projects
GET /api/projects?status=active
```

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "Project Name",
      "description": "Project description",
      "status": "active",
      "priority": "medium",
      "color": "#6366f1",
      "icon": "folder",
      "start_date": "2024-01-01",
      "target_end_date": "2024-12-31",
      "actual_end_date": null,
      "budget": 50000.00,
      "owner_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "owner": {
        "id": "uuid",
        "name": "Owner Name",
        "avatar_url": "https://..."
      },
      "project_members": [...],
      "tasks": [...],
      "progress": 45,
      "completedTasks": 9,
      "totalTasks": 20
    }
  ]
}
```

#### Create Project
```
POST /api/projects
```

**Request:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "status": "active",
  "priority": "medium",
  "color": "#6366f1",
  "icon": "folder",
  "start_date": "2024-01-01",
  "target_end_date": "2024-12-31",
  "budget": 50000.00
}
```

#### Get Project
```
GET /api/projects/[id]
```

**Response:** Full project with members, tasks, milestones, labels

#### Update Project
```
PATCH /api/projects/[id]
```

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "on_hold",
  "priority": "high",
  "color": "#10b981",
  "start_date": "2024-01-01",
  "target_end_date": "2024-12-31",
  "actual_end_date": "2024-11-30",
  "budget": 75000.00
}
```

#### Delete Project
```
DELETE /api/projects/[id]
```

---

### Project Members

#### List Members
```
GET /api/projects/[id]/members
```

**Response:**
```json
{
  "members": [
    {
      "id": "uuid",
      "role": "owner",
      "hours_per_week": 40,
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "name": "Member Name",
        "avatar_url": "https://...",
        "email": "member@example.com"
      }
    }
  ]
}
```

#### Add Member
```
POST /api/projects/[id]/members
```

**Request:**
```json
{
  "user_id": "uuid",
  "role": "member",
  "hours_per_week": 40
}
```

#### Remove Member
```
DELETE /api/projects/[id]/members?memberId=uuid
DELETE /api/projects/[id]/members?userId=uuid
```

---

### Tasks

#### List Tasks
```
GET /api/projects/[id]/tasks
GET /api/projects/[id]/tasks?status=in_progress
GET /api/projects/[id]/tasks?assignee=uuid
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "parent_id": null,
      "title": "Task Title",
      "description": "Task description",
      "status": "todo",
      "priority": "medium",
      "start_date": "2024-01-01",
      "due_date": "2024-01-15",
      "estimated_hours": 8,
      "actual_hours": null,
      "position": 0,
      "created_by": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "task_assignees": [
        {
          "id": "uuid",
          "user": {
            "id": "uuid",
            "name": "Assignee Name",
            "avatar_url": "https://..."
          }
        }
      ],
      "task_labels": [
        {
          "label": {
            "id": "uuid",
            "name": "Bug",
            "color": "#ef4444"
          }
        }
      ],
      "subtasks": [...],
      "dependencies": [...],
      "blocked_by": [...]
    }
  ]
}
```

#### Create Task
```
POST /api/projects/[id]/tasks
```

**Request:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "status": "todo",
  "priority": "medium",
  "start_date": "2024-01-01",
  "due_date": "2024-01-15",
  "estimated_hours": 8,
  "parent_id": null,
  "assignees": ["uuid1", "uuid2"],
  "labels": ["uuid1"],
  "position": 0
}
```

#### Get Task
```
GET /api/projects/[id]/tasks/[taskId]
```

**Response:** Full task with assignees, labels, subtasks, dependencies, comments, attachments

#### Update Task
```
PATCH /api/projects/[id]/tasks/[taskId]
```

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "start_date": "2024-01-01",
  "due_date": "2024-01-15",
  "estimated_hours": 10,
  "actual_hours": 5,
  "position": 1,
  "assignees": ["uuid1", "uuid2"],
  "labels": ["uuid1"]
}
```

#### Delete Task
```
DELETE /api/projects/[id]/tasks/[taskId]
```

---

### Task Comments

#### List Comments
```
GET /api/projects/[id]/tasks/[taskId]/comments
```

**Response:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "content": "Comment text",
      "parent_id": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "name": "User Name",
        "avatar_url": "https://..."
      },
      "replies": [
        {
          "id": "uuid",
          "content": "Reply text",
          "parent_id": "uuid",
          "created_at": "2024-01-02T00:00:00Z",
          "user": {...}
        }
      ]
    }
  ]
}
```

#### Add Comment
```
POST /api/projects/[id]/tasks/[taskId]/comments
```

**Request:**
```json
{
  "content": "Comment text",
  "parent_id": null
}
```

---

### Milestones

#### List Milestones
```
GET /api/projects/[id]/milestones
```

**Response:**
```json
{
  "milestones": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "Milestone Name",
      "description": "Milestone description",
      "target_date": "2024-01-31",
      "status": "upcoming",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "milestone_tasks": [
        {
          "task": {
            "id": "uuid",
            "title": "Task Title",
            "status": "in_progress"
          }
        }
      ],
      "progress": 50,
      "completedTasks": 1,
      "totalTasks": 2
    }
  ]
}
```

#### Create Milestone
```
POST /api/projects/[id]/milestones
```

**Request:**
```json
{
  "name": "Milestone Name",
  "description": "Milestone description",
  "target_date": "2024-01-31",
  "tasks": ["uuid1", "uuid2"]
}
```

---

### Activity Feed

#### Get Activity
```
GET /api/projects/[id]/activity
GET /api/projects/[id]/activity?limit=50&offset=0
```

**Response:**
```json
{
  "activity": [
    {
      "id": "uuid",
      "action": "created",
      "entity_type": "task",
      "entity_id": "uuid",
      "metadata": {
        "title": "Task Title",
        "fields": ["title", "description"]
      },
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "name": "User Name",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

**Actions:** `created`, `updated`, `deleted`, `commented`, `assigned`, `added_member`

**Entity Types:** `project`, `task`, `milestone`, `comment`

---

### Knowledge Links

#### List Knowledge
```
GET /api/projects/[id]/knowledge
```

**Response:**
```json
{
  "pages": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "linked_by": "uuid",
      "page": {
        "id": "uuid",
        "title": "Page Title",
        "icon": "book",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      "linker": {
        "id": "uuid",
        "name": "Linker Name",
        "avatar_url": "https://..."
      }
    }
  ],
  "whiteboards": [
    {
      "id": "uuid",
      "whiteboard": {
        "id": "uuid",
        "title": "Whiteboard Title",
        "icon": "canvas",
        "thumbnail": "https://..."
      },
      "linker": {...}
    }
  ]
}
```

#### Link Knowledge
```
POST /api/projects/[id]/knowledge
```

**Request:**
```json
{
  "type": "page",
  "itemId": "uuid"
}
```

**Type Values:** `page`, `whiteboard`

#### Unlink Knowledge
```
DELETE /api/projects/[id]/knowledge?type=page&itemId=uuid
```

---

### Notifications

#### Get Notifications
```
GET /api/projects/notifications
GET /api/projects/notifications?unread=true&limit=50
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "task_assigned",
      "title": "New task assigned",
      "message": "You have been assigned to \"Task Title\"",
      "read_at": null,
      "created_at": "2024-01-01T00:00:00Z",
      "project": {
        "id": "uuid",
        "name": "Project Name",
        "color": "#6366f1"
      },
      "task": {
        "id": "uuid",
        "title": "Task Title"
      },
      "milestone": null,
      "actor": {
        "id": "uuid",
        "full_name": "Actor Name",
        "avatar_url": "https://..."
      }
    }
  ],
  "unreadCount": 5
}
```

**Notification Types:**
- `task_assigned`
- `task_due_soon`
- `task_overdue`
- `task_completed`
- `task_comment`
- `task_mention`
- `milestone_approaching`
- `milestone_completed`
- `project_member_added`
- `project_status_changed`

#### Mark as Read
```
PATCH /api/projects/notifications
```

**Request:**
```json
{
  "notificationIds": ["uuid1", "uuid2"],
  "markAllRead": false
}
```

---

## Data Models

### Project

```typescript
interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  color: string                    // hex color
  icon: string | null
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  budget: number | null
  owner_id: string | null
  created_at: string
  updated_at: string

  // Joined data
  owner?: User
  project_members?: ProjectMember[]
  tasks?: Task[]
  milestones?: Milestone[]
  project_labels?: ProjectLabel[]

  // Computed
  progress?: number                // 0-100
  completedTasks?: number
  totalTasks?: number
}

type ProjectStatus = "active" | "on_hold" | "completed" | "archived"
type ProjectPriority = "low" | "medium" | "high" | "critical"
```

### Task

```typescript
interface Task {
  id: string
  project_id: string
  parent_id: string | null         // for subtasks
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  position: number                 // for ordering in Kanban
  created_by: string
  created_at: string
  updated_at: string

  // Joined data
  task_assignees?: TaskAssignee[]
  task_labels?: TaskLabel[]
  subtasks?: Task[]
  dependencies?: TaskDependency[]
  blocked_by?: TaskDependency[]
  task_comments?: TaskComment[]
  task_attachments?: TaskAttachment[]
  created_by_user?: User
}

type TaskStatus = "todo" | "in_progress" | "review" | "done"
type TaskPriority = "low" | "medium" | "high" | "urgent"
```

### Task Assignee

```typescript
interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
  created_at: string
  user: {
    id: string
    name: string
    avatar_url: string | null
    email?: string
  }
}
```

### Task Dependency

```typescript
interface TaskDependency {
  id: string
  task_id: string
  depends_on_id: string
  dependency_type: DependencyType
  created_at: string
  depends_on?: Task
}

type DependencyType =
  | "finish_to_start"    // A must finish before B starts
  | "start_to_start"     // A must start before B starts
  | "finish_to_finish"   // A must finish before B finishes
  | "start_to_finish"    // A must start before B finishes
```

### Milestone

```typescript
interface Milestone {
  id: string
  project_id: string
  name: string
  description: string | null
  target_date: string
  status: MilestoneStatus
  created_at: string
  updated_at: string

  // Joined data
  milestone_tasks?: { task: Task }[]

  // Computed
  progress?: number
  completedTasks?: number
  totalTasks?: number
}

type MilestoneStatus = "upcoming" | "at_risk" | "completed" | "missed"
```

### Project Member

```typescript
interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  hours_per_week: number          // for workload calculation
  created_at: string
  user: {
    id: string
    name: string
    avatar_url: string | null
    email?: string
  }
}

type MemberRole = "owner" | "admin" | "member" | "viewer"
```

### Project Label

```typescript
interface ProjectLabel {
  id: string
  project_id: string
  name: string
  color: string                   // hex color
  created_at: string
}

interface TaskLabel {
  task_id: string
  label_id: string
  label: ProjectLabel
}
```

### Task Comment

```typescript
interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  parent_id: string | null        // for threaded replies
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    avatar_url: string | null
  }
  replies?: TaskComment[]
}
```

### Task Attachment

```typescript
interface TaskAttachment {
  id: string
  task_id: string
  name: string
  file_url: string
  file_type: string               // MIME type
  file_size: number               // bytes
  uploaded_by: string
  created_at: string
}
```

### Project Activity

```typescript
interface ProjectActivity {
  id: string
  project_id: string
  user_id: string
  action: ActivityAction
  entity_type: EntityType
  entity_id: string
  metadata: object                // action-specific data
  created_at: string
  user?: User
}

type ActivityAction = "created" | "updated" | "deleted" | "commented" | "assigned" | "added_member"
type EntityType = "project" | "task" | "milestone" | "comment"
```

---

## Features by Screen

### All Projects (`/projects/all`)

**Features:**
- Grid and list view toggle
- Search projects by name
- Filter by status (All, Active, On Hold, Completed, Archived)
- Statistics cards (Total, Active, Total Tasks, Team Members)
- Create new project button
- Project cards showing:
  - Color-coded icon
  - Name and description
  - Status badge
  - Priority indicator
  - Progress bar
  - Team member avatars (stacked)
  - Due date
- Bulk operations (Archive, Delete)

**UI Elements:**
- View toggle (grid/list icons)
- Search input
- Filter dropdown
- Stats cards row
- Project grid/list
- Empty state with CTA

### My Tasks (`/projects/my-tasks`)

**Features:**
- Task statistics (To Do, In Progress, Review, Done, Overdue)
- Search tasks
- Filter by status
- Tasks grouped by due date:
  - Overdue (red highlight)
  - Today
  - Tomorrow
  - This Week
  - Later
  - No Due Date
- Links to parent project
- Click to open task detail

**UI Elements:**
- Stats cards
- Search input
- Status filter tabs
- Grouped task lists
- Task cards with project context

### Milestones (`/projects/milestones`)

**Features:**
- Statistics (Total, Upcoming, At Risk, Completed, Missed)
- Milestones grouped by status:
  - At Risk (shown first, red)
  - Upcoming (yellow)
  - Completed (green)
  - Missed (gray)
- Each milestone shows:
  - Name and status badge
  - Target date
  - Project name link
  - Description
  - Progress bar
  - Task completion count
  - Days until/overdue

### Workload (`/projects/workload`)

**Features:**
- Time period selector (This Week / This Month)
- Team statistics (Members, Total Hours, Overloaded, Available)
- Team member capacity cards:
  - Avatar and name
  - "Overloaded" badge if >100% utilization
  - Capacity bar (allocated vs available hours)
  - Task count and project count
  - Status breakdown (todo, in_progress, review)
- Color-coded utilization:
  - Red: >100%
  - Amber: >80%
  - Green: healthy

**Calculation:** Default capacity is 40 hours/week per member

### Timeline/Gantt (`/projects/timeline`)

**Features:**
- Date range navigation (Previous, Today, Next)
- Zoom levels (Day, Week, Month)
- Sticky task column with:
  - Task title
  - Project name
  - Status badge
  - Assignee avatars
- Scrollable date columns
- Color-coded task bars by status
- Weekend highlighting
- Today line indicator

### Reports (`/projects/reports`)

**Features:**
- Time range filter (This Week, This Month, This Quarter)
- Overview statistics:
  - Total Projects
  - Total Tasks
  - Completion Rate %
  - Overdue Tasks
- Task Distribution chart (by status)
- Project Status chart (by status)
- Project Progress table:
  - Project name
  - Total tasks
  - Completed tasks
  - Progress bar
- Summary stats: Estimated Hours, Completed, In Progress

---

### Kanban Board (`/projects/[id]`)

**Features:**
- Four columns: To Do, In Progress, Review, Done
- Drag-and-drop tasks between columns
- Column features:
  - Task count badge
  - Sort by priority/due date
  - Move all tasks
  - Archive completed
  - Add task button
- Task cards showing:
  - Priority badge (colored, pulse animation for urgent)
  - Title
  - Labels (colored chips)
  - Assignee avatars (stacked)
  - Due date (red if overdue)
  - Subtask progress bar
  - Quick actions (edit, move, delete)

**Drag-Drop Behavior:**
- Drag from any column to any other
- Drop placeholder shows insertion point
- Optimistic update with rollback on error
- Smooth bounce animation

### List View (`/projects/[id]/list`)

**Features:**
- Search by title/description
- Filters: Status, Priority
- Sort by: Title, Status, Priority, Due Date, Created Date
- Sort direction toggle (asc/desc)
- Checkbox selection for bulk operations
- Bulk actions: Change Status, Delete
- Table columns:
  - Checkbox
  - Task (title, labels)
  - Status (badge)
  - Priority (badge)
  - Due Date
  - Assignees (avatars)
  - Actions menu
- Click row to open task detail sheet

### Calendar View (`/projects/[id]/calendar`)

**Features:**
- Month navigation (Previous, Today, Next)
- 7-column calendar grid (Sun-Sat)
- Task dots/badges on due dates
- Color-coded by status
- Day shows up to 3 tasks with "+N more"
- Click task to view details
- Monthly task summary legend
- Highlight today
- Gray out other months

### Project Timeline (`/projects/[id]/timeline`)

**Features:**
- Same as global timeline but filtered to project
- Task bars based on start_date to due_date
- Zoom controls (Day, Week, Month)
- Date navigation

### Project Milestones (`/projects/[id]/milestones`)

**Features:**
- Statistics (Upcoming, At Risk, Completed, Missed)
- Create milestone dialog:
  - Name
  - Description
  - Target date
- Milestone cards:
  - Status badge with icon
  - Target date
  - Description
  - Progress bar
  - Task completion count
  - Days until/overdue
  - Linked tasks preview (up to 3)
- Edit and delete actions

### Project Settings (`/projects/[id]/settings`)

**Sections:**

1. **General Settings:**
   - Project name (input)
   - Description (textarea)
   - Status (dropdown)
   - Priority (dropdown)
   - Color (10-color picker)

2. **Timeline & Budget:**
   - Start date (date picker)
   - Target end date (date picker)
   - Budget (number input)

3. **Team Members:**
   - Member list with avatars
   - Name, email, role
   - Add member button
   - Remove member button

4. **Danger Zone:**
   - Archive project button
   - Delete project button (with confirmation)

### Project Knowledge (`/projects/[id]/knowledge`)

**Features:**
- Statistics (Total Items, Pages, Whiteboards)
- Sections:
  - Pages (linked documentation)
  - Whiteboards (linked whiteboards)
- Each item shows:
  - Icon/emoji
  - Title
  - Last updated date
  - Open in new window button
  - Unlink button
- Attach Knowledge button → dialog
- Dialog features:
  - Search
  - Tabs (Pages/Whiteboards)
  - Multi-select
  - Shows already linked items as disabled

---

## Components Reference

### KanbanBoard

Full drag-and-drop task board using dnd-kit.

```typescript
interface KanbanBoardProps {
  projectId: string
}
```

**Features:**
- DragOverlay with bounce animation
- Drop placeholder with pulse
- Column sorting and actions
- Optimistic updates
- 4 status columns

### CreateProjectDialog

Dialog for creating new projects.

```typescript
interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Fields:**
- Name (required)
- Description
- Priority (dropdown)
- Color (10-color picker)
- Start date
- Target end date

### CreateTaskDialog

Dialog for creating new tasks.

```typescript
interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultStatus?: TaskStatus
  members?: ProjectMember[]
}
```

**Fields:**
- Title (required)
- Description
- Status (dropdown)
- Priority (dropdown)
- Due date
- Estimated hours
- Assignees (multi-select)

### TaskDetailSheet

Slide-in sheet for viewing/editing tasks.

```typescript
interface TaskDetailSheetProps {
  task: Task | null
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  members?: ProjectMember[]
}
```

**Features:**
- Auto-save on blur
- Status/priority selectors (save on change)
- Due date picker
- Estimated hours input
- Assignee management (add/remove)
- Labels display
- Subtasks with completion toggle
- Add subtask inline
- Comments section
- Delete task

### ProjectHeader

Header bar for project views.

```typescript
interface ProjectHeaderProps {
  project: Project
}
```

**Features:**
- Project icon (color background)
- Name and status badge
- Description
- Team avatars with invite button
- Due date
- Progress bar
- View tabs (Board, List, Timeline, Calendar, Milestones, Knowledge)
- Actions menu (Settings, Archive, Delete)

### AttachKnowledgeDialog

Dialog for linking knowledge items.

```typescript
interface AttachKnowledgeDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedPageIds: string[]
  linkedWhiteboardIds: string[]
  onAttach: () => void
}
```

**Features:**
- Search input
- Tabs (Pages/Whiteboards) with counts
- Checkbox multi-select
- Already linked items shown as disabled
- Batch attach on confirm

### ProjectNotificationsDropdown

Notifications bell with dropdown.

**Features:**
- Badge with unread count (9+ format)
- Notification list:
  - Actor avatar
  - Type icon
  - Title and message
  - Time ago
  - Unread dot
- Mark individual as read
- Mark all as read
- Polling every 30 seconds
- Click notification → navigate to context

---

## Mobile Adaptation Guide

### Navigation Structure

```typescript
// Using Expo Router
app/
├── (main)/
│   └── projects/
│       ├── _layout.tsx          // Stack navigator
│       ├── index.tsx            // All projects
│       ├── my-tasks.tsx         // My tasks
│       ├── milestones.tsx       // Global milestones
│       ├── workload.tsx         // Team workload
│       ├── timeline.tsx         // Global timeline
│       ├── reports.tsx          // Reports
│       └── [id]/
│           ├── _layout.tsx      // Tabs or stack
│           ├── index.tsx        // Kanban
│           ├── list.tsx         // List view
│           ├── calendar.tsx     // Calendar
│           ├── timeline.tsx     // Project timeline
│           ├── milestones.tsx   // Project milestones
│           ├── settings.tsx     // Settings
│           └── knowledge.tsx    // Knowledge links
```

### Kanban Board (Mobile)

**Recommended Pattern:**
- Horizontal ScrollView for columns
- Column width = screen width - padding (swipeable)
- Or use a tab/segment control to switch columns
- Task cards as pressable components
- Long press for drag-and-drop (react-native-draggable-flatlist)
- Swipe actions on cards (edit, delete)

```typescript
// Alternative: Column tabs
<SegmentedControl
  values={['To Do', 'In Progress', 'Review', 'Done']}
  selectedIndex={columnIndex}
  onChange={setColumnIndex}
/>
<FlatList
  data={tasks.filter(t => t.status === columns[columnIndex])}
  renderItem={({ item }) => <TaskCard task={item} />}
/>
```

### Task Detail (Mobile)

**Recommended Pattern:**
- Full-screen modal (push navigation)
- ScrollView for content
- Bottom sheet for actions
- Auto-save on input blur
- Native pickers for date/status/priority

```typescript
<Stack.Screen
  name="task-detail"
  options={{
    presentation: 'modal',
    gestureEnabled: true,
    animation: 'slide_from_bottom'
  }}
/>
```

### Calendar (Mobile)

**Options:**
- Use `react-native-calendars` library
- Dot indicators for tasks
- Day press → show task list for that day
- Agenda view as alternative

### Timeline/Gantt (Mobile)

**Challenges:**
- Complex to implement in RN
- Consider simplified list view with dates
- Or use horizontal ScrollView with fixed task labels

**Libraries:**
- `react-native-calendar-heatmap` (simplified)
- Custom implementation with `react-native-reanimated`

### Offline Support

**Strategy:**
1. Cache projects and tasks in AsyncStorage/MMKV
2. Queue mutations when offline
3. Sync on reconnect
4. Show offline indicator
5. Conflict resolution (server wins)

```typescript
// Offline task queue
interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'task' | 'comment'
  payload: object
  timestamp: number
}
```

### Push Notifications

**When to send:**
- Task assigned to user
- Task due in 24 hours
- Task overdue
- Comment on user's task
- @mention in comment
- Milestone approaching (3 days)
- Milestone completed/missed

**Notification payload:**
```json
{
  "title": "Task Assigned",
  "body": "You've been assigned to \"Design homepage\"",
  "data": {
    "type": "task_assigned",
    "projectId": "uuid",
    "taskId": "uuid"
  }
}
```

**Deep linking:**
- Parse notification data
- Navigate to project/task
- Handle when app is backgrounded/closed

### Performance Tips

1. **Project List:**
   - Pagination for large workspaces
   - Virtualized lists (FlatList)
   - Skeleton loading states

2. **Task Cards:**
   - Memoize components
   - Avoid inline styles/functions
   - Lazy load avatars

3. **Drag-Drop:**
   - Use `react-native-reanimated` for smooth animations
   - Haptic feedback on drag start/drop

4. **Images:**
   - Use `expo-image` for caching
   - Thumbnails for attachments

---

## Status Colors Reference

### Project Status
| Status | Color |
|--------|-------|
| Active | Emerald (`#10b981`) |
| On Hold | Amber (`#f59e0b`) |
| Completed | Blue (`#3b82f6`) |
| Archived | Gray (`#6b7280`) |

### Task Status
| Status | Color |
|--------|-------|
| To Do | Gray (`#6b7280`) |
| In Progress | Blue (`#3b82f6`) |
| Review | Purple (`#8b5cf6`) |
| Done | Emerald (`#10b981`) |

### Task Priority
| Priority | Color |
|----------|-------|
| Low | Gray (`#6b7280`) |
| Medium | Blue (`#3b82f6`) |
| High | Amber (`#f59e0b`) |
| Urgent | Red (`#ef4444`) |

### Milestone Status
| Status | Color |
|--------|-------|
| Upcoming | Blue (`#3b82f6`) |
| At Risk | Red (`#ef4444`) |
| Completed | Emerald (`#10b981`) |
| Missed | Gray (`#6b7280`) |

---

## Key Files Reference (Web)

| File | Purpose |
|------|---------|
| `app/projects/layout.tsx` | Projects workspace layout |
| `app/projects/all/page.tsx` | All projects view |
| `app/projects/my-tasks/page.tsx` | User's tasks |
| `app/projects/milestones/page.tsx` | Global milestones |
| `app/projects/workload/page.tsx` | Team workload |
| `app/projects/timeline/page.tsx` | Global timeline |
| `app/projects/reports/page.tsx` | Reports/analytics |
| `app/projects/[id]/page.tsx` | Kanban board |
| `app/projects/[id]/list/page.tsx` | List view |
| `app/projects/[id]/calendar/page.tsx` | Calendar view |
| `app/projects/[id]/timeline/page.tsx` | Project timeline |
| `app/projects/[id]/milestones/page.tsx` | Project milestones |
| `app/projects/[id]/settings/page.tsx` | Project settings |
| `app/projects/[id]/knowledge/page.tsx` | Knowledge links |
| `components/projects/kanban-board.tsx` | Kanban component |
| `components/projects/create-project-dialog.tsx` | Create project |
| `components/projects/create-task-dialog.tsx` | Create task |
| `components/projects/task-detail-sheet.tsx` | Task detail |
| `components/projects/project-header.tsx` | Project header |
| `components/projects/attach-knowledge-dialog.tsx` | Attach knowledge |
| `components/projects/notifications-dropdown.tsx` | Notifications |
| `components/projects/skeletons.tsx` | Loading states |
| `providers/projects-provider.tsx` | Projects context |
