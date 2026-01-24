"use client"

import { createContext, useContext, type PropsWithChildren } from "react"
import {
  // Finance data
  demoAccounts,
  demoTransactions,
  demoBudgets,
  demoSubscriptions,
  demoGoals,
  demoExitPlan,
  demoCategories,
  demoUser,
  getDemoOverviewData,
  getDemoExpensesByCategory,
  getDemoIncomeByCategory,
  getDemoCashFlow,
  getDemoProfitLoss,
  type DemoAccount,
  type DemoTransaction,
  type DemoBudget,
  type DemoSubscription,
  type DemoGoal,
  type DemoExitPlan,
  type DemoCategory,
  type DemoOverviewData,
  // CRM data
  demoLeads,
  demoContacts,
  demoDeals,
  demoPipelineStages,
  demoActivities,
  getDemoPipelineValue,
  getDemoLeadsByStage,
  getDemoRecentActivities,
  type DemoLead,
  type DemoContact,
  type DemoDeal,
  type DemoPipelineStage,
  type DemoActivity,
  // Team data
  demoChannels,
  demoMessages,
  demoDMConversations,
  demoDMMessages,
  demoTeamMembers,
  getDemoUnreadCount,
  getDemoOnlineMembers,
  getDemoChannelMessages,
  type DemoChannel,
  type DemoMessage,
  type DemoDMConversation,
  type DemoTeamMember,
  // Projects data
  demoProjects,
  demoProjectTasks,
  demoMilestones,
  getDemoProjectStats,
  getDemoTasksByStatus,
  getDemoTasksByProject,
  getDemoProjectById,
  getDemoMilestonesByProject,
  getDemoTasksDueThisWeek,
  getDemoOverdueTasks,
  getDemoTasksGroupedByDueDate,
  getDemoTeamWorkload,
  type DemoProject,
  type DemoProjectTask,
  type DemoMilestone,
  type DemoProjectMember,
  type DemoProjectLabel,
  // Knowledge data
  demoKnowledgePages,
  demoKnowledgeFolders,
  demoKnowledgeTemplates,
  demoWhiteboards,
  demoAISearchQueries,
  demoKnowledgeActivities,
  demoKnowledgeUser,
  getDemoKnowledgeStats,
  getDemoKnowledgePagesByFolder,
  getDemoKnowledgePageById,
  getDemoKnowledgePageBySlug,
  getDemoKnowledgeRecentPages,
  getDemoKnowledgeFavoritePages,
  getDemoKnowledgeActivitiesRecent,
  getDemoKnowledgeSearchResults,
  getDemoWhiteboardById,
  getDemoTemplateById,
  type DemoKnowledgePage,
  type DemoKnowledgeFolder,
  type DemoKnowledgeTemplate,
  type DemoWhiteboard,
  type DemoAISearchQuery,
  type DemoKnowledgeActivity,
} from "@/lib/demo-data"

// Finance Context
interface DemoFinanceContextValue {
  accounts: DemoAccount[]
  transactions: DemoTransaction[]
  budgets: DemoBudget[]
  subscriptions: DemoSubscription[]
  goals: DemoGoal[]
  exitPlan: DemoExitPlan
  categories: DemoCategory[]
  overview: DemoOverviewData
  expensesByCategory: ReturnType<typeof getDemoExpensesByCategory>
  incomeByCategory: ReturnType<typeof getDemoIncomeByCategory>
  cashFlow: ReturnType<typeof getDemoCashFlow>
  profitLoss: ReturnType<typeof getDemoProfitLoss>
}

// CRM Context
interface DemoCRMContextValue {
  leads: DemoLead[]
  contacts: DemoContact[]
  deals: DemoDeal[]
  pipelineStages: DemoPipelineStage[]
  activities: DemoActivity[]
  pipelineValue: ReturnType<typeof getDemoPipelineValue>
  leadsByStage: ReturnType<typeof getDemoLeadsByStage>
  recentActivities: ReturnType<typeof getDemoRecentActivities>
}

