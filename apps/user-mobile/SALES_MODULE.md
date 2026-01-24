# Sales Module - Mobile Development Guide

Complete documentation for building the Sales/CRM workspace in React Native/Expo.

---

## Module Overview

The Sales module provides full CRM functionality:

| Feature | Description |
|---------|-------------|
| **Pipeline** | Kanban board for deal management |
| **Leads** | Company/prospect management |
| **Contacts** | People within leads |
| **Deals** | Sales opportunities with values |
| **Activities** | Calls, emails, meetings, tasks |
| **Communications** | SMS and voice calls (Twilio) |
| **Workflows** | Sales automation |
| **Inbox** | Unified task triage |

---

## Routes & Screens

```
/sales
├── / ........................... Dashboard/Landing
├── /pipeline ................... Deal Pipeline (Kanban)
├── /leads
│   ├── / ....................... Lead List (Table/Kanban)
│   └── /[id] ................... Lead Detail
├── /contacts ................... All Contacts
├── /deals ...................... Deal List
├── /activities ................. Activity Log
├── /communications ............. SMS/Call Threads
├── /conversations .............. Customer Communications
├── /inbox
│   ├── / ....................... Inbox Items
│   ├── /done ................... Completed Items
│   └── /future ................. Scheduled Items
├── /opportunities .............. Sales Opportunities
├── /workflows
│   ├── / ....................... Workflow List
│   └── /[id] ................... Workflow Builder
├── /reports
│   ├── / ....................... Reports Overview
│   ├── /pipeline ............... Pipeline Report
│   ├── /sources ................ Lead Sources
│   ├── /forecast ............... Revenue Forecast
│   └── /activity ............... Activity Report
├── /customize
│   ├── / ....................... Settings Overview
│   └── (tabs) .................. Custom Fields, Statuses, Pipelines
└── /settings
    └── /phone-numbers .......... Twilio Number Management
```

---

## Data Models

### Lead

```typescript
interface Lead {
  id: string
  user_id: string
  name: string                    // Company name
  website?: string
  industry?: string
  status: string                  // new, contacted, qualified, won, lost
  notes?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  pipeline_id?: string
  stage_id?: string
  created_at: string
  updated_at: string
}

interface LeadWithRelations extends Lead {
  contacts: Contact[]
  activities: Activity[]
  tasks: LeadTask[]
  opportunities: LeadOpportunity[]
  stage?: LeadPipelineStage
  contactCount: number
}
```

### Contact

```typescript
interface Contact {
  id: string
  lead_id: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string                  // E.164 format
  title?: string                  // Job title
  notes?: string
  created_at: string
  updated_at: string
}
```

### Deal

```typescript
interface Deal {
  id: string
  profile_id: string
  contact_id?: string
  pipeline_id?: string
  stage_id?: string
  name: string
  value?: number
  currency: string               // USD, EUR, etc.
  expected_close_date?: string
  actual_close_date?: string
  status: 'open' | 'won' | 'lost'
  probability?: number           // 0-100
  notes?: string
  created_at: string
  updated_at: string
}

interface DealWithRelations extends Deal {
  contact?: Contact
  stage?: PipelineStage
}
```

### Activity

```typescript
interface Activity {
  id: string
  profile_id: string
  contact_id?: string
  deal_id?: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task'
  subject?: string
  description?: string
  due_date?: string
  completed_at?: string
  is_completed: boolean
  created_at: string
  updated_at: string
}
```

### LeadTask

```typescript
interface LeadTask {
  id: string
  lead_id: string
  user_id: string
  title: string
  description?: string
  due_date?: string
  is_completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}
```

### LeadOpportunity

```typescript
interface LeadOpportunity {
  id: string
  lead_id: string
  user_id: string
  name: string
  value?: number
  stage: string                  // prospect, qualified, proposal, negotiation, closed_won, closed_lost
  probability: number
  expected_close_date?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

### Pipeline & Stages

```typescript
// Lead Pipeline
interface LeadPipeline {
  id: string
  user_id: string
  name: string
  description?: string
  is_default: boolean
  stages: LeadPipelineStage[]
  created_at: string
  updated_at: string
}

interface LeadPipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string                  // Hex color
  position: number
  is_won: boolean
  is_lost: boolean
}

// Deal Pipeline
interface Pipeline {
  id: string
  profile_id: string
  name: string
  stages: PipelineStage[]
}

interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string
  position: number
  win_probability: number        // 0-100
}
```

### Communication

```typescript
interface Communication {
  id: string
  user_id: string
  lead_id?: string
  contact_id?: string
  type: 'sms' | 'call'
  direction: 'inbound' | 'outbound'
  twilio_sid?: string
  twilio_status?: string
  from_number: string            // E.164 format
  to_number: string              // E.164 format
  body?: string                  // SMS body
  media_urls?: string[]
  duration_seconds?: number      // Call duration
  recording_url?: string
  recording_sid?: string
  error_code?: string
  error_message?: string
  triggered_by: 'manual' | 'workflow' | 'inbound'
  workflow_id?: string
  created_at: string
  updated_at: string
}

interface ConversationThread {
  id: string
  user_id: string
  lead_id?: string
  contact_id?: string
  phone_number: string
  last_message_at?: string
  unread_count: number
  is_archived: boolean
  lead?: { id: string; name: string }
  contact?: { id: string; first_name: string; last_name: string }
  last_message?: {
    id: string
    type: string
    direction: string
    body?: string
    created_at: string
  }
  created_at: string
  updated_at: string
}
```

### Workflow

```typescript
interface Workflow {
  id: string
  user_id: string
  name: string
  description?: string
  trigger_type: string           // lead_created, stage_changed, etc.
  trigger_config?: Record<string, any>
  is_active: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  created_at: string
  updated_at: string
}

interface WorkflowAction {
  id: string
  type: string                   // send_email, create_task, update_status, create_note
  config: Record<string, any>
  order: number
}
```

### Data Relationships

```
User/Profile
├── Leads (user_id)
│   ├── Contacts (lead_id)
│   │   └── Communications (contact_id)
│   ├── LeadTasks (lead_id)
│   ├── LeadOpportunities (lead_id)
│   └── LeadPipeline (via pipeline_id)
│       └── LeadPipelineStages
│
├── Deals (profile_id)
│   ├── Contact (contact_id)
│   ├── Pipeline (pipeline_id)
│   │   └── PipelineStages
│   └── Activities (deal_id)
│
├── Activities (profile_id)
│   ├── Contact (contact_id)
│   └── Deal (deal_id)
│
├── Communications (user_id)
│   ├── Lead (lead_id)
│   ├── Contact (contact_id)
│   └── CallRecordings
│
├── ConversationThreads (user_id)
│
├── Workflows (user_id)
│
├── LeadStatuses (user_id)
│
└── CustomFields (user_id)
```

---

## API Endpoints

### Leads

#### GET /api/leads
List all leads with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `search` | string | Search by name |
| `pipeline_id` | string | Filter by pipeline |
| `stage_id` | string | Filter by stage |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "TechCorp Inc",
    "website": "https://techcorp.com",
    "industry": "Technology",
    "status": "qualified",
    "pipeline_id": "uuid",
    "stage_id": "uuid",
    "contactCount": 3,
    "stage": {
      "id": "uuid",
      "name": "Qualified",
      "color": "#3b82f6",
      "position": 2
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### POST /api/leads
Create a new lead.

**Request:**
```json
{
  "name": "TechCorp Inc",
  "website": "https://techcorp.com",
  "industry": "Technology",
  "status": "new",
  "notes": "Met at conference",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "pipeline_id": "uuid",
  "stage_id": "uuid"
}
```

#### GET /api/leads/[id]
Get lead with all relations (contacts, activities, tasks, opportunities).

#### PATCH /api/leads/[id]
Update lead details.

#### DELETE /api/leads/[id]
Delete lead (cascades to contacts, tasks, opportunities).

#### PATCH /api/leads/[id]/stage
Move lead to different pipeline stage (for kanban drag-drop).

**Request:**
```json
{
  "stage_id": "uuid",
  "pipeline_id": "uuid"
}
```

---

### Lead Tasks

#### GET /api/leads/[id]/tasks
List tasks for a lead.

#### POST /api/leads/[id]/tasks
Create a task.

**Request:**
```json
{
  "title": "Follow up call",
  "description": "Discuss pricing",
  "due_date": "2024-02-01T14:00:00Z"
}
```

#### PATCH /api/leads/[id]/tasks/[taskId]
Update task (e.g., mark complete).

#### DELETE /api/leads/[id]/tasks/[taskId]
Delete task.

---

### Lead Opportunities

#### GET /api/leads/[id]/opportunities
List opportunities for a lead.

#### POST /api/leads/[id]/opportunities
Create an opportunity.

**Request:**
```json
{
  "name": "Enterprise License",
  "value": 50000,
  "stage": "proposal",
  "probability": 60,
  "expected_close_date": "2024-03-15"
}
```

#### PATCH /api/leads/[id]/opportunities/[opportunityId]
Update opportunity.

#### DELETE /api/leads/[id]/opportunities/[opportunityId]
Delete opportunity.

---

### Contacts

#### GET /api/contacts
List all contacts.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `lead_id` | string | Filter by lead |
| `search` | string | Search name/email |

**Response:**
```json
[
  {
    "id": "uuid",
    "lead_id": "uuid",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@techcorp.com",
    "phone": "+14155551234",
    "title": "CTO",
    "lead": {
      "id": "uuid",
      "name": "TechCorp Inc"
    }
  }
]
```

#### POST /api/contacts
Create a contact.

**Request:**
```json
{
  "lead_id": "uuid",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john@techcorp.com",
  "phone": "+14155551234",
  "title": "CTO"
}
```

#### PATCH /api/contacts/[id]
Update contact.

#### DELETE /api/contacts/[id]
Delete contact.

---

### Lead Pipelines

#### GET /api/lead-pipelines
List all pipelines with stages.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Default Pipeline",
    "is_default": true,
    "stages": [
      { "id": "uuid", "name": "Lead", "color": "#6b7280", "position": 0 },
      { "id": "uuid", "name": "Qualified", "color": "#3b82f6", "position": 1 },
      { "id": "uuid", "name": "Proposal", "color": "#eab308", "position": 2 },
      { "id": "uuid", "name": "Negotiation", "color": "#f97316", "position": 3 },
      { "id": "uuid", "name": "Closed Won", "color": "#22c55e", "position": 4, "is_won": true }
    ]
  }
]
```

