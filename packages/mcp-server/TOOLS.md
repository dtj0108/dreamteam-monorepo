# FinanceBro MCP Tools Reference

This document provides a complete reference for all 291 MCP (Model Context Protocol) server tools available in the FinanceBro application. These tools enable AI agents to interact with the application's data and functionality.

## Table of Contents

- [Overview](#overview)
- [1. Finance (62 tools)](#1-finance-62-tools)
- [2. CRM (53 tools)](#2-crm-53-tools)
- [3. Team (38 tools)](#3-team-38-tools)
- [4. Projects (40 tools)](#4-projects-40-tools)
- [5. Knowledge (36 tools)](#5-knowledge-36-tools)
- [6. Communications (14 tools)](#6-communications-14-tools)
- [7. Goals & KPIs (21 tools)](#7-goals--kpis-21-tools)
- [8. Agents (27 tools)](#8-agents-27-tools)

---

## Overview

### Tool Naming Convention
Tools follow the pattern: `{entity}_{action}`
- Example: `account_create`, `transaction_list`, `deal_mark_won`

### Scoping Patterns
Different tools use different scoping based on data ownership:

| Scope | Description | Departments |
|-------|-------------|-------------|
| `workspace_id` | Multi-tenant workspace isolation | Finance, CRM, Team, Projects, Knowledge, Agents |
| `user_id` | User-specific data | Communications |
| `profile_id` | Personal data (not workspace-bound) | Goals & KPIs |

### Response Format
All tools return a consistent JSON response:
```json
{
  "content": [{ "type": "text", "text": "..." }],
  "isError": false
}
```

---

## 1. Finance (62 tools)

Financial management tools for accounts, transactions, budgets, and analytics.

### Accounts (8 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `account_list` | List all accounts in workspace | `workspace_id` | `type`, `is_active`, `limit`, `offset` |
| `account_get` | Get single account by ID | `workspace_id`, `account_id` | - |
| `account_create` | Create a new financial account | `workspace_id`, `name`, `type` | `balance`, `institution`, `currency` |
| `account_update` | Update account details | `workspace_id`, `account_id` | `name`, `type`, `institution`, `is_active` |
| `account_delete` | Delete an account | `workspace_id`, `account_id` | - |
| `account_get_balance` | Get current balance for account | `workspace_id`, `account_id` | - |
| `account_list_by_type` | List accounts filtered by type | `workspace_id`, `type` | - |
| `account_get_totals` | Get total balances across all accounts | `workspace_id` | `group_by` |

**Account Types:** `checking`, `savings`, `credit`, `cash`, `investment`, `loan`, `other`

### Transactions (12 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `transaction_list` | List transactions with filters | `workspace_id` | `account_id`, `category_id`, `start_date`, `end_date`, `limit`, `offset`, `type` |
| `transaction_get` | Get single transaction | `workspace_id`, `transaction_id` | - |
| `transaction_create` | Create a new transaction | `workspace_id`, `account_id`, `amount`, `date` | `description`, `category_id`, `notes` |
| `transaction_update` | Update transaction details | `workspace_id`, `transaction_id` | `amount`, `date`, `description`, `category_id`, `notes` |
| `transaction_delete` | Delete a transaction | `workspace_id`, `transaction_id` | - |
| `transaction_create_transfer` | Create a transfer between accounts | `workspace_id`, `from_account_id`, `to_account_id`, `amount`, `date` | `description` |
| `transaction_bulk_categorize` | Categorize multiple transactions | `workspace_id`, `transaction_ids[]`, `category_id` | - |
| `transaction_search` | Search transactions by description | `workspace_id`, `query` | `limit` |
| `transaction_get_by_date_range` | Get transactions in date range | `workspace_id`, `start_date`, `end_date` | `account_id` |
| `transaction_get_uncategorized` | List transactions without category | `workspace_id` | `limit` |
| `transaction_get_recent` | Get most recent transactions | `workspace_id` | `limit` (default 10) |
| `transaction_get_duplicates` | Find potential duplicate transactions | `workspace_id` | `days_window` |

### Categories (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `category_list` | List all categories | `workspace_id` | `type`, `include_system` |
| `category_get` | Get single category | `workspace_id`, `category_id` | - |
| `category_create` | Create custom category | `workspace_id`, `name`, `type` | `icon`, `color`, `parent_id` |
| `category_update` | Update category | `workspace_id`, `category_id` | `name`, `icon`, `color` |
| `category_delete` | Delete custom category | `workspace_id`, `category_id` | - |
| `category_get_spending` | Get total spending for category | `workspace_id`, `category_id` | `start_date`, `end_date` |
| `category_list_with_totals` | List categories with spending totals | `workspace_id` | `start_date`, `end_date` |

**Category Types:** `income`, `expense`

### Budgets (11 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `budget_list` | List all budgets | `workspace_id` | `is_active` |
| `budget_get` | Get single budget with spending | `workspace_id`, `budget_id` | - |
| `budget_create` | Create a new budget | `workspace_id`, `category_id`, `amount`, `period` | `start_date`, `rollover` |
| `budget_update` | Update budget | `workspace_id`, `budget_id` | `amount`, `period`, `rollover`, `is_active` |
| `budget_delete` | Delete a budget | `workspace_id`, `budget_id` | - |
| `budget_get_status` | Get budget status (on track, over, etc) | `workspace_id`, `budget_id` | - |
| `budget_list_over_limit` | List budgets that are over limit | `workspace_id` | - |
| `budget_list_with_spending` | List all budgets with current spending | `workspace_id` | - |
| `budget_add_alert` | Add alert threshold to budget | `workspace_id`, `budget_id`, `threshold_percent` | - |
| `budget_remove_alert` | Remove alert from budget | `workspace_id`, `budget_id`, `threshold_percent` | - |
| `budget_get_alerts_triggered` | Get all triggered budget alerts | `workspace_id` | - |

**Budget Periods:** `weekly`, `biweekly`, `monthly`, `yearly`

### Subscriptions (9 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `subscription_list` | List all subscriptions | `workspace_id` | `is_active` |
| `subscription_get` | Get single subscription | `workspace_id`, `subscription_id` | - |
| `subscription_create` | Create a subscription | `workspace_id`, `name`, `amount`, `frequency`, `next_renewal_date` | `category_id`, `reminder_days_before` |
| `subscription_update` | Update subscription | `workspace_id`, `subscription_id` | `name`, `amount`, `frequency`, `next_renewal_date`, `is_active` |
| `subscription_delete` | Delete a subscription | `workspace_id`, `subscription_id` | - |
| `subscription_get_upcoming` | Get subscriptions renewing soon | `workspace_id` | `days_ahead` (default 7) |
| `subscription_get_summary` | Get subscription totals | `workspace_id` | - |
| `subscription_detect_from_transactions` | Auto-detect subscriptions from transaction patterns | `workspace_id` | - |
| `subscription_mark_canceled` | Mark subscription as canceled | `workspace_id`, `subscription_id` | - |

**Frequencies:** `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`

### Recurring Rules (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `recurring_rule_list` | List all recurring rules | `workspace_id` | `is_active` |
| `recurring_rule_get` | Get single recurring rule | `workspace_id`, `rule_id` | - |
| `recurring_rule_create` | Create recurring income/expense rule | `workspace_id`, `account_id`, `amount`, `description`, `frequency`, `next_date` | `category_id`, `end_date` |
| `recurring_rule_update` | Update recurring rule | `workspace_id`, `rule_id` | `amount`, `frequency`, `next_date`, `is_active` |
| `recurring_rule_delete` | Delete recurring rule | `workspace_id`, `rule_id` | - |
| `recurring_rule_skip_next` | Skip the next occurrence | `workspace_id`, `rule_id` | - |
| `recurring_rule_generate_transactions` | Generate pending recurring transactions | `workspace_id`, `up_to_date` | - |

### Analytics (8 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `analytics_get_income_vs_expense` | Get income vs expense summary | `workspace_id`, `start_date`, `end_date` | `group_by` (day, week, month) |
| `analytics_get_spending_by_category` | Get spending breakdown by category | `workspace_id`, `start_date`, `end_date` | `limit` |
| `analytics_get_net_worth` | Calculate total net worth | `workspace_id` | - |
| `analytics_get_cash_flow` | Get cash flow analysis | `workspace_id`, `start_date`, `end_date` | - |
| `analytics_get_trends` | Get spending/income trends over time | `workspace_id` | `months` (default 6) |
| `analytics_get_profit_loss` | Get P&L statement | `workspace_id`, `start_date`, `end_date` | - |
| `analytics_project_cash_flow` | Project future cash flow | `workspace_id`, `months_ahead` | - |
| `analytics_get_calendar_events` | Get financial events for calendar | `workspace_id`, `start_date`, `end_date` | - |

---

## 2. CRM (53 tools)

Customer relationship management tools for contacts, leads, deals, and sales pipelines.

### Contacts (10 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `contact_list` | List all contacts | `workspace_id` | `search`, `tags`, `source`, `limit`, `offset` |
| `contact_get` | Get single contact | `workspace_id`, `contact_id` | - |
| `contact_create` | Create a contact | `workspace_id`, `first_name` | `last_name`, `email`, `phone`, `company`, `job_title`, `tags`, `source`, `notes` |
| `contact_update` | Update contact | `workspace_id`, `contact_id` | `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `tags`, `notes` |
| `contact_delete` | Delete a contact | `workspace_id`, `contact_id` | - |
| `contact_search` | Search contacts | `workspace_id`, `query` | - |
| `contact_add_tag` | Add tag to contact | `workspace_id`, `contact_id`, `tag` | - |
| `contact_remove_tag` | Remove tag from contact | `workspace_id`, `contact_id`, `tag` | - |
| `contact_get_activities` | Get all activities for contact | `workspace_id`, `contact_id` | - |
| `contact_get_deals` | Get all deals for contact | `workspace_id`, `contact_id` | - |

### Leads (12 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `lead_list` | List all leads | `workspace_id` | `status`, `pipeline_id`, `limit`, `offset` |
| `lead_get` | Get single lead with details | `workspace_id`, `lead_id` | - |
| `lead_create` | Create a new lead | `workspace_id`, `name` | `website`, `industry`, `status`, `notes` |
| `lead_update` | Update lead | `workspace_id`, `lead_id` | `name`, `website`, `industry`, `status`, `notes` |
| `lead_delete` | Delete a lead | `workspace_id`, `lead_id` | - |
| `lead_change_status` | Change lead status | `workspace_id`, `lead_id`, `status_id` | - |
| `lead_add_contact` | Add contact to lead | `workspace_id`, `lead_id`, `contact_id` | - |
| `lead_add_task` | Add task to lead | `workspace_id`, `lead_id`, `title` | `due_date`, `assignee_id` |
| `lead_complete_task` | Mark lead task complete | `workspace_id`, `lead_id`, `task_id` | - |
| `lead_add_opportunity` | Create opportunity from lead | `workspace_id`, `lead_id`, `deal_data` | - |
| `lead_get_tasks` | Get tasks for lead | `workspace_id`, `lead_id` | - |
| `lead_get_opportunities` | Get opportunities for lead | `workspace_id`, `lead_id` | - |

### Pipelines (9 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `pipeline_list` | List all pipelines | `workspace_id` | - |
| `pipeline_get` | Get pipeline with stages | `workspace_id`, `pipeline_id` | - |
| `pipeline_create` | Create a pipeline | `workspace_id`, `name` | `description` |
| `pipeline_update` | Update pipeline | `workspace_id`, `pipeline_id` | `name`, `description`, `is_default` |
| `pipeline_delete` | Delete pipeline | `workspace_id`, `pipeline_id` | - |
| `pipeline_add_stage` | Add stage to pipeline | `workspace_id`, `pipeline_id`, `name` | `color`, `win_probability`, `position` |
| `pipeline_update_stage` | Update pipeline stage | `workspace_id`, `stage_id` | `name`, `color`, `win_probability`, `position` |
| `pipeline_delete_stage` | Delete pipeline stage | `workspace_id`, `stage_id` | - |
| `pipeline_reorder_stages` | Reorder stages in pipeline | `workspace_id`, `pipeline_id`, `stage_ids[]` | - |

### Deals (11 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `deal_list` | List all deals | `workspace_id` | `pipeline_id`, `stage_id`, `status`, `contact_id`, `limit`, `offset` |
| `deal_get` | Get single deal | `workspace_id`, `deal_id` | - |
| `deal_create` | Create a deal | `workspace_id`, `name`, `value`, `pipeline_id`, `stage_id` | `contact_id`, `expected_close_date`, `probability`, `notes` |
| `deal_update` | Update deal | `workspace_id`, `deal_id` | `name`, `value`, `stage_id`, `expected_close_date`, `probability`, `notes` |
| `deal_delete` | Delete a deal | `workspace_id`, `deal_id` | - |
| `deal_move_stage` | Move deal to different stage | `workspace_id`, `deal_id`, `stage_id` | - |
| `deal_mark_won` | Mark deal as won | `workspace_id`, `deal_id` | `actual_close_date` |
| `deal_mark_lost` | Mark deal as lost | `workspace_id`, `deal_id` | `reason` |
| `deal_get_activities` | Get activities for deal | `workspace_id`, `deal_id` | - |
| `deal_get_value_by_stage` | Get total deal value by stage | `workspace_id`, `pipeline_id` | - |
| `deal_get_forecast` | Get sales forecast | `workspace_id` | `months_ahead` |

### Activities (11 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `activity_list` | List all activities | `workspace_id` | `type`, `contact_id`, `deal_id`, `is_completed`, `limit`, `offset` |
| `activity_get` | Get single activity | `workspace_id`, `activity_id` | - |
| `activity_create` | Create an activity | `workspace_id`, `type`, `subject` | `description`, `contact_id`, `deal_id`, `due_date` |
| `activity_update` | Update activity | `workspace_id`, `activity_id` | `subject`, `description`, `due_date` |
| `activity_delete` | Delete activity | `workspace_id`, `activity_id` | - |
| `activity_mark_complete` | Mark activity complete | `workspace_id`, `activity_id` | - |
| `activity_log_call` | Log a call activity | `workspace_id`, `subject` | `contact_id`, `deal_id`, `description`, `duration_minutes` |
| `activity_log_email` | Log an email activity | `workspace_id`, `subject` | `contact_id`, `deal_id`, `description` |
| `activity_log_meeting` | Log a meeting activity | `workspace_id`, `subject` | `contact_id`, `deal_id`, `description`, `meeting_date` |
| `activity_get_overdue` | Get overdue activities | `workspace_id` | - |
| `activity_get_upcoming` | Get upcoming activities | `workspace_id` | `days_ahead` |

---

## 3. Team (38 tools)

Team collaboration tools for workspaces, channels, messages, and direct messaging.

### Workspace & Members (8 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `workspace_get` | Get workspace details | `workspace_id` | - |
| `workspace_update` | Update workspace settings | `workspace_id` | `name`, `avatar_url` |
| `workspace_member_list` | List workspace members | `workspace_id` | `role` |
| `workspace_member_get` | Get member details | `workspace_id`, `member_id` | - |
| `workspace_member_invite` | Invite user to workspace | `workspace_id`, `email` | `role` |
| `workspace_member_update_role` | Update member role | `workspace_id`, `member_id`, `role` | - |
| `workspace_member_remove` | Remove member from workspace | `workspace_id`, `member_id` | - |
| `workspace_member_set_status` | Set member status | `workspace_id`, `member_id`, `status` | `status_text` |

**Member Roles:** `member`, `admin`, `owner`

### Channels (11 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `channel_list` | List all channels | `workspace_id` | `include_private` |
| `channel_get` | Get channel details | `workspace_id`, `channel_id` | - |
| `channel_create` | Create a channel | `workspace_id`, `name` | `description`, `is_private` |
| `channel_update` | Update channel | `workspace_id`, `channel_id` | `name`, `description` |
| `channel_delete` | Delete/archive channel | `workspace_id`, `channel_id` | - |
| `channel_join` | Join a channel | `workspace_id`, `channel_id` | - |
| `channel_leave` | Leave a channel | `workspace_id`, `channel_id` | - |
| `channel_add_member` | Add member to channel | `workspace_id`, `channel_id`, `member_id` | - |
| `channel_remove_member` | Remove member from channel | `workspace_id`, `channel_id`, `member_id` | - |
| `channel_get_members` | List channel members | `workspace_id`, `channel_id` | - |
| `channel_set_notifications` | Set notification preferences | `workspace_id`, `channel_id`, `notifications` | - |

**Notification Settings:** `all`, `mentions`, `none`

### Messages (12 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `message_list` | List messages in channel/DM | `workspace_id` | `channel_id`, `dm_conversation_id`, `limit`, `before`, `after` |
| `message_get` | Get single message | `workspace_id`, `message_id` | - |
| `message_send` | Send a message | `workspace_id`, `content` | `channel_id`, `dm_conversation_id`, `parent_id` |
| `message_update` | Edit a message | `workspace_id`, `message_id`, `content` | - |
| `message_delete` | Delete a message | `workspace_id`, `message_id` | - |
| `message_reply` | Reply in thread | `workspace_id`, `parent_message_id`, `content` | - |
| `message_add_reaction` | Add emoji reaction | `workspace_id`, `message_id`, `emoji` | - |
| `message_remove_reaction` | Remove emoji reaction | `workspace_id`, `message_id`, `emoji` | - |
| `message_search` | Search messages | `workspace_id`, `query` | `channel_id`, `sender_id` |
| `message_get_thread` | Get all replies to message | `workspace_id`, `parent_message_id` | - |
| `message_pin` | Pin a message | `workspace_id`, `message_id` | - |
| `message_unpin` | Unpin a message | `workspace_id`, `message_id` | - |

### Direct Messages (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `dm_list_conversations` | List DM conversations | `workspace_id` | - |
| `dm_get_conversation` | Get DM conversation | `workspace_id`, `conversation_id` | - |
| `dm_create_conversation` | Start DM with user(s) | `workspace_id`, `participant_ids[]` | - |
| `dm_get_or_create` | Get or create DM with user | `workspace_id`, `participant_id` | - |
| `dm_archive_conversation` | Archive DM conversation | `workspace_id`, `conversation_id` | - |
| `dm_mark_read` | Mark DM as read | `workspace_id`, `conversation_id` | - |
| `dm_get_unread_count` | Get unread DM count | `workspace_id` | - |

---

## 4. Projects (40 tools)

Project management tools for projects, tasks, milestones, and departments.

### Departments (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `department_list` | List all departments | `workspace_id` | - |
| `department_get` | Get department | `workspace_id`, `department_id` | - |
| `department_create` | Create department | `workspace_id`, `name` | `description`, `color`, `icon` |
| `department_update` | Update department | `workspace_id`, `department_id` | `name`, `description`, `color`, `icon` |
| `department_delete` | Delete department | `workspace_id`, `department_id` | - |

### Projects (11 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `project_list` | List all projects | `workspace_id` | `status`, `department_id`, `limit`, `offset` |
| `project_get` | Get project with details | `workspace_id`, `project_id` | - |
| `project_create` | Create a project | `workspace_id`, `name` | `description`, `status`, `priority`, `start_date`, `target_end_date`, `budget`, `department_id` |
| `project_update` | Update project | `workspace_id`, `project_id` | `name`, `description`, `status`, `priority`, `target_end_date`, `budget` |
| `project_delete` | Delete project | `workspace_id`, `project_id` | - |
| `project_archive` | Archive project | `workspace_id`, `project_id` | - |
| `project_add_member` | Add member to project | `workspace_id`, `project_id`, `member_id` | `role`, `hours_per_week` |
| `project_remove_member` | Remove member from project | `workspace_id`, `project_id`, `member_id` | - |
| `project_get_members` | List project members | `workspace_id`, `project_id` | - |
| `project_get_progress` | Get project progress stats | `workspace_id`, `project_id` | - |
| `project_get_activity` | Get project activity log | `workspace_id`, `project_id` | `limit` |

**Project Status:** `active`, `on_hold`, `completed`, `archived`
**Project Priority:** `low`, `medium`, `high`, `critical`

### Tasks (16 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `task_list` | List tasks | `workspace_id` | `project_id`, `assignee_id`, `status`, `priority`, `milestone_id`, `limit`, `offset` |
| `task_get` | Get task with details | `workspace_id`, `task_id` | - |
| `task_create` | Create a task | `workspace_id`, `project_id`, `title` | `description`, `status`, `priority`, `assignee_id`, `due_date`, `estimated_hours`, `parent_task_id` |
| `task_update` | Update task | `workspace_id`, `task_id` | `title`, `description`, `status`, `priority`, `due_date`, `estimated_hours`, `actual_hours` |
| `task_delete` | Delete task | `workspace_id`, `task_id` | - |
| `task_assign` | Assign task to user | `workspace_id`, `task_id`, `assignee_id` | - |
| `task_unassign` | Unassign task from user | `workspace_id`, `task_id`, `assignee_id` | - |
| `task_change_status` | Change task status | `workspace_id`, `task_id`, `status` | - |
| `task_add_dependency` | Add task dependency | `workspace_id`, `task_id`, `depends_on_task_id` | `type` |
| `task_remove_dependency` | Remove task dependency | `workspace_id`, `task_id`, `depends_on_task_id` | - |
| `task_add_label` | Add label to task | `workspace_id`, `task_id`, `label_id` | - |
| `task_remove_label` | Remove label from task | `workspace_id`, `task_id`, `label_id` | - |
| `task_add_comment` | Add comment to task | `workspace_id`, `task_id`, `content` | - |
| `task_get_comments` | Get task comments | `workspace_id`, `task_id` | - |
| `task_get_my_tasks` | Get current user's tasks | `workspace_id` | `status` |
| `task_get_overdue` | Get overdue tasks | `workspace_id` | `project_id` |

**Task Status:** `todo`, `in_progress`, `review`, `done`
**Task Priority:** `low`, `medium`, `high`, `critical`
**Dependency Types:** `finish_to_start`, `start_to_start`, `finish_to_finish`, `start_to_finish`

### Milestones (8 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `milestone_list` | List project milestones | `workspace_id`, `project_id` | `status` |
| `milestone_get` | Get milestone with tasks | `workspace_id`, `milestone_id` | - |
| `milestone_create` | Create milestone | `workspace_id`, `project_id`, `name`, `target_date` | `description` |
| `milestone_update` | Update milestone | `workspace_id`, `milestone_id` | `name`, `description`, `target_date`, `status` |
| `milestone_delete` | Delete milestone | `workspace_id`, `milestone_id` | - |
| `milestone_add_task` | Add task to milestone | `workspace_id`, `milestone_id`, `task_id` | - |
| `milestone_remove_task` | Remove task from milestone | `workspace_id`, `milestone_id`, `task_id` | - |
| `milestone_get_progress` | Get milestone progress | `workspace_id`, `milestone_id` | - |

**Milestone Status:** `upcoming`, `at_risk`, `completed`, `missed`

---

## 5. Knowledge (36 tools)

Knowledge base tools for pages, categories, templates, and whiteboards.

### Categories (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `knowledge_category_list` | List categories | `workspace_id` | - |
| `knowledge_category_get` | Get category with pages | `workspace_id`, `category_id` | - |
| `knowledge_category_create` | Create category | `workspace_id`, `name` | `slug`, `color`, `icon` |
| `knowledge_category_update` | Update category | `workspace_id`, `category_id` | `name`, `color`, `icon`, `position` |
| `knowledge_category_delete` | Delete category | `workspace_id`, `category_id` | - |

### Templates (6 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `knowledge_template_list` | List available templates | `workspace_id` | `include_system`, `category` |
| `knowledge_template_get` | Get template | `workspace_id`, `template_id` | - |
| `knowledge_template_create` | Create template | `workspace_id`, `name`, `content` | `description`, `icon`, `category` |
| `knowledge_template_update` | Update template | `workspace_id`, `template_id` | `name`, `description`, `icon`, `category`, `content` |
| `knowledge_template_delete` | Delete template | `workspace_id`, `template_id` | - |
| `knowledge_template_use` | Create page from template | `workspace_id`, `template_id`, `title` | `parent_id` |

### Pages (16 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `knowledge_page_list` | List knowledge pages | `workspace_id` | `category_id`, `parent_id`, `is_archived`, `limit`, `offset` |
| `knowledge_page_get` | Get page with content | `workspace_id`, `page_id` | - |
| `knowledge_page_create` | Create a page | `workspace_id`, `title` | `content`, `parent_id`, `icon`, `cover_image`, `template_id` |
| `knowledge_page_update` | Update page | `workspace_id`, `page_id` | `title`, `content`, `icon`, `cover_image` |
| `knowledge_page_delete` | Delete page | `workspace_id`, `page_id` | - |
| `knowledge_page_archive` | Archive page | `workspace_id`, `page_id` | - |
| `knowledge_page_restore` | Restore archived page | `workspace_id`, `page_id` | - |
| `knowledge_page_move` | Move page to new parent | `workspace_id`, `page_id`, `new_parent_id` | - |
| `knowledge_page_duplicate` | Duplicate a page | `workspace_id`, `page_id` | - |
| `knowledge_page_favorite` | Add page to favorites | `workspace_id`, `page_id` | - |
| `knowledge_page_unfavorite` | Remove from favorites | `workspace_id`, `page_id` | - |
| `knowledge_page_search` | Search pages | `workspace_id`, `query` | - |
| `knowledge_page_get_children` | Get child pages | `workspace_id`, `page_id` | - |
| `knowledge_page_reorder` | Reorder pages | `workspace_id`, `page_ids[]` | `parent_id` |
| `knowledge_page_add_category` | Add category to page | `workspace_id`, `page_id`, `category_id` | - |
| `knowledge_page_remove_category` | Remove category from page | `workspace_id`, `page_id`, `category_id` | - |

**Note:** Page content is stored as BlockNote JSON format.

### Whiteboards (9 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `knowledge_whiteboard_list` | List all whiteboards | `workspace_id` | `is_archived`, `limit`, `offset` |
| `knowledge_whiteboard_get` | Get whiteboard with content | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_create` | Create whiteboard | `workspace_id`, `title` | `icon`, `content` |
| `knowledge_whiteboard_update` | Update whiteboard | `workspace_id`, `whiteboard_id` | `title`, `icon`, `content`, `thumbnail` |
| `knowledge_whiteboard_delete` | Delete whiteboard | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_archive` | Archive whiteboard | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_restore` | Restore whiteboard | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_favorite` | Add to favorites | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_unfavorite` | Remove from favorites | `workspace_id`, `whiteboard_id` | - |

**Note:** Whiteboard content is stored as Excalidraw scene data JSON.

---

## 6. Communications (14 tools)

Communication tools for SMS, calls, and phone number management.

> **Scoping:** Communications tools use `user_id` instead of `workspace_id` as they link to leads/contacts at the user level.

### Phone Numbers (4 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `phone_number_list` | List user's phone numbers | `user_id` | `limit`, `offset` |
| `phone_number_provision` | Provision new number | `user_id` | `area_code`, `country` (default: US) |
| `phone_number_release` | Release phone number | `user_id`, `phone_number_id` | - |
| `phone_number_set_default` | Set default outbound number | `user_id`, `phone_number_id` | - |

### SMS (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `sms_send` | Send SMS message | `user_id`, `to_phone`, `body` | `from_number`, `lead_id`, `contact_id` |
| `sms_list` | List SMS messages | `user_id` | `phone_number`, `direction`, `limit`, `offset` |
| `sms_get_conversation` | Get SMS conversation thread | `user_id`, `phone_number` | - |
| `sms_get_threads` | List all SMS threads | `user_id` | `limit`, `offset` |
| `sms_mark_thread_read` | Mark thread as read | `user_id`, `phone_number` | - |

**SMS Direction:** `inbound`, `outbound`

### Calls (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `call_initiate` | Start outbound call | `user_id`, `to_phone` | `from_number`, `lead_id`, `contact_id` |
| `call_get` | Get call details | `user_id`, `call_id` | - |
| `call_list` | List calls | `user_id` | `direction`, `status`, `limit`, `offset` |
| `call_get_recording` | Get call recording URL | `user_id`, `call_id` | - |
| `call_end` | End active call | `user_id`, `call_id` | - |

**Call Status:** `initiated`, `ringing`, `in-progress`, `completed`, `failed`, `busy`, `no-answer`, `canceled`

---

## 7. Goals & KPIs (21 tools)

Goal tracking and KPI management tools for business metrics.

> **Scoping:** Goals and KPIs use `profile_id` as they are personal user-level data, not workspace-bound.

### Goals (7 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `goal_list` | List all goals | `profile_id` | `type`, `limit`, `offset` |
| `goal_get` | Get goal with progress | `profile_id`, `goal_id` | - |
| `goal_create` | Create a goal | `profile_id`, `name`, `type`, `target_amount`, `target_date` | `description` |
| `goal_update` | Update goal | `profile_id`, `goal_id` | `name`, `target_amount`, `target_date`, `description` |
| `goal_delete` | Delete goal | `profile_id`, `goal_id` | - |
| `goal_get_progress` | Get goal progress | `profile_id`, `goal_id` | - |
| `goal_update_progress` | Manually update progress | `profile_id`, `goal_id`, `current_amount` | - |

**Goal Types:** `revenue`, `profit`, `valuation`, `runway`, `revenue_multiple`

### Exit Plan (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `exit_plan_get` | Get exit plan | `profile_id` | - |
| `exit_plan_create` | Create exit plan | `profile_id`, `target_valuation`, `target_date` | `exit_type`, `notes` |
| `exit_plan_update` | Update exit plan | `profile_id` | `target_valuation`, `current_valuation`, `target_multiple`, `target_runway`, `target_date`, `exit_type`, `notes` |
| `exit_plan_delete` | Delete exit plan | `profile_id` | - |
| `exit_plan_get_scenarios` | Get exit scenarios | `profile_id` | - |

**Exit Types:** `acquisition`, `ipo`, `merger`, `liquidation`, `other`

### KPIs (9 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `kpi_list` | List KPI inputs | `profile_id` | `industry`, `period`, `limit`, `offset` |
| `kpi_get` | Get KPI record | `profile_id`, `kpi_id` | - |
| `kpi_record` | Record KPI values | `profile_id`, `period_start`, `period_end` | `revenue`, `expenses`, `customer_count`, `customer_acquisition_cost`, `lifetime_value`, `churned_customers`, `inventory_value`, `units_sold`, `billable_hours`, `employee_count`, `utilization_target` |
| `kpi_update` | Update KPI values | `profile_id`, `kpi_id` | (same as kpi_record) |
| `kpi_delete` | Delete KPI record | `profile_id`, `kpi_id` | - |
| `kpi_get_trends` | Get KPI trends over time | `profile_id`, `metric_name` | `periods` (default 6) |
| `kpi_get_saas_metrics` | Get SaaS-specific metrics | `profile_id` | - |
| `kpi_get_retail_metrics` | Get Retail-specific metrics | `profile_id` | - |
| `kpi_get_service_metrics` | Get Service-specific metrics | `profile_id` | - |

**Industry-Specific Metrics:**
- **SaaS:** MRR, ARR, churn rate, LTV/CAC ratio, ARPU
- **Retail:** Inventory turnover, average sale value, gross margin
- **Service:** Utilization rate, revenue per employee, effective hourly rate

---

## 8. Agents (27 tools)

AI agent management, conversations, memories, and workflow automation.

### Agents (8 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `agent_list` | List workspace agents | `workspace_id` | `is_active`, `limit`, `offset` |
| `agent_get` | Get agent details | `workspace_id`, `agent_id` | - |
| `agent_create` | Create an agent | `workspace_id`, `name` | `description`, `system_prompt`, `model`, `tools`, `skill_ids` |
| `agent_update` | Update agent | `workspace_id`, `agent_id` | `name`, `description`, `system_prompt`, `model`, `tools`, `is_active` |
| `agent_delete` | Delete agent | `workspace_id`, `agent_id` | - |
| `agent_add_skill` | Add skill to agent | `workspace_id`, `agent_id`, `skill_id` | - |
| `agent_remove_skill` | Remove skill from agent | `workspace_id`, `agent_id`, `skill_id` | - |
| `agent_get_skills` | Get agent skills | `workspace_id`, `agent_id` | - |

### Agent Conversations (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `agent_conversation_list` | List agent conversations | `workspace_id` | `agent_id`, `limit`, `offset` |
| `agent_conversation_get` | Get conversation with messages | `workspace_id`, `conversation_id` | - |
| `agent_conversation_create` | Start conversation with agent | `workspace_id`, `agent_id` | `title` |
| `agent_conversation_send_message` | Send message to agent | `workspace_id`, `conversation_id`, `content` | - |
| `agent_conversation_delete` | Delete conversation | `workspace_id`, `conversation_id` | - |

### Agent Memories (5 tools)

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `agent_memory_list` | List agent memories | `workspace_id`, `agent_id` | `limit`, `offset` |
| `agent_memory_create` | Create agent memory | `workspace_id`, `agent_id`, `path`, `content` | - |
| `agent_memory_update` | Update agent memory | `workspace_id`, `agent_id`, `memory_id`, `content` | - |
| `agent_memory_delete` | Delete agent memory | `workspace_id`, `agent_id`, `memory_id` | - |
| `agent_memory_search` | Search agent memories | `workspace_id`, `agent_id`, `query` | - |

**Note:** Memory content is stored as markdown.

### Workflows (9 tools)

> **Scoping:** Workflows use `user_id` as they are user-specific automations.

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|---------------------|---------------------|
| `workflow_list` | List workflows | `user_id` | `is_active`, `limit`, `offset` |
| `workflow_get` | Get workflow | `user_id`, `workflow_id` | - |
| `workflow_create` | Create workflow | `user_id`, `name`, `trigger_type`, `actions[]` | `description`, `trigger_config`, `is_active` |
| `workflow_update` | Update workflow | `user_id`, `workflow_id` | `name`, `description`, `trigger_type`, `trigger_config`, `actions`, `is_active` |
| `workflow_delete` | Delete workflow | `user_id`, `workflow_id` | - |
| `workflow_execute` | Manually execute workflow | `user_id`, `workflow_id` | `input` |
| `workflow_get_executions` | Get execution history | `user_id`, `workflow_id` | `limit`, `offset` |
| `workflow_enable` | Enable workflow | `user_id`, `workflow_id` | - |
| `workflow_disable` | Disable workflow | `user_id`, `workflow_id` | - |

**Trigger Types:** `schedule`, `webhook`, `event`, `manual`
**Execution Status:** `pending`, `running`, `completed`, `failed`

---

## Summary

| Department | Tools | Scoping |
|------------|-------|---------|
| Finance | 62 | `workspace_id` |
| CRM | 53 | `workspace_id` |
| Team | 38 | `workspace_id` |
| Projects | 40 | `workspace_id` |
| Knowledge | 36 | `workspace_id` |
| Communications | 14 | `user_id` |
| Goals & KPIs | 21 | `profile_id` |
| Agents | 27 | `workspace_id` / `user_id` (workflows) |
| **Total** | **291** | - |