// Team Context
interface DemoTeamContextValue {
  channels: DemoChannel[]
  messages: DemoMessage[]
  dmConversations: DemoDMConversation[]
  dmMessages: Record<string, DemoMessage[]>
  members: DemoTeamMember[]
  unreadCount: ReturnType<typeof getDemoUnreadCount>
  onlineMembers: DemoTeamMember[]
  getChannelMessages: (channelId: string) => DemoMessage[]
}

// Projects Context
interface DemoProjectsContextValue {
  projects: DemoProject[]
  tasks: DemoProjectTask[]
  milestones: DemoMilestone[]
  stats: ReturnType<typeof getDemoProjectStats>
  tasksByStatus: {
    todo: DemoProjectTask[]
    in_progress: DemoProjectTask[]
    review: DemoProjectTask[]
    done: DemoProjectTask[]
  }
  tasksDueThisWeek: DemoProjectTask[]
  overdueTasks: DemoProjectTask[]
  tasksGroupedByDueDate: ReturnType<typeof getDemoTasksGroupedByDueDate>
  teamWorkload: ReturnType<typeof getDemoTeamWorkload>
  getTasksByProject: (projectId: string) => DemoProjectTask[]
  getProjectById: (projectId: string) => DemoProject | undefined
  getMilestonesByProject: (projectId: string) => DemoMilestone[]
}

// Knowledge Context
interface DemoKnowledgeContextValue {
  pages: DemoKnowledgePage[]
  folders: DemoKnowledgeFolder[]
  templates: DemoKnowledgeTemplate[]
  whiteboards: DemoWhiteboard[]
  aiQueries: DemoAISearchQuery[]
  activities: DemoKnowledgeActivity[]
  user: typeof demoKnowledgeUser
  stats: ReturnType<typeof getDemoKnowledgeStats>
  recentPages: DemoKnowledgePage[]
  favoritePages: DemoKnowledgePage[]
  recentActivities: DemoKnowledgeActivity[]
  getPagesByFolder: (folderId: string) => DemoKnowledgePage[]
  getPageById: (pageId: string) => DemoKnowledgePage | undefined
  getPageBySlug: (slug: string) => DemoKnowledgePage | undefined
  searchPages: (query: string) => DemoKnowledgePage[]
  getWhiteboardById: (id: string) => DemoWhiteboard | undefined
  getTemplateById: (id: string) => DemoKnowledgeTemplate | undefined
}

