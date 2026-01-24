// Trigger types - events that start a workflow
export type TriggerType =
  // Lead events
  | "lead_created"
  | "lead_status_changed"
  | "lead_contacted"
  // Deal events
  | "deal_created"
  | "deal_stage_changed"
  | "deal_won"
  | "deal_lost"
  // Activity events
  | "activity_logged"
  | "activity_completed"
  | "task_completed"

// Action types - what the workflow does
export type ActionType =
  // Communication actions
  | "send_sms"
  | "make_call"
  | "send_email"
  | "send_notification"
  // CRM actions
  | "create_task"
  | "update_status"
  | "add_note"
  | "assign_user"
  // Flow control actions
  | "wait"
  | "condition"

// Workflow action - a single step in the workflow
export interface WorkflowAction {
  id: string
  type: ActionType
  config: Record<string, unknown>
  order: number
}

// Complete workflow record
export interface Workflow {
  id: string
  user_id: string
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  is_active: boolean
  actions: WorkflowAction[]
  created_at: string
  updated_at: string
}

// For creating/updating workflows
export interface WorkflowInput {
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config?: Record<string, unknown>
  is_active?: boolean
  actions?: WorkflowAction[]
}

// Trigger metadata for UI
export interface TriggerDefinition {
  type: TriggerType
  label: string
  description: string
  icon: string
  category: "lead" | "deal" | "activity"
}

// Action metadata for UI
export interface ActionDefinition {
  type: ActionType
  label: string
  description: string
  icon: string
  category: "communication" | "crm" | "flow"
}

// Trigger definitions
export const TRIGGERS: TriggerDefinition[] = [
  // Lead triggers
  { type: "lead_created", label: "Lead Created", description: "When a new lead is added", icon: "UserPlus", category: "lead" },
  { type: "lead_status_changed", label: "Lead Status Changed", description: "When a lead's status changes", icon: "RefreshCw", category: "lead" },
  { type: "lead_contacted", label: "Lead Contacted", description: "When a lead is first contacted", icon: "Phone", category: "lead" },
  // Deal triggers
  { type: "deal_created", label: "Deal Created", description: "When a new deal is created", icon: "DollarSign", category: "deal" },
  { type: "deal_stage_changed", label: "Deal Stage Changed", description: "When a deal moves to a new stage", icon: "ArrowRight", category: "deal" },
  { type: "deal_won", label: "Deal Won", description: "When a deal is marked as won", icon: "Trophy", category: "deal" },
  { type: "deal_lost", label: "Deal Lost", description: "When a deal is marked as lost", icon: "XCircle", category: "deal" },
  // Activity triggers
  { type: "activity_logged", label: "Activity Logged", description: "When any activity is logged", icon: "Activity", category: "activity" },
  { type: "activity_completed", label: "Activity Completed", description: "When an activity is completed", icon: "CheckCircle", category: "activity" },
  { type: "task_completed", label: "Task Completed", description: "When a task is completed", icon: "CheckSquare", category: "activity" },
]

// Action definitions
export const ACTIONS: ActionDefinition[] = [
  // Communication actions
  { type: "send_sms", label: "Send SMS", description: "Send a text message", icon: "MessageSquare", category: "communication" },
  { type: "make_call", label: "Make Call", description: "Initiate an outbound call", icon: "Phone", category: "communication" },
  { type: "send_email", label: "Send Email", description: "Send an email", icon: "Mail", category: "communication" },
  { type: "send_notification", label: "Send Notification", description: "Send an in-app notification", icon: "Bell", category: "communication" },
  // CRM actions
  { type: "create_task", label: "Create Task", description: "Create a new task", icon: "ListTodo", category: "crm" },
  { type: "update_status", label: "Update Status", description: "Update lead or deal status", icon: "Edit", category: "crm" },
  { type: "add_note", label: "Add Note", description: "Add a note to the record", icon: "FileText", category: "crm" },
  { type: "assign_user", label: "Assign User", description: "Assign to a team member", icon: "UserCheck", category: "crm" },
  // Flow control actions
  { type: "wait", label: "Wait", description: "Pause execution for a period of time", icon: "Clock", category: "flow" },
  { type: "condition", label: "Condition", description: "Branch based on a condition", icon: "GitBranch", category: "flow" },
]

// Helper to get trigger by type
export function getTriggerDefinition(type: TriggerType): TriggerDefinition | undefined {
  return TRIGGERS.find(t => t.type === type)
}

// Helper to get action by type
export function getActionDefinition(type: ActionType): ActionDefinition | undefined {
  return ACTIONS.find(a => a.type === type)
}
