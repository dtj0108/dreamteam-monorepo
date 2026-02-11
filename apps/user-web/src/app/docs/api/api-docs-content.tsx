"use client"

import { useState } from "react"
import { Header } from "@/components/marketing/header-navigation/header"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// --- Data Types ---

interface ApiParam {
  name: string
  type: string
  required: boolean
  description: string
}

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string
  description: string
  params?: ApiParam[]
  body?: ApiParam[]
  exampleResponse?: object
}

interface ApiSection {
  id: string
  title: string
  description: string
  endpoints: ApiEndpoint[]
}

// --- Method badge colors ---

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PATCH: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

// --- Endpoint Data ---

const apiSections: ApiSection[] = [
  {
    id: "authentication",
    title: "Authentication",
    description: "Verify API key and retrieve workspace information.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/auth/verify",
        description: "Verify your API key and return workspace info.",
        exampleResponse: { id: "ws_abc123", name: "My Workspace", slug: "my-workspace", keyName: "Production Key" },
      },
    ],
  },
  {
    id: "leads",
    title: "Leads",
    description: "Manage leads in your CRM pipeline.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/leads",
        description: "List all leads in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
          { name: "status", type: "string", required: false, description: "Filter by lead status" },
        ],
        exampleResponse: { data: [{ id: "uuid", name: "Acme Corp", website: "https://acme.com", industry: "Technology", status: "new", created_at: "2025-01-01T00:00:00Z" }] },
      },
      {
        method: "POST",
        path: "/api/make/leads",
        description: "Create a new lead. Fires lead.created webhook.",
        body: [
          { name: "name", type: "string", required: true, description: "Lead/company name" },
          { name: "website", type: "string", required: false, description: "Company website" },
          { name: "industry", type: "string", required: false, description: "Industry" },
          { name: "status", type: "string", required: false, description: "Lead status (default: auto-assigned from pipeline)" },
          { name: "notes", type: "string", required: false, description: "Notes" },
          { name: "address", type: "string", required: false, description: "Street address" },
          { name: "city", type: "string", required: false, description: "City" },
          { name: "state", type: "string", required: false, description: "State/region" },
          { name: "country", type: "string", required: false, description: "Country" },
          { name: "postal_code", type: "string", required: false, description: "Postal/zip code" },
          { name: "pipeline_id", type: "string", required: false, description: "Pipeline ID (default: your default pipeline)" },
          { name: "stage_id", type: "string", required: false, description: "Pipeline stage ID (default: first stage)" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/leads/:id",
        description: "Get a single lead by ID, including contacts, opportunities, and tasks.",
        exampleResponse: { id: "uuid", name: "Acme Corp", status: "new", contacts: [], opportunities: [], tasks: [] },
      },
      {
        method: "PUT",
        path: "/api/make/leads/:id",
        description: "Update a lead. Fires lead.status_changed webhook if status changes.",
        body: [
          { name: "name", type: "string", required: false, description: "Lead name" },
          { name: "website", type: "string", required: false, description: "Website" },
          { name: "industry", type: "string", required: false, description: "Industry" },
          { name: "status", type: "string", required: false, description: "Lead status" },
          { name: "notes", type: "string", required: false, description: "Notes" },
          { name: "pipeline_id", type: "string", required: false, description: "Pipeline ID" },
          { name: "stage_id", type: "string", required: false, description: "Stage ID" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/leads/:id",
        description: "Delete a lead.",
        exampleResponse: { success: true },
      },
      {
        method: "GET",
        path: "/api/make/leads/search",
        description: "Search leads by name, industry, or status.",
        params: [
          { name: "q", type: "string", required: false, description: "Search query (matches name, website, industry)" },
          { name: "status", type: "string", required: false, description: "Filter by status" },
          { name: "industry", type: "string", required: false, description: "Filter by industry" },
          { name: "limit", type: "number", required: false, description: "Max results (default: 50)" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/leads/by-email",
        description: "Find leads that have a contact with the given email.",
        params: [
          { name: "email", type: "string", required: true, description: "Email address to search" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/leads/by-phone",
        description: "Find leads that have a contact with the given phone number.",
        params: [
          { name: "phone", type: "string", required: true, description: "Phone number to search" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/leads/:id/contacts",
        description: "List all contacts for a specific lead.",
      },
      {
        method: "GET",
        path: "/api/make/leads/:id/opportunities",
        description: "List all opportunities for a specific lead.",
      },
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    description: "Manage contacts associated with leads.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/contacts",
        description: "List all contacts in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "lead_id", type: "string", required: false, description: "Filter by lead ID" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/contacts",
        description: "Create a new contact under a lead. Fires contact.created webhook.",
        body: [
          { name: "lead_id", type: "string", required: true, description: "Lead to associate the contact with" },
          { name: "first_name", type: "string", required: true, description: "First name" },
          { name: "last_name", type: "string", required: false, description: "Last name" },
          { name: "email", type: "string", required: false, description: "Email address" },
          { name: "phone", type: "string", required: false, description: "Phone number" },
          { name: "title", type: "string", required: false, description: "Job title" },
          { name: "notes", type: "string", required: false, description: "Notes" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/contacts/:id",
        description: "Get a single contact by ID, including associated lead info.",
      },
      {
        method: "PUT",
        path: "/api/make/contacts/:id",
        description: "Update a contact.",
        body: [
          { name: "first_name", type: "string", required: false, description: "First name" },
          { name: "last_name", type: "string", required: false, description: "Last name" },
          { name: "email", type: "string", required: false, description: "Email address" },
          { name: "phone", type: "string", required: false, description: "Phone number" },
          { name: "title", type: "string", required: false, description: "Job title" },
          { name: "notes", type: "string", required: false, description: "Notes" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/contacts/:id",
        description: "Delete a contact.",
      },
      {
        method: "GET",
        path: "/api/make/contacts/by-email",
        description: "Find contacts by email address.",
        params: [
          { name: "email", type: "string", required: true, description: "Email address to search" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/contacts/by-phone",
        description: "Find contacts by phone number.",
        params: [
          { name: "phone", type: "string", required: true, description: "Phone number to search" },
        ],
      },
    ],
  },
  {
    id: "opportunities",
    title: "Opportunities",
    description: "Track sales opportunities associated with leads.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/opportunities",
        description: "List all opportunities in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
          { name: "stage", type: "string", required: false, description: "Filter by stage" },
          { name: "lead_id", type: "string", required: false, description: "Filter by lead ID" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/opportunities",
        description: "Create a new opportunity. Fires opportunity.created webhook.",
        body: [
          { name: "lead_id", type: "string", required: true, description: "Lead to associate with" },
          { name: "name", type: "string", required: true, description: "Opportunity name" },
          { name: "value", type: "number", required: false, description: "Deal value" },
          { name: "stage", type: "string", required: false, description: "Stage (default: prospect)" },
          { name: "probability", type: "number", required: false, description: "Win probability 0-100" },
          { name: "expected_close_date", type: "string", required: false, description: "Expected close date (ISO 8601)" },
          { name: "notes", type: "string", required: false, description: "Notes" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/opportunities/:id",
        description: "Get a single opportunity by ID.",
      },
      {
        method: "PUT",
        path: "/api/make/opportunities/:id",
        description: "Update an opportunity. Fires opportunity.stage_changed and opportunity.won webhooks when applicable.",
        body: [
          { name: "name", type: "string", required: false, description: "Opportunity name" },
          { name: "value", type: "number", required: false, description: "Deal value" },
          { name: "stage", type: "string", required: false, description: "Stage" },
          { name: "probability", type: "number", required: false, description: "Win probability" },
          { name: "expected_close_date", type: "string", required: false, description: "Expected close date" },
          { name: "notes", type: "string", required: false, description: "Notes" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/opportunities/:id",
        description: "Delete an opportunity.",
      },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    description: "Manage projects and their tasks.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/projects",
        description: "List all projects in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
          { name: "status", type: "string", required: false, description: "Filter by status (active, completed, archived)" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/projects",
        description: "Create a new project. Fires project.created webhook.",
        body: [
          { name: "name", type: "string", required: true, description: "Project name" },
          { name: "description", type: "string", required: false, description: "Description" },
          { name: "status", type: "string", required: false, description: "Status (default: active)" },
          { name: "priority", type: "string", required: false, description: "Priority (default: medium)" },
          { name: "color", type: "string", required: false, description: "Hex color (default: #6366f1)" },
          { name: "icon", type: "string", required: false, description: "Icon name (default: folder)" },
          { name: "start_date", type: "string", required: false, description: "Start date (ISO 8601)" },
          { name: "target_end_date", type: "string", required: false, description: "Target end date" },
          { name: "budget", type: "number", required: false, description: "Budget amount" },
          { name: "owner_id", type: "string", required: false, description: "Owner user ID (must be workspace member)" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/projects/:id",
        description: "Get a single project by ID, including members, tasks, and progress.",
      },
      {
        method: "PUT",
        path: "/api/make/projects/:id",
        description: "Update a project.",
        body: [
          { name: "name", type: "string", required: false, description: "Project name" },
          { name: "description", type: "string", required: false, description: "Description" },
          { name: "status", type: "string", required: false, description: "Status" },
          { name: "priority", type: "string", required: false, description: "Priority" },
          { name: "start_date", type: "string", required: false, description: "Start date" },
          { name: "target_end_date", type: "string", required: false, description: "Target end date" },
          { name: "actual_end_date", type: "string", required: false, description: "Actual end date" },
          { name: "budget", type: "number", required: false, description: "Budget" },
          { name: "owner_id", type: "string", required: false, description: "Owner user ID" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/projects/:id",
        description: "Delete a project.",
      },
      {
        method: "GET",
        path: "/api/make/projects/:id/tasks",
        description: "List all tasks for a specific project.",
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Manage tasks within projects.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/tasks",
        description: "List all tasks in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
          { name: "status", type: "string", required: false, description: "Filter by status (todo, in_progress, done)" },
          { name: "project_id", type: "string", required: false, description: "Filter by project ID" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/tasks",
        description: "Create a new task. Fires task.created webhook.",
        body: [
          { name: "project_id", type: "string", required: true, description: "Project to add the task to" },
          { name: "title", type: "string", required: true, description: "Task title" },
          { name: "description", type: "string", required: false, description: "Description" },
          { name: "status", type: "string", required: false, description: "Status (default: todo)" },
          { name: "priority", type: "string", required: false, description: "Priority (default: medium)" },
          { name: "start_date", type: "string", required: false, description: "Start date" },
          { name: "due_date", type: "string", required: false, description: "Due date" },
          { name: "estimated_hours", type: "number", required: false, description: "Estimated hours" },
          { name: "assignee_ids", type: "string[]", required: false, description: "Array of user IDs to assign" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/tasks/:id",
        description: "Get a single task by ID, including assignees and labels.",
      },
      {
        method: "PUT",
        path: "/api/make/tasks/:id",
        description: "Update a task. Fires task.completed and task.assigned webhooks when applicable.",
        body: [
          { name: "title", type: "string", required: false, description: "Task title" },
          { name: "description", type: "string", required: false, description: "Description" },
          { name: "status", type: "string", required: false, description: "Status" },
          { name: "priority", type: "string", required: false, description: "Priority" },
          { name: "start_date", type: "string", required: false, description: "Start date" },
          { name: "due_date", type: "string", required: false, description: "Due date" },
          { name: "estimated_hours", type: "number", required: false, description: "Estimated hours" },
          { name: "actual_hours", type: "number", required: false, description: "Actual hours" },
          { name: "assignee_ids", type: "string[]", required: false, description: "Replace assignees with these user IDs" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/tasks/:id",
        description: "Delete a task.",
      },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    description: "Send and retrieve messages in workspace channels.",
    endpoints: [
      {
        method: "POST",
        path: "/api/make/messages",
        description: "Send a new message to a channel. Fires message.created webhook.",
        body: [
          { name: "channel_id", type: "string", required: true, description: "Channel to send the message to" },
          { name: "content", type: "string", required: true, description: "Message content" },
          { name: "sender_id", type: "string", required: false, description: "Sender user ID (defaults to API key owner)" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/messages/:id",
        description: "Get a single message by ID, including sender info and reactions.",
      },
    ],
  },
  {
    id: "communications",
    title: "Communications",
    description: "View SMS and call records.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/communications",
        description: "List communications (SMS and calls).",
        params: [
          { name: "type", type: "string", required: false, description: "Filter by type: sms or call" },
          { name: "direction", type: "string", required: false, description: "Filter by direction: inbound or outbound" },
          { name: "limit", type: "number", required: false, description: "Max results (default: 50, max: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/communications/:id",
        description: "Get a single communication record by ID.",
      },
    ],
  },
  {
    id: "sms",
    title: "SMS",
    description: "Send SMS messages via Twilio.",
    endpoints: [
      {
        method: "POST",
        path: "/api/make/sms",
        description: "Send an SMS message. Requires available SMS credits. Fires sms.sent webhook.",
        body: [
          { name: "to", type: "string", required: true, description: "Recipient phone number (E.164 format)" },
          { name: "message", type: "string", required: true, description: "Message body" },
          { name: "from_number_id", type: "string", required: true, description: "Twilio number ID to send from" },
          { name: "lead_id", type: "string", required: false, description: "Associated lead ID" },
          { name: "contact_id", type: "string", required: false, description: "Associated contact ID" },
        ],
        exampleResponse: { id: "uuid", twilio_sid: "SM...", from: "+15551234567", to: "+15559876543", body: "Hello!", status: "queued" },
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts (Financial)",
    description: "Manage financial accounts (bank accounts, credit cards, etc.).",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/accounts",
        description: "List all active financial accounts.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "type", type: "string", required: false, description: "Filter by account type" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/accounts",
        description: "Create a new financial account.",
        body: [
          { name: "name", type: "string", required: true, description: "Account name" },
          { name: "type", type: "string", required: true, description: "Account type (checking, savings, credit_card, etc.)" },
          { name: "institution", type: "string", required: false, description: "Bank/institution name" },
          { name: "balance", type: "number", required: false, description: "Initial balance (default: 0)" },
          { name: "currency", type: "string", required: false, description: "Currency code (default: USD)" },
          { name: "last_four", type: "string", required: false, description: "Last four digits of account number" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/accounts/:id",
        description: "Get a single account by ID.",
      },
      {
        method: "PUT",
        path: "/api/make/accounts/:id",
        description: "Update an account.",
        body: [
          { name: "name", type: "string", required: false, description: "Account name" },
          { name: "type", type: "string", required: false, description: "Account type" },
          { name: "institution", type: "string", required: false, description: "Institution" },
          { name: "currency", type: "string", required: false, description: "Currency code" },
          { name: "last_four", type: "string", required: false, description: "Last four digits" },
          { name: "is_active", type: "boolean", required: false, description: "Whether the account is active" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/accounts/:id",
        description: "Deactivate an account (soft delete).",
      },
      {
        method: "GET",
        path: "/api/make/accounts/:id/balance",
        description: "Get the current balance for an account.",
        exampleResponse: { id: "uuid", name: "Business Checking", balance: 12500.50, currency: "USD" },
      },
    ],
  },
  {
    id: "transactions",
    title: "Transactions",
    description: "Manage financial transactions.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/transactions",
        description: "List transactions across workspace accounts.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
          { name: "account_id", type: "string", required: false, description: "Filter by account ID" },
          { name: "category_id", type: "string", required: false, description: "Filter by category ID" },
          { name: "start_date", type: "string", required: false, description: "Filter from date (ISO 8601)" },
          { name: "end_date", type: "string", required: false, description: "Filter to date (ISO 8601)" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/transactions",
        description: "Create a new transaction. Fires transaction.created webhook. May trigger budget.alert.",
        body: [
          { name: "account_id", type: "string", required: true, description: "Account to record the transaction in" },
          { name: "amount", type: "number", required: true, description: "Transaction amount (negative for expenses)" },
          { name: "date", type: "string", required: true, description: "Transaction date (ISO 8601)" },
          { name: "category_id", type: "string", required: false, description: "Category ID" },
          { name: "description", type: "string", required: false, description: "Description" },
          { name: "notes", type: "string", required: false, description: "Notes" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/transactions/:id",
        description: "Get a single transaction by ID.",
      },
      {
        method: "PUT",
        path: "/api/make/transactions/:id",
        description: "Update a transaction.",
        body: [
          { name: "category_id", type: "string", required: false, description: "Category ID" },
          { name: "amount", type: "number", required: false, description: "Amount" },
          { name: "date", type: "string", required: false, description: "Date" },
          { name: "description", type: "string", required: false, description: "Description" },
          { name: "notes", type: "string", required: false, description: "Notes" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/transactions/:id",
        description: "Delete a transaction.",
      },
    ],
  },
  {
    id: "knowledge-pages",
    title: "Knowledge Pages",
    description: "Manage knowledge base pages (wiki-style documents).",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/knowledge-pages",
        description: "List all knowledge pages in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
          { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
          { name: "parent_id", type: "string", required: false, description: "Filter by parent page ID" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/knowledge-pages",
        description: "Create a new knowledge page.",
        body: [
          { name: "title", type: "string", required: true, description: "Page title" },
          { name: "content", type: "string | array", required: false, description: "Page content (plain text or BlockNote JSON)" },
          { name: "icon", type: "string", required: false, description: "Page icon" },
          { name: "cover_image", type: "string", required: false, description: "Cover image URL" },
          { name: "parent_id", type: "string", required: false, description: "Parent page ID for nesting" },
          { name: "is_template", type: "boolean", required: false, description: "Create as template" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/knowledge-pages/:id",
        description: "Get a single knowledge page by ID, including full content.",
      },
      {
        method: "PUT",
        path: "/api/make/knowledge-pages/:id",
        description: "Update a knowledge page.",
        body: [
          { name: "title", type: "string", required: false, description: "Title" },
          { name: "content", type: "string | array", required: false, description: "Content (plain text or BlockNote JSON)" },
          { name: "icon", type: "string", required: false, description: "Icon" },
          { name: "cover_image", type: "string", required: false, description: "Cover image URL" },
          { name: "parent_id", type: "string", required: false, description: "Parent page ID" },
          { name: "is_template", type: "boolean", required: false, description: "Template flag" },
          { name: "is_archived", type: "boolean", required: false, description: "Archive flag" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/make/knowledge-pages/:id",
        description: "Delete a knowledge page.",
      },
      {
        method: "GET",
        path: "/api/make/knowledge-pages/search",
        description: "Search knowledge pages by title.",
        params: [
          { name: "q", type: "string", required: true, description: "Search query" },
          { name: "limit", type: "number", required: false, description: "Max results (default: 50)" },
        ],
      },
    ],
  },
  {
    id: "channels",
    title: "Channels",
    description: "Manage workspace messaging channels.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/channels",
        description: "List all channels in the workspace.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
        ],
      },
      {
        method: "POST",
        path: "/api/make/channels",
        description: "Create a new channel.",
        body: [
          { name: "name", type: "string", required: true, description: "Channel name (must be unique)" },
          { name: "description", type: "string", required: false, description: "Channel description" },
          { name: "is_private", type: "boolean", required: false, description: "Private channel (default: false)" },
          { name: "member_ids", type: "string[]", required: false, description: "Initial member user IDs" },
        ],
      },
      {
        method: "GET",
        path: "/api/make/channels/:id",
        description: "Get a single channel by ID, including members.",
      },
      {
        method: "GET",
        path: "/api/make/channels/:id/messages",
        description: "List messages in a channel (newest first, returned in chronological order).",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 50)" },
          { name: "before", type: "string", required: false, description: "Cursor for pagination (ISO 8601 timestamp)" },
        ],
      },
    ],
  },
  {
    id: "twilio-numbers",
    title: "Twilio Numbers",
    description: "List phone numbers available for SMS and calls.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/twilio-numbers",
        description: "List all Twilio phone numbers owned by the API key creator.",
        exampleResponse: { data: [{ id: "uuid", name: "+1 (555) 123-4567", phone_number: "+15551234567", is_primary: true }] },
      },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Subscribe to real-time event notifications.",
    endpoints: [
      {
        method: "POST",
        path: "/api/make/webhooks/subscribe",
        description: "Subscribe to webhook events.",
        body: [
          { name: "url", type: "string", required: true, description: "Webhook callback URL" },
          { name: "event", type: "string", required: true, description: "Event type to subscribe to (see Events below)" },
          { name: "filter", type: "object", required: false, description: "Optional event filter" },
        ],
        exampleResponse: { id: "webhook_uuid" },
      },
      {
        method: "GET",
        path: "/api/make/webhooks",
        description: "List all webhook subscriptions for the workspace.",
      },
      {
        method: "DELETE",
        path: "/api/make/webhooks/:id",
        description: "Delete a specific webhook subscription.",
      },
      {
        method: "DELETE",
        path: "/api/make/webhooks",
        description: "Bulk delete webhook subscriptions.",
        params: [
          { name: "event", type: "string", required: false, description: "Delete only webhooks for this event type" },
        ],
      },
    ],
  },
  {
    id: "users",
    title: "Users",
    description: "Retrieve workspace member information.",
    endpoints: [
      {
        method: "GET",
        path: "/api/make/users/me",
        description: "Get the current API key owner's profile and workspace info.",
        exampleResponse: { id: "uuid", name: "John Doe", email: "john@example.com", workspace: { id: "ws_id", name: "My Workspace" }, api_key_name: "Production Key" },
      },
      {
        method: "GET",
        path: "/api/make/users",
        description: "List all workspace members.",
        params: [
          { name: "limit", type: "number", required: false, description: "Max results (default: 100)" },
        ],
      },
    ],
  },
]

const webhookEvents = [
  { event: "lead.created", description: "A new lead is created" },
  { event: "lead.status_changed", description: "A lead's status changes" },
  { event: "lead.stage_changed", description: "A lead moves to a different pipeline stage" },
  { event: "contact.created", description: "A new contact is created" },
  { event: "opportunity.created", description: "A new opportunity is created" },
  { event: "opportunity.stage_changed", description: "An opportunity's stage changes" },
  { event: "opportunity.won", description: "An opportunity is marked as won" },
  { event: "project.created", description: "A new project is created" },
  { event: "task.created", description: "A new task is created" },
  { event: "task.completed", description: "A task is marked as done" },
  { event: "task.assigned", description: "A task's assignee changes" },
  { event: "task.overdue", description: "A task becomes overdue" },
  { event: "message.created", description: "A new message is sent" },
  { event: "transaction.created", description: "A new transaction is created" },
  { event: "budget.alert", description: "Spending exceeds a budget threshold" },
  { event: "sms.received", description: "An SMS is received" },
  { event: "sms.sent", description: "An SMS is sent" },
  { event: "sms.delivery_failed", description: "SMS delivery fails" },
  { event: "call.received", description: "A call is received" },
  { event: "call.started", description: "An outbound call starts" },
  { event: "call.ended", description: "A call ends" },
  { event: "call.recording_ready", description: "A call recording is ready" },
]

// --- Sidebar navigation sections ---

const sidebarSections = [
  { id: "introduction", title: "Introduction" },
  { id: "auth-guide", title: "Authentication" },
  { id: "pagination", title: "Pagination" },
  { id: "webhooks-guide", title: "Webhooks" },
  ...apiSections.map((s) => ({ id: s.id, title: s.title })),
]

// --- Components ---

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide", methodColors[method] || "bg-gray-100 text-gray-800")}>
      {method}
    </span>
  )
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm">
      <code className={language ? `language-${language}` : ""}>{children}</code>
    </pre>
  )
}

function ParamTable({ params, label }: { params: ApiParam[]; label: string }) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Required</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                <td className="px-3 py-2">
                  {p.required ? (
                    <Badge variant="destructive" className="text-[10px]">Required</Badge>
                  ) : (
                    <span className="text-muted-foreground">Optional</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const curlPath = endpoint.path.replace(/:(\w+)/g, "{$1}")
  const curlExample =
    endpoint.method === "GET"
      ? `curl -H "Authorization: Bearer sk_live_..." \\\n  "https://dreamteam.ai${curlPath}"`
      : `curl -X ${endpoint.method} \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(
          endpoint.body
            ? Object.fromEntries(endpoint.body.filter((b) => b.required).map((b) => [b.name, b.type === "number" ? 0 : b.type === "boolean" ? true : `example_${b.name}`]))
            : {},
          null,
          2
        )}' \\\n  "https://dreamteam.ai${curlPath}"`

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-medium break-all">{endpoint.path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{endpoint.description}</p>

      {endpoint.params && endpoint.params.length > 0 && (
        <ParamTable params={endpoint.params} label="Query Parameters" />
      )}

      {endpoint.body && endpoint.body.length > 0 && (
        <ParamTable params={endpoint.body} label="Request Body (JSON)" />
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Example Request
        </summary>
        <div className="mt-2">
          <CodeBlock language="bash">{curlExample}</CodeBlock>
        </div>
      </details>

      {endpoint.exampleResponse && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Example Response
          </summary>
          <div className="mt-2">
            <CodeBlock language="json">{JSON.stringify(endpoint.exampleResponse, null, 2)}</CodeBlock>
          </div>
        </details>
      )}
    </div>
  )
}

function SectionBlock({ section }: { section: ApiSection }) {
  return (
    <div id={section.id} className="scroll-mt-24">
      <h2 className="text-2xl font-semibold">{section.title}</h2>
      <p className="mt-1 text-muted-foreground">{section.description}</p>
      <div className="mt-4 space-y-4">
        {section.endpoints.map((endpoint, i) => (
          <EndpointCard key={i} endpoint={endpoint} />
        ))}
      </div>
    </div>
  )
}

// --- Main Content ---

export function ApiDocsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 sm:mb-12">
          <Badge variant="secondary" className="mb-3">API Reference</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">API Documentation</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            The dreamteam.ai REST API lets you manage your workspace data programmatically. Use it to build integrations, automate workflows, or connect with tools like Make.com and Zapier.
          </p>
        </div>

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium lg:hidden"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Navigation
        </button>

        <div className="flex gap-8">
          {/* Sidebar */}
          <nav
            className={cn(
              "shrink-0 lg:block lg:w-56",
              sidebarOpen ? "block" : "hidden"
            )}
          >
            <div className="sticky top-24 space-y-0.5 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              {sidebarSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-12">
            {/* Introduction */}
            <div id="introduction" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold">Introduction</h2>
              <p className="mt-2 text-muted-foreground">
                All API requests are made to the base URL:
              </p>
              <CodeBlock>https://dreamteam.ai/api/make</CodeBlock>
              <p className="mt-3 text-sm text-muted-foreground">
                The API uses JSON for request and response bodies. All endpoints require authentication via an API key. Responses include standard HTTP status codes: 200 for success, 201 for creation, 400 for validation errors, 401 for unauthorized, 404 for not found, and 500 for server errors.
              </p>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
                <span className="text-lg leading-none">🔗</span>
                <div>
                  <p className="text-sm font-medium">Using Make.com?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We have a pre-built Make.com module that wraps this API so you can build automations without writing code. Just add your API key in Make.com and you&apos;ll have access to all the triggers and actions below — no HTTP configuration needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div id="auth-guide" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold">Authentication</h2>
              <p className="mt-2 text-muted-foreground">
                Authenticate by including your API key in the <code className="rounded bg-muted px-1.5 py-0.5 text-sm">Authorization</code> header.
              </p>
              <div className="mt-4">
                <CodeBlock language="bash">{`curl -H "Authorization: Bearer sk_live_..." \\
  "https://dreamteam.ai/api/make/auth/verify"`}</CodeBlock>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium">How to get your API key</p>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  <li>Log in to dreamteam.ai</li>
                  <li>Go to <strong>Settings &gt; API Keys</strong></li>
                  <li>Click <strong>Create API Key</strong></li>
                  <li>Copy the key (starts with <code className="rounded bg-muted px-1 text-xs">sk_live_</code>)</li>
                </ol>
                <p className="mt-3 text-sm text-muted-foreground">
                  API keys are scoped to a workspace. All operations will affect data in the workspace the key belongs to.
                </p>
              </div>
            </div>

            {/* Pagination */}
            <div id="pagination" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold">Pagination</h2>
              <p className="mt-2 text-muted-foreground">
                List endpoints support pagination using <code className="rounded bg-muted px-1.5 py-0.5 text-sm">limit</code> and <code className="rounded bg-muted px-1.5 py-0.5 text-sm">offset</code> query parameters.
              </p>
              <div className="mt-4">
                <CodeBlock language="bash">{`# Get the first 10 leads
curl -H "Authorization: Bearer sk_live_..." \\
  "https://dreamteam.ai/api/make/leads?limit=10&offset=0"

# Get the next 10
curl -H "Authorization: Bearer sk_live_..." \\
  "https://dreamteam.ai/api/make/leads?limit=10&offset=10"`}</CodeBlock>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Default limit is 100 for most endpoints. The maximum is 100. Responses wrap data in a <code className="rounded bg-muted px-1 text-xs">{`{ "data": [...] }`}</code> array.
              </p>
            </div>

            {/* Webhooks Guide */}
            <div id="webhooks-guide" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold">Webhooks</h2>
              <p className="mt-2 text-muted-foreground">
                Subscribe to real-time events to get notified when things happen in your workspace. When an event occurs, we&apos;ll send a POST request to your registered URL with the event data as JSON.
              </p>
              <div className="mt-4">
                <CodeBlock language="bash">{`# Subscribe to new lead events
curl -X POST \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-app.com/webhook", "event": "lead.created"}' \\
  "https://dreamteam.ai/api/make/webhooks/subscribe"`}</CodeBlock>
              </div>

              <h3 className="mt-6 text-lg font-semibold">Available Events</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Event</th>
                      <th className="px-3 py-2 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEvents.map((e) => (
                      <tr key={e.event} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{e.event}</td>
                        <td className="px-3 py-2 text-muted-foreground">{e.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Endpoint Sections */}
            {apiSections.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}

            {/* Footer */}
            <div className="border-t border-border pt-8 pb-12">
              <p className="text-sm text-muted-foreground">
                Need help? Contact us at{" "}
                <a href="mailto:support@dreamteam.ai" className="text-primary underline underline-offset-4">
                  support@dreamteam.ai
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