#### POST /api/lead-pipelines
Create a pipeline.

**Request:**
```json
{
  "name": "Enterprise Sales",
  "is_default": false,
  "stages": [
    { "name": "Discovery", "color": "#6b7280" },
    { "name": "Demo", "color": "#3b82f6" },
    { "name": "Proposal", "color": "#eab308" },
    { "name": "Closed", "color": "#22c55e", "is_won": true }
  ]
}
```

#### POST /api/lead-pipelines/[id]/stages
Add a stage to pipeline.

#### PATCH /api/lead-pipelines/[id]/stages
Bulk update/reorder stages.

#### DELETE /api/lead-pipelines/[id]/stages?stageId=xxx
Delete a stage.

---

### Deals

#### GET /api/deals
List all deals.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pipeline_id` | string | Filter by pipeline |

**Response:**
```json
{
  "deals": [
    {
      "id": "uuid",
      "name": "Enterprise License",
      "value": 50000,
      "currency": "USD",
      "status": "open",
      "probability": 75,
      "expected_close_date": "2024-03-15",
      "contact": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Smith"
      },
      "stage": {
        "id": "uuid",
        "name": "Negotiation",
        "color": "#f97316",
        "win_probability": 75
      }
    }
  ]
}
```

#### POST /api/deals
Create a deal.

**Request:**
```json
{
  "name": "Enterprise License",
  "contact_id": "uuid",
  "pipeline_id": "uuid",
  "stage_id": "uuid",
  "value": 50000,
  "expected_close_date": "2024-03-15"
}
```

#### PATCH /api/deals/[id]
Update deal.

#### DELETE /api/deals/[id]
Delete deal.

#### PATCH /api/deals/[id]/stage
Move deal to different stage (auto-updates probability).

**Request:**
```json
{
  "stage_id": "uuid"
}
```

---

### Activities

#### GET /api/activities
List activities.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `deal_id` | string | Filter by deal |
| `contact_id` | string | Filter by contact |

#### POST /api/activities
Create an activity.

**Request:**
```json
{
  "type": "call",
  "subject": "Discovery call",
  "description": "Discussed requirements",
  "contact_id": "uuid",
  "deal_id": "uuid",
  "due_date": "2024-02-01T14:00:00Z"
}
```

#### PATCH /api/activities/[id]
Update activity (e.g., mark complete).

#### DELETE /api/activities/[id]
Delete activity.

#### GET /api/leads/[id]/activities
List activities for a lead.

#### POST /api/leads/[id]/activities
Create activity for a lead.

---

### Communications

#### GET /api/communications
List communications (SMS/calls).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `leadId` | string | Filter by lead |
| `contactId` | string | Filter by contact |
| `type` | string | sms or call |
| `limit` | number | Page size (default 50) |
| `offset` | number | Pagination offset |

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "sms",
    "direction": "outbound",
    "from_number": "+14155550001",
    "to_number": "+14155551234",
    "body": "Hi John, following up on our call...",
    "twilio_status": "delivered",
    "created_at": "2024-01-15T10:00:00Z"
  },
  {
    "id": "uuid",
    "type": "call",
    "direction": "outbound",
    "from_number": "+14155550001",
    "to_number": "+14155551234",
    "duration_seconds": 300,
    "twilio_status": "completed",
    "recording_sid": "RE...",
    "created_at": "2024-01-15T09:00:00Z"
  }
]
```