interface DemoContextValue {
  isDemo: true
  user: typeof demoUser
  finance: DemoFinanceContextValue
  crm: DemoCRMContextValue
  team: DemoTeamContextValue
  projects: DemoProjectsContextValue
  knowledge: DemoKnowledgeContextValue
  // Legacy: keep backwards compatibility with existing demo pages
  accounts: DemoAccount[]
  transactions: DemoTransaction[]
  budgets: DemoBudget[]
  subscriptions: DemoSubscription[]
  goals: DemoGoal[]
  exitPlan: DemoExitPlan
  categories: DemoCategory[]
  overview: DemoOverviewData
  expensesByCategory: ReturnType<typeof getDemoExpensesByCategory>
  incomeByCategory: ReturnType<typeof getDemoIncomeByCategory>
  cashFlow: ReturnType<typeof getDemoCashFlow>
  profitLoss: ReturnType<typeof getDemoProfitLoss>
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: PropsWithChildren) {
  const financeData: DemoFinanceContextValue = {
    accounts: demoAccounts,
    transactions: demoTransactions,
    budgets: demoBudgets,
    subscriptions: demoSubscriptions,
    goals: demoGoals,
    exitPlan: demoExitPlan,
    categories: demoCategories,
    overview: getDemoOverviewData(),
    expensesByCategory: getDemoExpensesByCategory(),
    incomeByCategory: getDemoIncomeByCategory(),
    cashFlow: getDemoCashFlow(),
    profitLoss: getDemoProfitLoss(),
  }

  const crmData: DemoCRMContextValue = {
    leads: demoLeads,
    contacts: demoContacts,
    deals: demoDeals,
    pipelineStages: demoPipelineStages,
    activities: demoActivities,
    pipelineValue: getDemoPipelineValue(),
    leadsByStage: getDemoLeadsByStage(),
    recentActivities: getDemoRecentActivities(),
  }

  const teamData: DemoTeamContextValue = {
    channels: demoChannels,
    messages: demoMessages,
    dmConversations: demoDMConversations,
    dmMessages: demoDMMessages,
    members: demoTeamMembers,
    unreadCount: getDemoUnreadCount(),
    onlineMembers: getDemoOnlineMembers(),
    getChannelMessages: getDemoChannelMessages,
  }

  const projectsData: DemoProjectsContextValue = {
    projects: demoProjects,
    tasks: demoProjectTasks,
    milestones: demoMilestones,
    stats: getDemoProjectStats(),
    tasksByStatus: getDemoTasksByStatus(),
    tasksDueThisWeek: getDemoTasksDueThisWeek(),
    overdueTasks: getDemoOverdueTasks(),
    tasksGroupedByDueDate: getDemoTasksGroupedByDueDate(),
    teamWorkload: getDemoTeamWorkload(),
    getTasksByProject: getDemoTasksByProject,
    getProjectById: getDemoProjectById,
    getMilestonesByProject: getDemoMilestonesByProject,
  }

  const knowledgeData: DemoKnowledgeContextValue = {
    pages: demoKnowledgePages,
    folders: demoKnowledgeFolders,
    templates: demoKnowledgeTemplates,
    whiteboards: demoWhiteboards,
    aiQueries: demoAISearchQueries,
    activities: demoKnowledgeActivities,
    user: demoKnowledgeUser,
    stats: getDemoKnowledgeStats(),
    recentPages: getDemoKnowledgeRecentPages(),
    favoritePages: getDemoKnowledgeFavoritePages(),
    recentActivities: getDemoKnowledgeActivitiesRecent(),
    getPagesByFolder: getDemoKnowledgePagesByFolder,
    getPageById: getDemoKnowledgePageById,
    getPageBySlug: getDemoKnowledgePageBySlug,
    searchPages: getDemoKnowledgeSearchResults,
    getWhiteboardById: getDemoWhiteboardById,
    getTemplateById: getDemoTemplateById,
  }

  const value: DemoContextValue = {
    isDemo: true,
    user: demoUser,
    finance: financeData,
    crm: crmData,
    team: teamData,
    projects: projectsData,
    knowledge: knowledgeData,
    // Legacy backwards compatibility
    ...financeData,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

// Main hook - returns all demo data
export function useDemoData() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoData must be used within a DemoProvider")
  }
  return context
}

// Finance-specific hook
export function useDemoFinance() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoFinance must be used within a DemoProvider")
  }
  return context.finance
}

// CRM-specific hook
export function useDemoCRM() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoCRM must be used within a DemoProvider")
  }
  return context.crm
}

// Team-specific hook
export function useDemoTeam() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoTeam must be used within a DemoProvider")
  }
  return context.team
}

// Projects-specific hook
export function useDemoProjects() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoProjects must be used within a DemoProvider")
  }
  return context.projects
}

// Check if in demo mode
export function useDemoMode() {
  const context = useContext(DemoContext)
  return { isDemo: context?.isDemo ?? false }
}

// Get demo user
export function useDemoUser() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoUser must be used within a DemoProvider")
  }
  return context.user
}

// Knowledge-specific hook
export function useDemoKnowledge() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error("useDemoKnowledge must be used within a DemoProvider")
  }
  return context.knowledge
}
