import type { SupabaseClient } from "@supabase/supabase-js"

export interface ToolContext {
  userId: string
  workspaceId?: string
  supabase: SupabaseClient
}

// Tool result types for UI rendering
export interface TransactionsResult {
  transactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    category: string | null
  }>
  summary: {
    count: number
    totalIncome: number
    totalExpenses: number
    netChange: number
  }
}

export interface BudgetsResult {
  budgets: Array<{
    id: string
    category: string
    amount: number
    spent: number
    remaining: number
    percentUsed: number
    period: string
  }>
  summary: {
    totalBudgeted: number
    totalSpent: number
    overBudgetCount: number
  }
}

export interface AccountsResult {
  accounts: Array<{
    id: string
    name: string
    type: string
    balance: number
    institution: string | null
  }>
  summary: {
    totalAssets: number
    totalLiabilities: number
    netWorth: number
  }
}

export interface GoalsResult {
  goals: Array<{
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    progress: number
    deadline: string | null
    isAchieved: boolean
  }>
  summary: {
    activeCount: number
    completedCount: number
    totalTargeted: number
    totalSaved: number
  }
}

export interface WebSearchResult {
  results: Array<{
    title: string
    url: string
    snippet: string
  }>
  query: string
}

export interface DataExportResult {
  success: boolean
  downloadUrl: string
  filename: string
  recordCount: number
}

// CRM Tool Result Types

export interface LeadsResult {
  leads: Array<{
    id: string
    name: string
    website: string | null
    industry: string | null
    status: string
    notes: string | null
    createdAt: string
    contactCount: number
    primaryContact: {
      name: string
      email: string | null
      phone: string | null
      title: string | null
    } | null
  }>
  summary: {
    count: number
    byStatus: Record<string, number>
  }
}

export interface OpportunitiesResult {
  opportunities: Array<{
    id: string
    name: string
    value: number
    stage: string
    probability: number
    expectedCloseDate: string | null
    notes: string | null
    createdAt: string
    leadName: string | null
    leadId: string | null
  }>
  summary: {
    count: number
    totalValue: number
    weightedValue: number
    byStage: Record<string, number>
  }
}

export interface TasksResult {
  tasks: Array<{
    id: string
    title: string
    description: string | null
    dueDate: string | null
    isCompleted: boolean
    isOverdue: boolean
    completedAt: string | null
    createdAt: string
    leadName: string | null
    leadId: string | null
  }>
  summary: {
    count: number
    pendingCount: number
    completedCount: number
    overdueCount: number
  }
}

// Knowledge Tool Result Type

export interface KnowledgeResult {
  pages: Array<{
    id: string
    title: string
    icon: string | null
    excerpt: string
    parentId: string | null
    updatedAt: string
  }>
  summary: {
    count: number
  }
}

// Projects Tool Result Type

export interface ProjectsResult {
  projects: Array<{
    id: string
    name: string
    description: string | null
    status: string
    priority: string
    startDate: string | null
    targetEndDate: string | null
    createdAt: string
    updatedAt: string
    ownerName: string | null
    totalTasks: number
    completedTasks: number
    progress: number
  }>
  summary: {
    count: number
    byStatus: Record<string, number>
  }
}

// Project Tasks Tool Result Type

export interface ProjectTasksResult {
  tasks: Array<{
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    estimatedHours: number | null
    actualHours: number | null
    projectId: string
    projectName: string
    assignees: Array<{
      id: string
      name: string
      avatarUrl: string | null
    }>
    createdAt: string
  }>
  summary: {
    count: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
}

// Team Members Tool Result Type

export interface TeamMembersResult {
  members: Array<{
    id: string
    name: string
    email: string | null
    role: string
    jobRole: string | null
    avatarUrl: string | null
    status: string | null
    joinedAt: string
    workload: {
      totalOpenTasks: number
      inProgressCount: number
      todoCount: number
      urgentCount: number
      level: "low" | "medium" | "high"
    } | null
  }>
  summary: {
    count: number
    byRole: Record<string, number>
    byWorkloadLevel?: Record<string, number>
  }
}