#### POST /api/communications/sms
Send an SMS.

**Request:**
```json
{
  "to": "+14155551234",
  "from": "+14155550001",
  "body": "Hi John, following up...",
  "lead_id": "uuid",
  "contact_id": "uuid"
}
```

#### POST /api/communications/call
Initiate an outbound call.

**Request:**
```json
{
  "to": "+14155551234",
  "from": "+14155550001",
  "lead_id": "uuid",
  "contact_id": "uuid"
}
```

#### GET /api/communications/threads
List conversation threads.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `includeArchived` | boolean | Include archived |
| `limit` | number | Page size |
| `offset` | number | Pagination offset |

#### PATCH /api/communications/threads
Update thread (mark read, archive).

**Request:**
```json
{
  "threadId": "uuid",
  "markAsRead": true,
  "archive": false
}
```

---

### Workflows

#### GET /api/workflows
List all workflows.

#### POST /api/workflows
Create a workflow.

**Request:**
```json
{
  "name": "New Lead Welcome",
  "trigger_type": "lead_created",
  "trigger_config": {},
  "is_active": false
}
```

#### GET /api/workflows/[id]
Get workflow with actions.

#### PATCH /api/workflows/[id]
Update workflow.

**Request:**
```json
{
  "name": "Updated Name",
  "is_active": true,
  "actions": [
    {
      "type": "send_email",
      "config": { "template": "welcome" },
      "order": 0
    },
    {
      "type": "create_task",
      "config": { "title": "Follow up" },
      "order": 1
    }
  ]
}
```

#### DELETE /api/workflows/[id]
Delete workflow.

---

### Customization

#### GET /api/lead-statuses
List custom lead statuses.

#### POST /api/lead-statuses
Create a status.

**Request:**
```json
{
  "name": "Hot Lead",
  "color": "#ef4444",
  "is_won": false,
  "is_lost": false
}
```

#### GET /api/custom-fields
List custom fields.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `entity_type` | string | lead (default) |

#### POST /api/custom-fields
Create a custom field.

**Request:**
```json
{
  "name": "Lead Source",
  "field_type": "select",
  "entity_type": "lead",
  "options": ["Website", "Referral", "Conference", "Cold Outreach"],
  "is_required": false
}
```

---

## Twilio Integration

### Phone Number Management

#### GET /api/twilio/numbers/owned
List owned phone numbers.

**Response:**
```json
[
  {
    "sid": "PN...",
    "phoneNumber": "+14155550001",
    "friendlyName": "Main Line",
    "capabilities": {
      "voice": true,
      "sms": true
    }
  }
]
```

### Voice Calls

#### GET /api/twilio/token
Get access token for Twilio Voice SDK.

**Response:**
```json
{
  "token": "eyJ...",
  "identity": "user_uuid"
}
```

#### Call Control Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calls/[id]/mute` | POST | Mute/unmute call |
| `/api/calls/[id]/hold` | POST | Hold/resume call |
| `/api/calls/[id]/dtmf` | POST | Send DTMF tones |
| `/api/calls/[id]/end` | POST | End call |
| `/api/calls/[id]/status` | GET | Get call status |
| `/api/calls/incoming/[id]/accept` | POST | Accept incoming call |
| `/api/calls/incoming/[id]/decline` | POST | Decline incoming call |

#### POST /api/calls/[id]/mute
```json
{ "muted": true }
```

#### POST /api/calls/[id]/hold
```json
{ "hold": true }
```

#### POST /api/calls/[id]/dtmf
```json
{ "digits": "1234" }
```

### Recording Playback

#### GET /api/communications/recordings/[id]
Get recording details and audio URL.

---

## Screen Features

### Pipeline (Kanban)

**Displays:**
- Pipeline selector dropdown
- Kanban columns for each stage
- Deal cards showing: name, value, contact, probability, close date
- Stage totals (count and total value)

