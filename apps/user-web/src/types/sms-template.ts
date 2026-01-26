// SMS template types

export interface SMSTemplate {
  id: string
  workspace_id: string
  user_id: string
  name: string
  body: string
  description?: string
  category?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SMSTemplateInput {
  name: string
  body: string
  description?: string
  category?: string
  is_active?: boolean
}

// Template categories for organizing templates
export const SMS_TEMPLATE_CATEGORIES = [
  { value: "follow_up", label: "Follow Up" },
  { value: "reminder", label: "Reminder" },
  { value: "appointment", label: "Appointment" },
  { value: "confirmation", label: "Confirmation" },
  { value: "promotional", label: "Promotional" },
  { value: "other", label: "Other" },
] as const

export type SMSTemplateCategory = typeof SMS_TEMPLATE_CATEGORIES[number]["value"]

// Template variables that can be used in SMS templates
// Same variables as email templates for consistency
export const SMS_TEMPLATE_VARIABLES = [
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
  { variable: "{{workspace_name}}", description: "Workspace/company name" },
] as const

export type SMSTemplateVariable = typeof SMS_TEMPLATE_VARIABLES[number]["variable"]

// Helper to get category label
export function getSMSCategoryLabel(category: string): string {
  const found = SMS_TEMPLATE_CATEGORIES.find(c => c.value === category)
  return found?.label || category
}

// SMS segment calculation utilities
export interface SMSSegmentInfo {
  segments: number
  remaining: number
  encoding: "GSM-7" | "Unicode"
  charCount: number
  maxChars: number
}

export function getSegmentInfo(text: string): SMSSegmentInfo {
  const hasUnicode = /[^\x00-\x7F]/.test(text)
  const charCount = text.length

  // GSM-7 allows 160 chars in single segment, 153 in multi-segment
  // Unicode allows 70 chars in single segment, 67 in multi-segment
  const singleLimit = hasUnicode ? 70 : 160
  const multiLimit = hasUnicode ? 67 : 153

  if (charCount === 0) {
    return {
      segments: 0,
      remaining: singleLimit,
      encoding: hasUnicode ? "Unicode" : "GSM-7",
      charCount: 0,
      maxChars: singleLimit,
    }
  }

  if (charCount <= singleLimit) {
    return {
      segments: 1,
      remaining: singleLimit - charCount,
      encoding: hasUnicode ? "Unicode" : "GSM-7",
      charCount,
      maxChars: singleLimit,
    }
  }

  const segments = Math.ceil(charCount / multiLimit)
  const remaining = (segments * multiLimit) - charCount
  return {
    segments,
    remaining,
    encoding: hasUnicode ? "Unicode" : "GSM-7",
    charCount,
    maxChars: segments * multiLimit,
  }
}
