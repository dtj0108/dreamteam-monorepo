/**
 * Lead CSV Parser with automatic column detection
 *
 * Reuses parseCSV from csv-parser.ts for base parsing,
 * adds lead-specific column detection and transformation.
 */

import { parseCSV, type ParsedCSV } from './csv-parser'

export { parseCSV, type ParsedCSV }

export interface LeadColumnMapping {
  name: string | null          // Required - company name
  website: string | null       // For duplicate detection
  industry: string | null
  status: string | null
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  source: string | null
}

export interface DetectedLeadMapping extends LeadColumnMapping {
  confidence: Record<keyof LeadColumnMapping, number>
}

export interface ParsedLead {
  name: string
  website: string | null
  industry: string | null
  status: string | null
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  source: string | null
  isValid: boolean
  errors: string[]
}

// Column patterns for auto-detection of lead fields
const LEAD_COLUMN_PATTERNS: Record<keyof LeadColumnMapping, RegExp[]> = {
  name: [
    /^name$/i,
    /^company$/i,
    /^company[_\s-]?name$/i,
    /^organization$/i,
    /^org$/i,
    /^lead[_\s-]?name$/i,
    /^business$/i,
    /^business[_\s-]?name$/i,
    /^account$/i,
    /^account[_\s-]?name$/i,
  ],
  website: [
    /^website$/i,
    /^url$/i,
    /^web$/i,
    /^domain$/i,
    /^site$/i,
    /^homepage$/i,
    /^company[_\s-]?url$/i,
    /^web[_\s-]?address$/i,
  ],
  industry: [
    /^industry$/i,
    /^sector$/i,
    /^vertical$/i,
    /^business[_\s-]?type$/i,
    /^category$/i,
  ],
  status: [
    /^status$/i,
    /^stage$/i,
    /^lead[_\s-]?status$/i,
    /^lead[_\s-]?stage$/i,
    /^pipeline[_\s-]?stage$/i,
  ],
  notes: [
    /^notes?$/i,
    /^description$/i,
    /^comment$/i,
    /^comments$/i,
    /^details$/i,
    /^memo$/i,
  ],
  address: [
    /^address$/i,
    /^street$/i,
    /^street[_\s-]?address$/i,
    /^address[_\s-]?1$/i,
    /^address[_\s-]?line[_\s-]?1$/i,
    /^billing[_\s-]?address$/i,
  ],
  city: [
    /^city$/i,
    /^town$/i,
    /^billing[_\s-]?city$/i,
  ],
  state: [
    /^state$/i,
    /^province$/i,
    /^region$/i,
    /^state[_\s-]?province$/i,
    /^billing[_\s-]?state$/i,
  ],
  country: [
    /^country$/i,
    /^nation$/i,
    /^billing[_\s-]?country$/i,
  ],
  postal_code: [
    /^postal[_\s-]?code$/i,
    /^zip$/i,
    /^zip[_\s-]?code$/i,
    /^postcode$/i,
    /^post[_\s-]?code$/i,
    /^billing[_\s-]?zip$/i,
  ],
  source: [
    /^source$/i,
    /^lead[_\s-]?source$/i,
    /^origin$/i,
    /^channel$/i,
    /^how[_\s-]?found$/i,
    /^referral[_\s-]?source$/i,
  ],
}

/**
 * Auto-detect column mappings for lead fields based on header names
 */
export function detectLeadColumnMapping(headers: string[]): DetectedLeadMapping {
  const mapping: DetectedLeadMapping = {
    name: null,
    website: null,
    industry: null,
    status: null,
    notes: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    source: null,
    confidence: {
      name: 0,
      website: 0,
      industry: 0,
      status: 0,
      notes: 0,
      address: 0,
      city: 0,
      state: 0,
      country: 0,
      postal_code: 0,
      source: 0,
    },
  }

  for (const header of headers) {
    for (const [field, patterns] of Object.entries(LEAD_COLUMN_PATTERNS)) {
      const fieldKey = field as keyof LeadColumnMapping

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
 * Transform CSV rows to leads using column mapping
 */
export function transformToLeads(
  rows: string[][],
  headers: string[],
  mapping: LeadColumnMapping
): ParsedLead[] {
  const getColumnIndex = (columnName: string | null): number => {
    if (!columnName) return -1
    return headers.indexOf(columnName)
  }

  const nameIdx = getColumnIndex(mapping.name)
  const websiteIdx = getColumnIndex(mapping.website)
  const industryIdx = getColumnIndex(mapping.industry)
  const statusIdx = getColumnIndex(mapping.status)
  const notesIdx = getColumnIndex(mapping.notes)
  const addressIdx = getColumnIndex(mapping.address)
  const cityIdx = getColumnIndex(mapping.city)
  const stateIdx = getColumnIndex(mapping.state)
  const countryIdx = getColumnIndex(mapping.country)
  const postalCodeIdx = getColumnIndex(mapping.postal_code)
  const sourceIdx = getColumnIndex(mapping.source)

  return rows.map((row, rowIndex) => {
    const errors: string[] = []

    // Get name (required)
    const name = nameIdx >= 0 ? row[nameIdx]?.trim() : ''
    if (!name) {
      errors.push(`Row ${rowIndex + 2}: Missing company name`)
    }

    // Get optional fields
    const website = websiteIdx >= 0 ? row[websiteIdx]?.trim() || null : null
    const industry = industryIdx >= 0 ? row[industryIdx]?.trim() || null : null
    const status = statusIdx >= 0 ? row[statusIdx]?.trim() || null : null
    const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || null : null
    const address = addressIdx >= 0 ? row[addressIdx]?.trim() || null : null
    const city = cityIdx >= 0 ? row[cityIdx]?.trim() || null : null
    const state = stateIdx >= 0 ? row[stateIdx]?.trim() || null : null
    const country = countryIdx >= 0 ? row[countryIdx]?.trim() || null : null
    const postal_code = postalCodeIdx >= 0 ? row[postalCodeIdx]?.trim() || null : null
    const source = sourceIdx >= 0 ? row[sourceIdx]?.trim() || null : null

    return {
      name: name || '',
      website,
      industry,
      status,
      notes,
      address,
      city,
      state,
      country,
      postal_code,
      source,
      isValid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Validate that required mappings are set
 */
export function validateLeadMapping(mapping: LeadColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!mapping.name) {
    errors.push('Company name column is required')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create an empty lead column mapping
 */
export function createEmptyLeadMapping(): LeadColumnMapping {
  return {
    name: null,
    website: null,
    industry: null,
    status: null,
    notes: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    source: null,
  }
}