**Actions:**
- Switch pipelines
- Create new pipeline
- Drag-drop deals between stages
- Click deal to open detail sheet
- Add deal to specific stage

**Kanban Card Info:**
- Deal name
- Contact name
- Value (formatted currency)
- Expected close date (red if overdue)
- Win probability %

---

### Leads List

**Displays:**
- Stats cards (Total, New, Qualified, Contacts)
- View toggle (Table / Kanban)
- Pipeline filter dropdown
- Status filter dropdown
- Search bar

**Table Columns:**
- Company name (linked)
- Status badge (color-coded)
- Industry
- Website
- Contact count
- Created date
- Actions menu

**Kanban View:**
- Columns by pipeline stage
- Lead cards with: name, industry, website, contact count
- Drag-drop between stages

**Actions:**
- Add Lead
- Switch view mode
- Filter by pipeline/status
- Search leads
- Edit/Delete from menu

---

### Lead Detail

**Layout:** Two-column (sidebar + main panel)

**Sidebar Tabs:**

1. **Details Tab:**
   - About section (address, website, notes)
   - Tasks section (list with checkboxes, add task)
   - Opportunities section (name, value, stage, add/delete)
   - Contacts section (search, list with actions)

2. **Files Tab:** (placeholder for attachments)

**Main Panel Tabs:**

1. **Activity Tab:**
   - Chronological timeline
   - Activity types: calls, emails, meetings, notes, tasks
   - SMS messages
   - Call recordings with playback
   - Search activities

2. **Messages Tab:**
   - SMS conversation interface
   - Send/receive messages
   - Phone number selector

**Header Actions:**
- Status dropdown (change lead status)
- Note button (add note)
- Email button (mailto: link)
- SMS button (opens SMS dialog)
- Call button (initiates Twilio call)
- More menu (Edit, Delete)

---

### Communications

**Layout:** Two-pane split view

**Left Pane (Thread List):**
- Search bar
- Tabs: Inbox / Archived
- Thread items showing:
  - Avatar with initials
  - Contact name
  - Last message preview
  - Timestamp
  - Unread count badge
  - Archive button

**Right Pane (Conversation):**
- Contact header
- Message list (SMS + calls mixed)
- Call records with duration, status, recording player
- Message input with send button
- Phone number selector

**Actions:**
- Search conversations
- Switch inbox/archived
- Archive/restore threads
- Send SMS
- Play call recordings

---

### Workflows

**List View:**
- Stats cards (Active, Total, Triggers)
- Workflow cards showing:
  - Name and description
  - Trigger badge
  - Action count
  - Status (Active/Inactive)
  - Toggle switch
  - More menu

**Builder View:**
- Workflow name (editable)
- Trigger card (configurable)
- Action steps (drag-sortable)
- Add step buttons
- Config side panel
- Save Draft / Activate buttons

**Available Triggers:**
- lead_created
- stage_changed
- deal_created
- activity_completed

**Available Actions:**
- send_email
- create_task
- update_status
- create_note

---

### Activities

**Tabs:**
- Upcoming (scheduled)
- Completed
- All

**Activity List:**
- Type icon (call, email, meeting, note, task)
- Subject/title
- Contact/deal link
- Due date
- Completion status

**Actions:**
- Log Activity (create new)
- Filter by tab
- Mark complete

---

### Customize

**Tabs:**

1. **Custom Fields:**
   - Add fields to leads
   - Field types: text, number, email, phone, date, select, checkbox
   - Reorder fields
   - Delete fields

2. **Lead Statuses:**
   - Create custom statuses
   - Assign colors
   - Mark as won/lost
   - Delete statuses

3. **Pipelines:**
   - Create pipelines
   - Define stages
   - Set stage colors
   - Set as default
   - Delete pipelines

---

## Components Reference

### LeadsKanbanBoard
```typescript
interface LeadsKanbanBoardProps {
  pipeline: LeadPipeline | null
  leads: KanbanLead[]
  onLeadClick: (lead: KanbanLead) => void
  onAddLead: (stageId: string) => void
  onDeleteLead: (leadId: string) => void
  onMoveLead: (leadId: string, stageId: string) => Promise<void>
}
```

### PipelineBoard
```typescript
// Uses SalesProvider context internally
// Renders deal kanban with drag-drop
```

### LeadActivityTimeline
```typescript
interface LeadActivityTimelineProps {
  activities: Activity[]
  leadName: string
  leadId?: string  // Fetches communications if provided
}
```

### CommunicationPanel
```typescript
interface CommunicationPanelProps {
  leadId: string
  contactId?: string
  phoneNumber: string
  contactName?: string
}
```

