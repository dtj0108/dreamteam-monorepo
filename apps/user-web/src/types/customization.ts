// Lead Status types
export interface LeadStatus {
  id: string
  user_id: string
  name: string
  color: string
  position: number
  is_default: boolean
  is_won: boolean
  is_lost: boolean
  created_at: string
}

// Custom Field types
export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "url"
  | "email"
  | "phone"

export interface CustomFieldOption {
  value: string
  label: string
}

export interface CustomField {
  id: string
  user_id: string
  entity_type: string
  name: string
  field_type: FieldType
  options: CustomFieldOption[]
  is_required: boolean
  position: number
  created_at: string
}

// Custom Field Value type
export interface CustomFieldValue {
  id: string
  custom_field_id: string
  entity_id: string
  value: string | null
  created_at: string
  updated_at: string
}

// For API responses that join field with value
export interface CustomFieldWithValue extends CustomField {
  value?: string | null
}

// Lead Pipeline types
export interface LeadPipeline {
  id: string
  user_id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  stages?: LeadPipelineStage[]
}

export interface LeadPipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string | null
  position: number
  is_won: boolean
  is_lost: boolean
  created_at: string
}

// For Kanban board - lead with stage info
export interface LeadWithStage {
  id: string
  name: string
  website?: string
  industry?: string
  status?: string
  notes?: string
  pipeline_id?: string
  stage_id?: string
  contactCount: number
  created_at: string
}
