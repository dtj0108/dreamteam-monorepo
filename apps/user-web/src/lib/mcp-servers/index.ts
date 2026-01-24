/**
 * MCP Server Registry
 *
 * This module provides the central registry for all MCP tool servers used by the
 * Claude Agent SDK. Organized as workspace-scoped servers with 13 tools total.
 *
 * Tool categories:
 * - Finance: Transactions, budgets, accounts, goals, data export (5 tools)
 * - Business: CRM, projects (2 tools)
 * - Knowledge: Knowledge base, memory, web search (3 tools)
 * - Messaging: Channels, messages, DMs (1 tool)
 * - Sales: Pipelines, deals, activities, contacts (1 tool)
 * - Analytics: Reports and KPIs (1 tool)
 */

import type { MCPToolContext } from "./types"
import { financeToolDefinitions, type FinanceToolName } from "./finance-tools"
import { businessToolDefinitions, type BusinessToolName } from "./business-tools"
import { knowledgeToolDefinitions, type KnowledgeToolName } from "./knowledge-tools"
import {
  messagingToolDefinition,
  salesToolDefinition,
  analyticsToolDefinition,
  type NewToolName,
} from "./tools"

// Re-export types
export type { MCPToolContext } from "./types"
export { formatActionableError, formatCurrency, truncateText } from "./types"

// All tool names across all servers
export type AllToolName = FinanceToolName | BusinessToolName | KnowledgeToolName | NewToolName

// Tool definitions by server
export const toolsByServer = {
  "finance-tools": financeToolDefinitions,
  "business-tools": businessToolDefinitions,
  "knowledge-tools": knowledgeToolDefinitions,
  workspace: {
    manageMessaging: messagingToolDefinition,
    manageSales: salesToolDefinition,
    queryAnalytics: analyticsToolDefinition,
  },
} as const

export type ServerName = keyof typeof toolsByServer

// Flat map of all tool definitions
export const allToolDefinitions = {
  ...financeToolDefinitions,
  ...businessToolDefinitions,
  ...knowledgeToolDefinitions,
  // New tools
  manageMessaging: messagingToolDefinition,
  manageSales: salesToolDefinition,
  queryAnalytics: analyticsToolDefinition,
} as const

// Mapping from old tool IDs to new consolidated tool names
// This helps with migration and backward compatibility
export const toolIdMapping: Record<string, AllToolName> = {
  // Finance tools (mostly 1:1)
  transactions: "manageTransactions",
  budgets: "manageBudgets",
  accounts: "manageAccounts",
  goals: "manageGoals",
  dataExport: "exportData",

  // CRM tools → consolidated into manageCRM
  leads: "manageCRM",
  opportunities: "manageCRM",
  tasks: "manageCRM", // Note: CRM tasks, not project tasks

  // PM tools → consolidated into manageProjects
  projects: "manageProjects",
  projectTasks: "manageProjects",
  teamMembers: "manageProjects",

  // Knowledge tools
  knowledge: "manageKnowledge",
  memory: "manageMemory",
  webSearch: "searchWeb",

  // New tools (1:1 mapping)
  messaging: "manageMessaging",
  sales: "manageSales",
  analytics: "queryAnalytics",
}

// Tool metadata for UI display
export const toolMetadata: Record<
  AllToolName,
  { id: AllToolName; name: string; description: string; icon: string; server: ServerName }
