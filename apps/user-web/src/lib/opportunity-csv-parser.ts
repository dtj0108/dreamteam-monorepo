/**
 * Opportunity CSV Parser with automatic column detection
 *
 * Used for importing opportunities from CSV files.
 * Includes lead_name field for linking to existing leads.
 */

import { parseCSV, type ParsedCSV } from './csv-parser'

export { parseCSV, type ParsedCSV }

export interface OpportunityColumnMapping {
  lead_name: string | null           // Required - to link to lead
  name: string | null                // Required - opportunity/deal name
  value: string | null
  probability: string | null
  expected_close_date: string | null
  status: string | null              // active, won, lost
  notes: string | null
}

export interface DetectedOpportunityMapping extends OpportunityColumnMapping {
  confidence: Record<keyof OpportunityColumnMapping, number>
}

export interface ParsedOpportunity {
  lead_name: string
  name: string
  value: number | null
  probability: number | null
  expected_close_date: string | null
  status: string | null
  notes: string | null
  isValid: boolean
  errors: string[]
}

// Column patterns for auto-detection of opportunity fields
const OPPORTUNITY_COLUMN_PATTERNS: Record<keyof OpportunityColumnMapping, RegExp[]> = {
  lead_name: [
    /^company$/i,
    /^company[_\s-]?name$/i,
    /^lead$/i,
    /^lead[_\s-]?name$/i,
    /^account$/i,
    /^account[_\s-]?name$/i,
    /^organization$/i,
    /^org$/i,
    /^business$/i,
  ],
  name: [
    /^opportunity$/i,
    /^opportunity[_\s-]?name$/i,
    /^deal$/i,
    /^deal[_\s-]?name$/i,
    /^opp[_\s-]?name$/i,
    /^title$/i,
    /^name$/i,
  ],
  value: [
    /^value$/i,
    /^amount$/i,
    /^deal[_\s-]?value$/i,
    /^deal[_\s-]?amount$/i,
    /^revenue$/i,
    /^price$/i,
    /^contract[_\s-]?value$/i,
  ],
  probability: [
    /^probability$/i,
    /^confidence$/i,
    /^win[_\s-]?chance$/i,
    /^likelihood$/i,
    /^win[_\s-]?probability$/i,
    /^percent$/i,
  ],
  expected_close_date: [
    /^close[_\s-]?date$/i,
    /^expected[_\s-]?close$/i,
    /^expected[_\s-]?close[_\s-]?date$/i,
    /^target[_\s-]?close$/i,
    /^close$/i,
    /^closing[_\s-]?date$/i,
  ],
  status: [
    /^status$/i,
    /^outcome$/i,
    /^result$/i,
    /^deal[_\s-]?status$/i,
    /^opp[_\s-]?status$/i,
  ],
  notes: [
    /^notes?$/i,
    /^description$/i,
    /^comment$/i,
    /^comments$/i,
    /^details$/i,
    /^memo$/i,
  ],
}

/**
 * Auto-detect column mappings for opportunity fields based on header names
 */
export function detectOpportunityColumnMapping(headers: string[]): DetectedOpportunityMapping {
  const mapping: DetectedOpportunityMapping = {
    lead_name: null,
    name: null,
    value: null,
    probability: null,
    expected_close_date: null,
    status: null,
    notes: null,
    confidence: {
      lead_name: 0,
      name: 0,
      value: 0,
      probability: 0,
      expected_close_date: 0,
      status: 0,
      notes: 0,
    },
  }

  for (const header of headers) {
    for (const [field, patterns] of Object.entries(OPPORTUNITY_COLUMN_PATTERNS)) {
      const fieldKey = field as keyof OpportunityColumnMapping

      for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(header)) {
          // Higher confidence for earlier patterns (more specific matches)
          const confidence = 1 - (i * 0.1)

          if (confidence > mapping.confidence[fieldKey]) {
            mapping[fieldKey] = header
            mapping.confidence[fieldKey] = confidence
          }
          break
        }
      }
    }
  }

  return mapping
}

/**
 * Parse a numeric value from string (handles currency symbols, commas)
 */
