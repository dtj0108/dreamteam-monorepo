// Email template types

export interface EmailTemplate {
  id: string
  workspace_id: string
  user_id: string
  name: string
  subject: string
  body: string
  description?: string
  category?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailTemplateInput {
  name: string
  subject: string
  body: string
  description?: string
  category?: string
  is_active?: boolean
}

// Template categories for organizing templates
export const EMAIL_TEMPLATE_CATEGORIES = [
  { value: "welcome", label: "Welcome" },
  { value: "follow_up", label: "Follow Up" },
  { value: "nurture", label: "Nurture" },
  { value: "promotional", label: "Promotional" },
  { value: "announcement", label: "Announcement" },
  { value: "reminder", label: "Reminder" },
  { value: "thank_you", label: "Thank You" },
  { value: "other", label: "Other" },
] as const

export type EmailTemplateCategory = typeof EMAIL_TEMPLATE_CATEGORIES[number]["value"]

// Template variables that can be used in email templates
// These match the variables available in workflow emails
export const TEMPLATE_VARIABLES = [
  { variable: "{{lead_name}}", description: "Lead's full name" },
  { variable: "{{lead_email}}", description: "Lead's email address" },
  { variable: "{{lead_company}}", description: "Lead's company name" },
  { variable: "{{lead_status}}", description: "Lead's current status" },
  { variable: "{{contact_first_name}}", description: "Contact's first name" },
  { variable: "{{contact_last_name}}", description: "Contact's last name" },
  { variable: "{{contact_email}}", description: "Contact's email address" },
  { variable: "{{contact_phone}}", description: "Contact's phone number" },
  { variable: "{{deal_name}}", description: "Deal name" },
  { variable: "{{deal_value}}", description: "Deal value" },
  { variable: "{{deal_stage}}", description: "Deal pipeline stage" },
  { variable: "{{user_name}}", description: "Your name (sender)" },
  { variable: "{{user_email}}", description: "Your email address" },
  { variable: "{{workspace_name}}", description: "Workspace/company name" },
] as const

export type TemplateVariable = typeof TEMPLATE_VARIABLES[number]["variable"]

// Helper to get category label
export function getCategoryLabel(category: string): string {
  const found = EMAIL_TEMPLATE_CATEGORIES.find(c => c.value === category)
  return found?.label || category
}
