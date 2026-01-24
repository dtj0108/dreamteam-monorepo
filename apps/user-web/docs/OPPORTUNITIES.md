# Opportunities Feature Documentation

This document provides comprehensive documentation for the Opportunities feature in FinanceBro, covering the database schema, API endpoints, UI components, and key functionality.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [TypeScript Types](#typescript-types)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [Pages](#pages)
7. [Key Features](#key-features)
8. [File Locations](#file-locations)

---

## Overview

The Opportunities feature enables tracking of sales opportunities associated with leads. Each lead can have multiple opportunities, and opportunities can be managed through a Kanban-style board organized by pipeline stages.

**Key Capabilities:**
- Create, edit, and delete opportunities linked to leads
- Track opportunity value, probability, and expected close dates
- Kanban board with drag-and-drop between pipeline stages
- Filter by date range, pipeline, team member, and "needs attention"
- Support for one-time and recurring revenue types
- Automatic expected value calculations (value × probability)

---

## Database Schema

### Migration: `055_enhance_lead_opportunities.sql`

The migration enhances the existing `lead_opportunities` table with the following columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `status` | VARCHAR(20) | 'active' | Opportunity status: 'active', 'won', 'lost' |
| `contact_id` | UUID | NULL | Optional reference to contacts table |
| `value_type` | VARCHAR(20) | 'one_time' | Revenue type: 'one_time' or 'recurring' |
| `closed_date` | DATE | NULL | Date when opportunity was closed (won/lost) |
| `workspace_id` | UUID | NULL | Foreign key to workspaces table |

### Indexes

```sql
idx_lead_opportunities_status        -- For filtering by status
idx_lead_opportunities_contact_id    -- For contact lookups
idx_lead_opportunities_workspace_id  -- For workspace filtering
idx_lead_opportunities_closed_date   -- For date range queries
idx_lead_opportunities_value_type    -- For value type filtering
```

### Row-Level Security (RLS)

RLS policies ensure users can only access opportunities:
- In their workspace (via `workspace_members`)
- That they own directly (`user_id` match)
- Within leads they own

---

## TypeScript Types

### Location: `src/types/opportunity.ts`

### Core Types

```typescript
type OpportunityStatus = 'active' | 'won' | 'lost'
type ValueType = 'one_time' | 'recurring'

interface Opportunity {
  id: string
  lead_id: string
  user_id: string
  workspace_id?: string
  contact_id?: string
  name: string
  value: number | null
  probability: number           // 0-100 percentage
  status: OpportunityStatus
  value_type: ValueType
  expected_close_date: string | null
  closed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  lead?: { id, name, website?, industry?, status? }
  contact?: OpportunityContact
}

interface CreateOpportunityData {
  name: string                  // Required
  value?: number
  probability?: number
  status?: OpportunityStatus
  value_type?: ValueType
  contact_id?: string
  expected_close_date?: string
  notes?: string
}

interface UpdateOpportunityData {
  name?: string
  value?: number
  probability?: number
  status?: OpportunityStatus
  value_type?: ValueType
  contact_id?: string
  expected_close_date?: string
  closed_date?: string
  notes?: string
}
```

### Utility Functions

| Function | Description |
|----------|-------------|
| `calculateExpectedValue(opportunity)` | Returns `value × (probability / 100)` |
| `formatOpportunityValue(value, valueType)` | Formats as USD, appends "/mo" for recurring |
| `getOpportunityStatusColor(status)` | Returns Tailwind classes: blue (active), emerald (won), red (lost) |
| `getProbabilityColor(probability)` | Returns color based on confidence level |

---

## API Endpoints

### GET `/api/opportunities`

List all opportunities for the authenticated user with filtering and statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: 'active', 'won', 'lost' |
| `lead_id` | string | Filter by specific lead |
| `pipeline_id` | string | Filter by pipeline |

**Response:**
```json
{
  "opportunities": [...],
  "stats": {
    "total_count": 25,
    "total_value": 150000,
    "weighted_value": 87500,
    "active_count": 20,
    "won_count": 3,
    "lost_count": 2
  }
}
```

---

### GET `/api/leads/[id]/opportunities`

List all opportunities for a specific lead.

**Response:**
```json
{
  "opportunities": [
    {
      "id": "uuid",
      "name": "Enterprise License",
      "value": 50000,
      "probability": 75,
      "status": "active",
      "value_type": "recurring",
      "expected_close_date": "2024-03-15",
      "contact": { "id", "first_name", "last_name", "email" }
    }
  ]
}
```

---

### POST `/api/leads/[id]/opportunities`

Create a new opportunity for a lead.

**Request Body:**
```json
{
  "name": "Enterprise License",
  "value": 50000,
  "probability": 50,
  "expected_close_date": "2024-03-15",
  "status": "active",
  "value_type": "recurring",
  "contact_id": "uuid",
  "notes": "Initial discussion completed"
}
```

**Auto-populated Fields:**
- `user_id` - From authenticated session
- `workspace_id` - From parent lead's workspace
- Defaults: `probability=0`, `status='active'`, `value_type='one_time'`

---

### PATCH `/api/leads/[id]/opportunities/[opportunityId]`

Update an existing opportunity.

**Special Behavior:**
- When status changes to 'won' or 'lost': automatically sets `closed_date` to today
- When status changes back to 'active': clears `closed_date`

---

### DELETE `/api/leads/[id]/opportunities/[opportunityId]`

Delete an opportunity.

**Response:**
```json
{ "success": true }
```

---

## UI Components

### OpportunityForm

**Location:** `src/components/sales/opportunity-form.tsx`

Modal dialog for creating/editing opportunities with fields:
- Name (required)
- Status (Active/Won/Lost button group)
- Value (number input with currency icon)
- Value Type (One-time or Monthly recurring tabs)
- Probability/Confidence (0-100% slider)
- Expected Value (read-only, calculated)
- Stage (Prospect, Qualified, Proposal, Negotiation, Closing)
- Expected Close Date (date picker)
- Contact (optional dropdown)
- Notes (textarea)

---

### OpportunityCard

**Location:** `src/components/sales/opportunity-card.tsx`

Displays a single opportunity in a styled card with:
- Name and status badge (color-coded)
- Value with recurring indicator
- Expected value (greyed out)
- Probability percentage (color-coded)
- Contact name and expected close date
- Hover actions: Mark as Won/Lost, Reopen, Delete
- Drag-and-drop visual feedback

---

### LeadOpportunityCard

**Location:** `src/components/sales/lead-opportunity-card.tsx`

Shows a lead with its associated opportunities for the Kanban board:
- Lead header with emoji icon and company name
- List of active opportunities with:
  - Owner avatar
  - Opportunity name
  - Compact value format
  - Probability and expected close date
- Exports `SortableLeadCard` wrapper for drag-and-drop

---

### OpportunitiesBoard

**Location:** `src/components/sales/opportunities-board.tsx`

Kanban board showing leads grouped by pipeline stage:
- Fetches leads with `include_opportunities=true`
- Vertical columns per stage (sorted by position)
- "No Stage" bucket for unassigned leads
- Drag-and-drop between stages (optimistic updates)
- Per-stage statistics: lead count, value, weighted value

**Value Display Options:**
- Actual: Raw opportunity values
- Annualized: Recurring × 12
- Weighted: Value × (probability / 100)

---

### OpportunitiesFilterBar

**Location:** `src/components/sales/opportunities-filter-bar.tsx`

Filter controls for the board:

| Filter | Type | Options |
|--------|------|---------|
| Close Date Range | Date picker | Presets + custom range |
| Pipeline | Dropdown | All pipelines or specific |
| Users | Multi-select | Team members with avatars |
| Needs Attention | Toggle | Shows overdue opportunities |
| Value Display | Dropdown | Actual, Annualized, Weighted |

---

## Pages

### Main: `/sales/opportunities`

**Location:** `src/app/sales/opportunities/page.tsx`

The primary opportunities management page with:
- Filter bar component
- Kanban board component
- Edit opportunity modal
- Fetches pipelines and workspace members

### Demo: `/demo/sales/opportunities`

**Location:** `src/app/demo/sales/opportunities/page.tsx`

Demo view with sample data showing:
- Stats cards (Total Pipeline, Weighted Value, Status breakdown)
- Static Kanban board with sample deals
- Uses `useDemoCRM()` hook for data

---

## Key Features

### Opportunity Lifecycle

1. **Creation** - Add to lead via form, auto-populate workspace
2. **Active Phase** - Track probability, update value/dates, drag between stages
3. **Closing** - Mark Won/Lost (auto-sets closed_date)
4. **Reopening** - Revert to active (clears closed_date)

### Value Calculations

| Calculation | Formula |
|-------------|---------|
| Expected Value | `value × (probability / 100)` |
| Annualized Value | `one_time value` or `recurring × 12` |
| Weighted Value | `annualized × (probability / 100)` |

### Filtering

| Filter | Server/Client | Description |
|--------|---------------|-------------|
| Date Range | Server | `close_date_start`, `close_date_end` params |
| Pipeline | Server | `pipeline_id` param |
| User | Client | Filter by opportunity owner |
| Needs Attention | Client | Overdue active opportunities |

### Drag-and-Drop

- Uses `@dnd-kit/core` and `@dnd-kit/sortable`
- PointerSensor with 8px activation constraint
- Optimistic UI updates with error fallback
- Moves lead between pipeline stages

---

## File Locations

### Database
```
supabase/migrations/055_enhance_lead_opportunities.sql
```

### Types
```
apps/finance/src/types/opportunity.ts
```

### API Routes
```
apps/finance/src/app/api/opportunities/route.ts              # GET all
apps/finance/src/app/api/leads/[id]/opportunities/route.ts   # GET, POST
apps/finance/src/app/api/leads/[id]/opportunities/[opportunityId]/route.ts  # PATCH, DELETE
```

### UI Components
```
apps/finance/src/components/sales/opportunity-form.tsx
apps/finance/src/components/sales/opportunity-card.tsx
apps/finance/src/components/sales/lead-opportunity-card.tsx
apps/finance/src/components/sales/opportunities-board.tsx
apps/finance/src/components/sales/opportunities-filter-bar.tsx
```

### Pages
```
apps/finance/src/app/sales/opportunities/page.tsx       # Main
apps/finance/src/app/demo/sales/opportunities/page.tsx  # Demo
```
