const TOOL_CATEGORY_MAP: Record<string, string> = {
  // Project tools -> projects
  project_list: "projects",
  project_get: "projects",
  project_create: "projects",
  project_update: "projects",
  project_delete: "projects",
  project_archive: "projects",
  project_add_member: "projects",
  project_remove_member: "projects",
  project_get_members: "projects",
  project_get_progress: "projects",
  project_get_activity: "projects",
  // Task tools -> projectTasks
  task_list: "projectTasks",
  task_get: "projectTasks",
  task_create: "projectTasks",
  task_update: "projectTasks",
  task_delete: "projectTasks",
  task_assign: "projectTasks",
  task_unassign: "projectTasks",
  task_change_status: "projectTasks",
  task_add_dependency: "projectTasks",
  task_remove_dependency: "projectTasks",
  task_add_label: "projectTasks",
  task_remove_label: "projectTasks",
  task_get_by_assignee: "projectTasks",
  task_get_overdue: "projectTasks",
  task_get_my_tasks: "projectTasks",
  task_add_comment: "projectTasks",
  task_get_comments: "projectTasks",
  // Team member tools -> teamMembers
  team_member_list: "teamMembers",
  team_member_get: "teamMembers",
  team_member_get_workload: "teamMembers",
  team_member_get_availability: "teamMembers",
  // CRM tools
  lead_list: "leads",
  lead_get: "leads",
  lead_create: "leads",
  lead_update: "leads",
  opportunity_list: "opportunities",
  opportunity_get: "opportunities",
  opportunity_create: "opportunities",
  opportunity_update: "opportunities",
  // Finance tools
  transaction_list: "transactions",
  transaction_get: "transactions",
  budget_list: "budgets",
  budget_get: "budgets",
  account_list: "accounts",
  account_get: "accounts",
  goal_list: "goals",
  goal_get: "goals",
  // Other tools
  web_search: "webSearch",
  data_export: "dataExport",
  knowledge_search: "knowledge",
  knowledge_create: "knowledge",
  memory_store: "memory",
  memory_recall: "memory",
}

const VALID_CATEGORIES = [
  "transactions",
  "budgets",
  "accounts",
  "goals",
  "webSearch",
  "dataExport",
  "leads",
  "opportunities",
  "tasks",
  "knowledge",
  "projects",
  "projectTasks",
  "teamMembers",
  "memory",
]

export function mapToolNamesToCategories(toolNames: string[]): string[] {
  const mappedCategories = [...new Set(
    toolNames.map(name => TOOL_CATEGORY_MAP[name] || name)
  )]

  const hasProjectTools = mappedCategories.includes("projects") || mappedCategories.includes("projectTasks")
  if (hasProjectTools && !mappedCategories.includes("teamMembers")) {
    mappedCategories.push("teamMembers")
  }

  return mappedCategories.filter(cat => VALID_CATEGORIES.includes(cat))
}
