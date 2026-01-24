"use client"

import { Wrench, CheckCircle2 } from "lucide-react"
import { Loader } from "./loader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getToolIdFromName } from "@/lib/agent"
import {
  TransactionsResult,
  BudgetsResult,
  AccountsResult,
  GoalsResult,
  WebSearchResult,
  DataExportResult,
  ProjectsResult,
  ProjectTasksResult,
  TeamMembersResult,
  KnowledgeResult,
  MemoryResult,
  ToolResultCard,
} from "./tool-results"

// Map tool names to result components
const toolComponents: Record<string, React.ComponentType<{ result: any }>> = {
  getTransactions: TransactionsResult,
  getBudgets: BudgetsResult,
  getAccounts: AccountsResult,
  getGoals: GoalsResult,
  searchWeb: WebSearchResult,
  exportData: DataExportResult,
  // Project Management Tools
  manageProjects: ProjectsResult,
  manageProjectTasks: ProjectTasksResult,
  getTeamMembers: TeamMembersResult,
  manageKnowledge: KnowledgeResult,
  // Memory Tool
  manageMemory: MemoryResult,
}

// Tool display names for loading state
const toolDisplayNames: Record<string, string> = {
  getTransactions: "Getting transactions",
  getBudgets: "Getting budgets",
  getAccounts: "Getting accounts",
  getGoals: "Getting goals",
  searchWeb: "Searching the web",
  exportData: "Exporting data",
  // Project Management Tools
  manageProjects: "Managing project",
  manageProjectTasks: "Managing tasks",
  getTeamMembers: "Getting team members",
  manageKnowledge: "Managing knowledge",
  // Memory Tool
  manageMemory: "Accessing memory",
}

interface ToolResultRendererProps {
  toolName: string
  state: "call" | "result" | "partial-call"
  result?: unknown
  args?: Record<string, unknown>
}

// Extract key info from args for display
function getActionSummary(toolName: string, args?: Record<string, unknown>): string | null {
  if (!args) return null

  switch (toolName) {
    case "manageProjects":
      if (args.action === "create" && args.name) return `Creating: "${args.name}"`
      if (args.action === "update") return "Updating project..."
      return "Querying projects..."
    case "manageProjectTasks":
      if (args.action === "create" && args.title) return `Creating: "${args.title}"`
      if (args.action === "assign") return "Assigning task..."
      if (args.action === "update") return "Updating task..."
      return "Querying tasks..."
    case "getTeamMembers":
      if (args.includeWorkload) return "With workload info"
      return null
    case "manageKnowledge":
      if (args.action === "create" && args.title) return `Creating: "${args.title}"`
      if (args.action === "search" && args.query) return `Searching: "${args.query}"`
      return null
    case "manageMemory":
      if (args.action === "view" && args.path) return `Reading: ${args.path}`
      if (args.action === "create" && args.path) return `Creating: ${args.path}`
      if (args.action === "list") return "Listing memories"
      return null
    default:
      return null
  }
}

// Get action description for step indicator
export function getActionDescription(toolName: string, args?: Record<string, unknown>): string {
  switch (toolName) {
    case "manageProjects":
      if (args?.action === "create" && args?.name) return `Creating project "${args.name}"`
      if (args?.action === "update") return "Updating project"
      if (args?.action === "delete") return "Deleting project"
      return "Querying projects"
    case "manageProjectTasks":
      if (args?.action === "create" && args?.title) return `Creating task "${args.title}"`
      if (args?.action === "assign") return "Assigning task to team member"
      if (args?.action === "update") return "Updating task"
      if (args?.action === "delete") return "Deleting task"
      return "Managing tasks"
    case "getTeamMembers":
      if (args?.includeWorkload) return "Getting team members with workload"
      return "Getting team members"
    case "manageKnowledge":
      if (args?.action === "create" && args?.title) return `Creating page "${args.title}"`
      if (args?.action === "update") return "Updating knowledge page"
      if (args?.action === "search" && args?.query) return `Searching for "${args.query}"`
      return "Managing knowledge"
    case "getTransactions":
      return "Getting transactions"
    case "getBudgets":
      return "Getting budgets"
    case "getAccounts":
      return "Getting accounts"
    case "getGoals":
      return "Getting goals"
    case "searchWeb":
      if (args?.query) return `Searching web for "${args.query}"`
      return "Searching the web"
    case "exportData":
      return "Exporting data"
    case "manageMemory":
      if (args?.action === "view" && args?.path) return `Reading memory: ${args.path}`
      if (args?.action === "create" && args?.path) return `Saving to memory: ${args.path}`
      if (args?.action === "str_replace") return "Updating memory"
      if (args?.action === "delete") return "Deleting memory"
      if (args?.action === "list") return "Listing memories"
      return "Accessing memory"
    default:
      return `Running ${toolName}`
  }
}

export function ToolResultRenderer({
  toolName,
  state,
  result,
  args,
}: ToolResultRendererProps) {
  // Loading state - show what's happening
  if (state === "call" || state === "partial-call") {
    const displayName = toolDisplayNames[toolName] || `Running ${toolName}`
    const actionSummary = getActionSummary(toolName, args)

    return (
      <Card className="my-2 border-border/50">
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-2">
            <Loader size={16} className="text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">{displayName}...</span>
              {actionSummary && (
                <p className="text-xs text-muted-foreground">{actionSummary}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Result state
  if (state === "result" && result) {
    const Component = toolComponents[toolName]

    if (Component) {
      return <Component result={result} />
    }

    // Better fallback for unknown tools - summarize instead of raw JSON
    // Guard against non-object results (strings, primitives, null)
    if (result === null || typeof result !== 'object') {
      return (
        <ToolResultCard
          icon={<Wrench className="size-4 text-red-500" />}
          title={`${toolName} error`}
          status="error"
        >
          <p className="text-xs text-muted-foreground">{String(result)}</p>
        </ToolResultCard>
      )
    }

    const resultObj = result as Record<string, unknown>
    const hasSuccess = "success" in resultObj
    const hasMessage = "message" in resultObj
    const hasCount = "count" in resultObj || (resultObj.summary && typeof resultObj.summary === "object" && "count" in (resultObj.summary as Record<string, unknown>))

    return (
      <ToolResultCard
        icon={hasSuccess && resultObj.success ? <CheckCircle2 className="size-4 text-green-500" /> : <Wrench className="size-4" />}
        title={hasMessage ? String(resultObj.message) : `${toolName} completed`}
        status="success"
      >
        {hasCount ? (
          <p className="text-xs text-muted-foreground">
            {String((resultObj.summary as Record<string, unknown>)?.count || resultObj.count)} items
          </p>
        ) : null}
      </ToolResultCard>
    )
  }

  return null
}