> = {
  // Finance tools
  manageTransactions: {
    id: "manageTransactions",
    name: "Transactions",
    description: "Query, categorize, and annotate financial transactions",
    icon: "Receipt",
    server: "finance-tools",
  },
  manageBudgets: {
    id: "manageBudgets",
    name: "Budgets",
    description: "View budget status, create budgets, and track spending",
    icon: "PieChart",
    server: "finance-tools",
  },
  manageAccounts: {
    id: "manageAccounts",
    name: "Accounts",
    description: "Query account balances and net worth",
    icon: "Wallet",
    server: "finance-tools",
  },
  manageGoals: {
    id: "manageGoals",
    name: "Goals",
    description: "Track financial goals and progress",
    icon: "Target",
    server: "finance-tools",
  },
  exportData: {
    id: "exportData",
    name: "Data Export",
    description: "Export financial data as CSV or JSON",
    icon: "Download",
    server: "finance-tools",
  },

  // Business tools
  manageCRM: {
    id: "manageCRM",
    name: "CRM",
    description: "Manage leads, opportunities, and follow-up tasks",
    icon: "Users",
    server: "business-tools",
  },
  manageProjects: {
    id: "manageProjects",
    name: "Projects",
    description: "Manage projects, tasks, and team assignments",
    icon: "FolderKanban",
    server: "business-tools",
  },

  // Knowledge tools
  manageKnowledge: {
    id: "manageKnowledge",
    name: "Knowledge",
    description: "Create and manage documentation pages",
    icon: "BookOpen",
    server: "knowledge-tools",
  },
  manageMemory: {
    id: "manageMemory",
    name: "Memory",
    description: "Persistent memory across conversations",
    icon: "Brain",
    server: "knowledge-tools",
  },
  searchWeb: {
    id: "searchWeb",
    name: "Web Search",
    description: "Search for financial news and information",
    icon: "Search",
    server: "knowledge-tools",
  },

  // New tools (workspace-scoped)
  manageMessaging: {
    id: "manageMessaging",
    name: "Messaging",
    description: "Send messages, manage channels, and DM conversations",
    icon: "MessageSquare",
    server: "workspace",
  },
  manageSales: {
    id: "manageSales",
    name: "Sales",
    description: "Manage deals, pipelines, and log sales activities",
    icon: "TrendingUp",
    server: "workspace",
  },
  queryAnalytics: {
    id: "queryAnalytics",
    name: "Analytics",
    description: "Generate financial reports, KPIs, and sales forecasts",
    icon: "BarChart3",
    server: "workspace",
  },
}

/**
 * Convert old tool IDs to new MCP tool names
 *
 * @param oldToolIds - Array of old tool IDs from agent configuration
 * @returns Array of new MCP tool names
 */
export function mapToolIdsToMCPNames(oldToolIds: string[]): AllToolName[] {
  const mcpNames = new Set<AllToolName>()

  for (const id of oldToolIds) {
    const mcpName = toolIdMapping[id]
    if (mcpName) {
      mcpNames.add(mcpName)
    }
  }

  return Array.from(mcpNames)
}

/**
 * Get the servers needed for a set of tool names
 *
 * @param toolNames - Array of MCP tool names
 * @returns Array of server names that provide these tools
 */
export function getServersForTools(toolNames: AllToolName[]): ServerName[] {
  const servers = new Set<ServerName>()

  for (const name of toolNames) {
    const meta = toolMetadata[name]
    if (meta) {
      servers.add(meta.server)
    }
  }

  return Array.from(servers)
}

/**
 * Build allowed tools list for Claude Agent SDK
 *
 * @param toolNames - Array of MCP tool names
 * @returns Array of tool identifiers in format "mcp__{server}__{tool}"
 */
export function buildAllowedToolsList(toolNames: AllToolName[]): string[] {
  return toolNames.map((name) => {
    const meta = toolMetadata[name]
    return `mcp__${meta.server}__${name}`
  })
}

/**
 * Execute a tool by name
 *
 * @param toolName - The MCP tool name
 * @param input - Tool input parameters
 * @param context - Tool context with user/workspace info
 * @returns Tool execution result
 */
export async function executeTool(
  toolName: AllToolName,
  input: unknown,
  context: MCPToolContext
): Promise<unknown> {
  const toolDef = allToolDefinitions[toolName]
  if (!toolDef) {
    return { success: false, error: `Unknown tool: ${toolName}` }
  }

  // Validate input
  const parsed = toolDef.schema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
    }
  }

  // Execute the tool - use type assertion since we know the schema is valid
  return toolDef.execute(parsed.data as never, context)
}

// Re-export workspace server factory
export { createWorkspaceServer, buildWorkspaceAllowedTools } from "./workspace-server"
export type { WorkspaceServerConfig } from "./workspace-server"

// Default export for convenience
export default {
  toolsByServer,
  allToolDefinitions,
  toolMetadata,
  mapToolIdsToMCPNames,
  getServersForTools,
  buildAllowedToolsList,
  executeTool,
}