### CallControls
```typescript
interface CallControlsProps {
  onToggleKeypad?: () => void
  showKeypad?: boolean
}
```

### RecordingPlayer
```typescript
interface RecordingPlayerProps {
  recordingId: string
  duration: number  // seconds
}
```

### LeadForm
```typescript
interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead
  onSubmit: (lead: Lead, customFieldValues?: Record<string, string>) => Promise<void>
  statuses?: LeadStatus[]
  customFields?: CustomField[]
  pipelines?: LeadPipeline[]
  defaultPipelineId?: string
  defaultStageId?: string
}
```

### ContactForm
```typescript
interface ContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  contact?: Contact
  onSubmit: (contact: Contact) => Promise<void>
}
```

### DealDetailSheet
```typescript
interface DealDetailSheetProps {
  deal: Deal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

---

## Mobile Adaptation Guide

### Navigation Structure

```
Bottom Tab Navigator
├── Pipeline (KanbanSquare icon)
├── Leads (Building2 icon)
├── Contacts (Users icon)
├── Messages (MessageSquare icon)
└── More (Menu icon)
    ├── Activities
    ├── Deals
    ├── Workflows
    ├── Reports
    └── Settings
```

### Kanban Boards

**Web:** Horizontal scroll with multiple columns visible

**Mobile Options:**
1. **Swipeable columns** - One column at a time, swipe to navigate
2. **Dropdown selector** - Select stage from dropdown, show cards for that stage
3. **Horizontal scroll** - Narrower cards, horizontal scroll

**Drag-drop:** Use `react-native-draggable-flatlist` or long-press to move

### Lead Detail

**Web:** Two-column layout

**Mobile:** Single column with tabs:
- Tab 1: Details (About, Tasks, Opportunities, Contacts)
- Tab 2: Activity Timeline
- Tab 3: Messages

### Communications

**Web:** Two-pane split view

**Mobile:**
- Screen 1: Thread list
- Screen 2: Conversation (navigate on select)

### Call Integration

For React Native, use native phone capabilities or Twilio Voice React Native SDK:

```typescript
import { Voice } from '@twilio/voice-react-native-sdk';

// Initialize
const voice = new Voice();

// Register for calls
await voice.register(accessToken);

// Make call
const call = await voice.connect(accessToken, {
  params: { To: '+1234567890' }
});

// Call events
call.on('connected', () => {});
call.on('disconnected', () => {});

// Controls
call.mute(true);
call.sendDigits('123');
call.disconnect();
```

### Forms

- Full-screen form screens
- Large touch targets
- Native pickers for date/time
- Bottom sheet for status/stage selection

### Activity Timeline

- FlatList with sections by date
- Pull-to-refresh
- Infinite scroll pagination
- Tap to expand activity details

### Performance

- Paginate leads/contacts (20 per page)
- Cache pipeline stages
- Lazy load activity timeline
- Debounce search (300ms)

---

## Color Reference

### Lead Statuses
| Status | Color |
|--------|-------|
| New | `#6b7280` (gray) |
| Contacted | `#3b82f6` (blue) |
| Qualified | `#22c55e` (green) |
| Unqualified | `#f97316` (orange) |
| Won | `#10b981` (emerald) |
| Lost | `#ef4444` (red) |

### Pipeline Stages
| Stage | Color |
|-------|-------|
| Lead | `#6b7280` (gray) |
| Qualified | `#3b82f6` (blue) |
| Proposal | `#eab308` (yellow) |
| Negotiation | `#f97316` (orange) |
| Closed Won | `#22c55e` (green) |
| Closed Lost | `#ef4444` (red) |

### Activity Types
| Type | Color | Icon |
|------|-------|------|
| Call | `#22c55e` (green) | `phone` |
| Email | `#3b82f6` (blue) | `mail` |
| Meeting | `#8b5cf6` (purple) | `calendar` |
| Note | `#6b7280` (gray) | `file-text` |
| Task | `#f59e0b` (amber) | `check-square` |

### Communication Direction
| Direction | Color |
|-----------|-------|
| Inbound | `#3b82f6` (blue) |
| Outbound | `#10b981` (emerald) |

### Call Status
| Status | Color |
|--------|-------|
| Completed | `#22c55e` (green) |
| No Answer | `#f59e0b` (amber) |
| Busy | `#f97316` (orange) |
| Failed | `#ef4444` (red) |
| In Progress | `#3b82f6` (blue) |
