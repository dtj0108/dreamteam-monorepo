// Trigger types - events that start a workflow
export type TriggerType =
  // Lead events
  | "lead_created"
  | "lead_status_changed"
  | "lead_stage_changed"
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
  | "add_tag"
  | "remove_tag"
  | "move_lead_stage"
  // Deal actions
  | "create_deal"
  | "update_deal"
  | "move_deal_stage"
  | "close_deal"
  // Flow control actions
  | "wait"
  | "condition"

// Condition operators for branching logic
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty"

// Where the condition field value comes from
export type ConditionFieldSource =
  | "trigger"          // Lead/deal/contact fields from trigger context
  | "custom_field"     // User-defined custom fields
  | "previous_action"  // Result from a previous workflow action

// A single condition definition
export interface WorkflowCondition {
  field_source: ConditionFieldSource
  field_path: string        // e.g., "lead.status", "contact.email", "action.<id>.success"
  field_id?: string         // UUID for custom fields
  operator: ConditionOperator
  value: string             // Value to compare against
}

// Config structure for condition actions
export interface ConditionActionConfig {
  condition: WorkflowCondition
  if_branch: WorkflowAction[]   // Actions to run if condition is true
  else_branch: WorkflowAction[] // Actions to run if condition is false
}

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
  { type: "lead_stage_changed", label: "Lead Stage Changed", description: "When a lead moves to a new pipeline stage", icon: "ArrowRight", category: "lead" },
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
  { type: "add_tag", label: "Add Tag", description: "Add tags to the lead", icon: "Tag", category: "crm" },
  { type: "remove_tag", label: "Remove Tag", description: "Remove tags from the lead", icon: "TagOff", category: "crm" },
  { type: "move_lead_stage", label: "Move Lead Stage", description: "Move lead to a pipeline stage", icon: "MoveRight", category: "crm" },
  { type: "create_deal", label: "Create Opportunity", description: "Create a new opportunity", icon: "Briefcase", category: "crm" },
  { type: "update_deal", label: "Update Opportunity", description: "Update opportunity fields", icon: "PenSquare", category: "crm" },
  { type: "move_deal_stage", label: "Move Opportunity Stage", description: "Move opportunity to a different stage", icon: "ArrowRightCircle", category: "crm" },
  { type: "close_deal", label: "Close Opportunity", description: "Mark opportunity as won or lost", icon: "CheckCircle2", category: "crm" },
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

// Condition operator definitions for UI
export interface ConditionOperatorDefinition {
  operator: ConditionOperator
  label: string
  description: string
  requiresValue: boolean  // false for is_empty, is_not_empty
}

export const CONDITION_OPERATORS: ConditionOperatorDefinition[] = [
  { operator: "equals", label: "Equals", description: "Value is exactly equal", requiresValue: true },
  { operator: "not_equals", label: "Does not equal", description: "Value is not equal", requiresValue: true },
  { operator: "contains", label: "Contains", description: "Value contains text", requiresValue: true },
  { operator: "starts_with", label: "Starts with", description: "Value starts with text", requiresValue: true },
  { operator: "greater_than", label: "Greater than", description: "Value is greater (numeric)", requiresValue: true },
  { operator: "less_than", label: "Less than", description: "Value is less (numeric)", requiresValue: true },
  { operator: "is_empty", label: "Is empty", description: "Value is empty or null", requiresValue: false },
  { operator: "is_not_empty", label: "Is not empty", description: "Value has a value", requiresValue: false },
]

// Available trigger fields by category
export interface ConditionFieldDefinition {
  path: string           // Field path like "lead.status" or "activity.type"
  label: string          // Display label
  category: "lead" | "contact" | "deal" | "activity"  // activity includes both Activity and LeadTask fields
  fieldType: "string" | "number" | "boolean"
}

export const TRIGGER_CONDITION_FIELDS: ConditionFieldDefinition[] = [
  // Lead fields
  { path: "lead.name", label: "Lead Name", category: "lead", fieldType: "string" },
  { path: "lead.status", label: "Lead Status", category: "lead", fieldType: "string" },
  { path: "lead.source", label: "Lead Source", category: "lead", fieldType: "string" },
  { path: "lead.industry", label: "Industry", category: "lead", fieldType: "string" },
  { path: "lead.city", label: "City", category: "lead", fieldType: "string" },
  { path: "lead.state", label: "State", category: "lead", fieldType: "string" },
  { path: "lead.country", label: "Country", category: "lead", fieldType: "string" },
  // Contact fields
  { path: "contact.first_name", label: "First Name", category: "contact", fieldType: "string" },
  { path: "contact.last_name", label: "Last Name", category: "contact", fieldType: "string" },
  { path: "contact.email", label: "Email", category: "contact", fieldType: "string" },
  { path: "contact.phone", label: "Phone", category: "contact", fieldType: "string" },
  // Deal fields
  { path: "deal.name", label: "Deal Name", category: "deal", fieldType: "string" },
  { path: "deal.status", label: "Deal Status", category: "deal", fieldType: "string" },
  { path: "deal.value", label: "Deal Value", category: "deal", fieldType: "number" },
  // Activity fields (for activity_logged and activity_completed triggers)
  { path: "activity.type", label: "Activity Type", category: "activity", fieldType: "string" },
  { path: "activity.subject", label: "Activity Subject", category: "activity", fieldType: "string" },
  { path: "activity.is_completed", label: "Activity Completed", category: "activity", fieldType: "boolean" },
  // Lead Task fields (for task_completed trigger)
  { path: "leadTask.title", label: "Task Title", category: "activity", fieldType: "string" },
  { path: "leadTask.is_completed", label: "Task Completed", category: "activity", fieldType: "boolean" },
]

// Helper to get operator definition
export function getOperatorDefinition(operator: ConditionOperator): ConditionOperatorDefinition | undefined {
  return CONDITION_OPERATORS.find(o => o.operator === operator)
}

// Helper to get fields relevant to a trigger type
export function getFieldsForTrigger(triggerType: TriggerType): ConditionFieldDefinition[] {
  const triggerDef = getTriggerDefinition(triggerType)
  if (!triggerDef) return []

  // Lead triggers include lead and contact fields
  if (triggerDef.category === "lead") {
    return TRIGGER_CONDITION_FIELDS.filter(f => f.category === "lead" || f.category === "contact")
  }
  // Deal triggers include deal and contact fields
  if (triggerDef.category === "deal") {
    return TRIGGER_CONDITION_FIELDS.filter(f => f.category === "deal" || f.category === "contact")
  }
  // Activity triggers include lead, contact, and activity fields
  if (triggerDef.category === "activity") {
    return TRIGGER_CONDITION_FIELDS.filter(f =>
      f.category === "lead" || f.category === "contact" || f.category === "activity"
    )
  }
  return TRIGGER_CONDITION_FIELDS
}
