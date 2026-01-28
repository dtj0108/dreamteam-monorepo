"use client"

import { Loader } from "./loader"
import { Card, CardContent } from "@/components/ui/card"

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

// Get action description for step indicator (present tense - used during loading)
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

// Get completed action text (past tense - brief, vague descriptions for completed steps)
export function getCompletedActionText(toolName: string, args?: Record<string, unknown>): string {
  switch (toolName) {
    case "getTransactions":
      return "Got transactions"
    case "getBudgets":
      return "Retrieved budgets"
    case "getAccounts":
      return "Retrieved accounts"
    case "getGoals":
      return "Retrieved goals"
    case "searchWeb":
      return "Searched web"
    case "exportData":
      return "Exported data"
    case "manageProjects":
      if (args?.action === "create") return "Created project"
      if (args?.action === "update") return "Updated project"
      if (args?.action === "delete") return "Deleted project"
      return "Retrieved projects"
    case "manageProjectTasks":
      if (args?.action === "create") return "Created task"
      if (args?.action === "assign") return "Assigned task"
      if (args?.action === "update") return "Updated task"
      if (args?.action === "delete") return "Deleted task"
      return "Retrieved tasks"
    case "getTeamMembers":
      return "Retrieved team members"
    case "manageKnowledge":
      if (args?.action === "create") return "Created knowledge page"
      if (args?.action === "update") return "Updated knowledge page"
      if (args?.action === "search") return "Searched knowledge"
      return "Retrieved knowledge"
    case "manageMemory":
      if (args?.action === "view") return "Read from memory"
      if (args?.action === "create") return "Saved to memory"
      if (args?.action === "str_replace") return "Updated memory"
      if (args?.action === "delete") return "Deleted from memory"
      if (args?.action === "list") return "Listed memories"
      return "Accessed memory"
    default:
      return `Completed ${toolName}`
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

  // Result state - show simple, brief completion text
  if (state === "result" && result) {
    const description = getCompletedActionText(toolName, args)
    return <span className="text-sm text-muted-foreground">{description}</span>
  }

  return null
}
