export type OpportunityStatus = 'active' | 'won' | 'lost'
export type ValueType = 'one_time' | 'recurring'

export interface OpportunityContact {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
}

export interface Opportunity {
  id: string
  lead_id: string
  user_id: string
  workspace_id?: string
  contact_id?: string
  name: string
  value: number | null
  probability: number  // 0-100 (confidence percentage)
  status: OpportunityStatus
  value_type: ValueType
  expected_close_date: string | null
  closed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations (populated by joins)
  lead?: {
    id: string
    name: string
    website?: string
    industry?: string
    status?: string
  }
  contact?: OpportunityContact
}

export interface CreateOpportunityData {
  lead_id: string
  name: string
  value?: number | null
  probability?: number
  status?: OpportunityStatus
  value_type?: ValueType
  contact_id?: string
  expected_close_date?: string | null
  notes?: string | null
}

export interface UpdateOpportunityData {
  name?: string
  value?: number | null
  probability?: number
  status?: OpportunityStatus
  value_type?: ValueType
  contact_id?: string | null
  expected_close_date?: string | null
  closed_date?: string | null
  notes?: string | null
}

/**
 * Calculate the expected value of an opportunity
 * Expected Value = Value × (Probability / 100)
 */
export function calculateExpectedValue(opportunity: Opportunity): number | null {
  if (opportunity.value === null || opportunity.value === undefined) {
    return null
  }
  return opportunity.value * (opportunity.probability / 100)
}

/**
 * Format currency value for display
 */
export function formatOpportunityValue(value: number | null, valueType: ValueType = 'one_time'): string {
  if (value === null || value === undefined) {
    return '-'
  }
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

  return valueType === 'recurring' ? `${formatted}/mo` : formatted
}

/**
 * Get status badge color
 */
export function getOpportunityStatusColor(status: OpportunityStatus): string {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800'
    case 'won':
      return 'bg-emerald-100 text-emerald-800'
    case 'lost':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get probability badge color based on confidence level
 */
export function getProbabilityColor(probability: number): string {
  if (probability >= 75) return 'text-emerald-600'
  if (probability >= 50) return 'text-yellow-600'
  if (probability >= 25) return 'text-orange-600'
  return 'text-red-600'
}
