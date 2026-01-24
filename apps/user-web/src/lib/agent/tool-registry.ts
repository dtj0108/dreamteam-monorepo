import type { ToolContext } from "./types"
import {
  createTransactionsTool,
  createBudgetsTool,
  createAccountsTool,
  createGoalsTool,
  createWebSearchTool,
  createDataExportTool,
  createLeadsTool,
  createOpportunitiesTool,
  createTasksTool,
  createKnowledgeTool,
  createProjectsTool,
  createProjectTasksTool,
  createTeamMembersTool,
  createMemoryTool,
} from "./tools"

// Map of tool IDs to their factory functions
const toolFactories = {
  transactions: createTransactionsTool,
  budgets: createBudgetsTool,
  accounts: createAccountsTool,
  goals: createGoalsTool,
  webSearch: createWebSearchTool,
  dataExport: createDataExportTool,
  // CRM Tools
  leads: createLeadsTool,
  opportunities: createOpportunitiesTool,
  tasks: createTasksTool,
  // Knowledge Tools
  knowledge: createKnowledgeTool,
  // Project Management Tools
  projects: createProjectsTool,
  projectTasks: createProjectTasksTool,
  teamMembers: createTeamMembersTool,
  // Memory Tool
  memory: createMemoryTool,
} as const

// All available tool IDs
export const AVAILABLE_TOOLS = Object.keys(toolFactories) as (keyof typeof toolFactories)[]

// Tool metadata for UI display
export const toolMetadata: Record<
  string,
  {
    id: string
    name: string
    description: string
    icon: string
  }
> = {
  transactions: {
    id: "transactions",
    name: "Transactions",
    description: "Access and analyze transaction history",
    icon: "Receipt",
  },
  budgets: {
    id: "budgets",
    name: "Budgets",
    description: "View budget status and spending",
    icon: "PieChart",
  },
  accounts: {
    id: "accounts",
    name: "Accounts",
    description: "Access account balances and info",
    icon: "Wallet",
  },
  goals: {
    id: "goals",
    name: "Goals",
    description: "Track financial goal progress",
    icon: "Target",
  },
  webSearch: {
    id: "webSearch",
    name: "Web Search",
    description: "Search for financial news and information",
    icon: "Search",
  },
  dataExport: {
    id: "dataExport",
    name: "Data Export",
    description: "Export data as CSV or JSON files",
    icon: "Download",
  },
  // CRM Tools
  leads: {
    id: "leads",
    name: "Leads",
    description: "Access and manage sales leads",
    icon: "Users",
  },
  opportunities: {
    id: "opportunities",
    name: "Opportunities",
    description: "View sales pipeline and deals",
    icon: "TrendingUp",
  },
  tasks: {
    id: "tasks",
    name: "Tasks",
    description: "Track follow-up tasks and reminders",
    icon: "CheckSquare",
  },
  // Knowledge Tools
  knowledge: {
    id: "knowledge",
    name: "Knowledge",
    description: "Create and manage documentation pages",
    icon: "BookOpen",
  },
  // Project Management Tools
  projects: {
    id: "projects",
    name: "Projects",
    description: "Create and manage projects",
    icon: "FolderKanban",
  },
  projectTasks: {
    id: "projectTasks",
    name: "Project Tasks",
    description: "Create, assign, and manage project tasks",
    icon: "ListTodo",
  },
  teamMembers: {
    id: "teamMembers",
    name: "Team Members",
    description: "Query team members and their workload",
    icon: "Users",
  },
  // Memory Tool
  memory: {
    id: "memory",
    name: "Memory",
    description: "Persistent memory across conversations",
    icon: "Brain",
  },
}

/**
 * Build agent tools based on enabled tool IDs and user context.
 *
 * @param enabledTools - Array of tool IDs to enable (e.g., ["transactions", "budgets"])
 * @param context - User context with userId, workspaceId, and Supabase client
 * @returns Record of tool name to AI SDK tool definition
 */
export function buildAgentTools(
  enabledTools: string[],
  context: ToolContext
): Record<string, ReturnType<(typeof toolFactories)[keyof typeof toolFactories]>> {
  const tools: Record<string, ReturnType<(typeof toolFactories)[keyof typeof toolFactories]>> = {}

  for (const toolId of enabledTools) {
    const factory = toolFactories[toolId as keyof typeof toolFactories]
    if (factory) {
      // Use descriptive tool names for the LLM
      const toolName = getToolName(toolId)
      tools[toolName] = factory(context)
    }
  }

  return tools
}

/**
 * Convert tool ID to LLM-friendly tool name
 */
function getToolName(toolId: string): string {
  const nameMap: Record<string, string> = {
    transactions: "getTransactions",
    budgets: "getBudgets",
    accounts: "getAccounts",
    goals: "getGoals",
    webSearch: "searchWeb",
    dataExport: "exportData",
    // CRM Tools
    leads: "getLeads",
    opportunities: "getOpportunities",
    tasks: "getTasks",
    // Knowledge Tools
    knowledge: "manageKnowledge",
    // Project Management Tools
    projects: "manageProjects",
    projectTasks: "manageProjectTasks",
    teamMembers: "getTeamMembers",
    // Memory Tool
    memory: "manageMemory",
  }
  return nameMap[toolId] || toolId
}

/**
 * Get tool ID from LLM tool name
 */
export function getToolIdFromName(toolName: string): string {
  const idMap: Record<string, string> = {
    getTransactions: "transactions",
    getBudgets: "budgets",
    getAccounts: "accounts",
    getGoals: "goals",
    searchWeb: "webSearch",
    exportData: "dataExport",
    // CRM Tools
    getLeads: "leads",
    getOpportunities: "opportunities",
    getTasks: "tasks",
    // Knowledge Tools
    manageKnowledge: "knowledge",
    // Project Management Tools
    manageProjects: "projects",
    manageProjectTasks: "projectTasks",
    getTeamMembers: "teamMembers",
    // Memory Tool
    manageMemory: "memory",
  }
  return idMap[toolName] || toolName
}