function parseNumericValue(value: string | undefined | null): number | null {
  if (!value) return null
  // Remove currency symbols, commas, and trim
  const cleaned = value.replace(/[$€£¥,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse a probability value (accepts percentages like "50%" or decimals like "0.5")
 */
function parseProbability(value: string | undefined | null): number | null {
  if (!value) return null
  const cleaned = value.replace(/%/g, '').trim()
  let num = parseFloat(cleaned)
  if (isNaN(num)) return null
  // If value was > 1, assume it's a percentage
  if (num > 1 && num <= 100) {
    return num
  }
  // If value was <= 1, assume it's a decimal
  if (num <= 1) {
    return num * 100
  }
  return null
}

/**
 * Parse a date value (handles various formats)
 */
function parseDate(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()

  // Try to parse the date
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    // Return as ISO date string (YYYY-MM-DD)
    return date.toISOString().split('T')[0]
  }

  return null
}

/**
 * Normalize status value to one of: active, won, lost
 */
function normalizeStatus(value: string | undefined | null): string | null {
  if (!value) return 'active' // Default to active
  const lower = value.toLowerCase().trim()

  if (['won', 'closed won', 'success', 'successful', 'converted'].includes(lower)) {
    return 'won'
  }
  if (['lost', 'closed lost', 'failed', 'dead', 'rejected'].includes(lower)) {
    return 'lost'
  }
  if (['active', 'open', 'pending', 'in progress', 'negotiation', 'proposal'].includes(lower)) {
    return 'active'
  }

  return 'active' // Default
}

/**
 * Transform CSV rows to opportunities using column mapping
 */
export function transformToOpportunities(
  rows: string[][],
  headers: string[],
  mapping: OpportunityColumnMapping
): ParsedOpportunity[] {
  const getColumnIndex = (columnName: string | null): number => {
    if (!columnName) return -1
    return headers.indexOf(columnName)
  }

  const leadNameIdx = getColumnIndex(mapping.lead_name)
  const nameIdx = getColumnIndex(mapping.name)
  const valueIdx = getColumnIndex(mapping.value)
  const probabilityIdx = getColumnIndex(mapping.probability)
  const closeDateIdx = getColumnIndex(mapping.expected_close_date)
  const statusIdx = getColumnIndex(mapping.status)
  const notesIdx = getColumnIndex(mapping.notes)

  return rows.map((row, rowIndex) => {
    const errors: string[] = []

    // Get lead name (required for linking)
    const lead_name = leadNameIdx >= 0 ? row[leadNameIdx]?.trim() : ''
    if (!lead_name) {
      errors.push(`Row ${rowIndex + 2}: Missing company/lead name`)
    }

    // Get opportunity name (required)
    const name = nameIdx >= 0 ? row[nameIdx]?.trim() : ''
    if (!name) {
      errors.push(`Row ${rowIndex + 2}: Missing opportunity/deal name`)
    }

    // Get optional fields
    const valueRaw = valueIdx >= 0 ? row[valueIdx] : null
    const value = parseNumericValue(valueRaw)

    const probabilityRaw = probabilityIdx >= 0 ? row[probabilityIdx] : null
    const probability = parseProbability(probabilityRaw)

    const closeDateRaw = closeDateIdx >= 0 ? row[closeDateIdx] : null
    const expected_close_date = parseDate(closeDateRaw)

    const statusRaw = statusIdx >= 0 ? row[statusIdx] : null
    const status = normalizeStatus(statusRaw)

    const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || null : null

    return {
      lead_name: lead_name || '',
      name: name || '',
      value,
      probability,
      expected_close_date,
      status,
      notes,
      isValid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Validate that required mappings are set
 */
export function validateOpportunityMapping(mapping: OpportunityColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!mapping.lead_name) {
    errors.push('Company/Lead name column is required')
  }

  if (!mapping.name) {
    errors.push('Opportunity/Deal name column is required')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create an empty opportunity column mapping
 */
export function createEmptyOpportunityMapping(): OpportunityColumnMapping {
  return {
    lead_name: null,
    name: null,
    value: null,
    probability: null,
    expected_close_date: null,
    status: null,
    notes: null,
  }
}
