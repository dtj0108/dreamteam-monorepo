/**
 * Contact CSV Parser with automatic column detection
 *
 * Used for importing contacts from CSV files.
 * Includes lead_name field for linking to existing leads.
 */

import { parseCSV, type ParsedCSV } from './csv-parser'

export { parseCSV, type ParsedCSV }

export interface ContactColumnMapping {
  lead_name: string | null      // Required - to link to lead
  first_name: string | null     // Required
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  notes: string | null
}

export interface DetectedContactMapping extends ContactColumnMapping {
  confidence: Record<keyof ContactColumnMapping, number>
}

export interface ParsedContact {
  lead_name: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  notes: string | null
  isValid: boolean
  errors: string[]
}

// Column patterns for auto-detection of contact fields
const CONTACT_COLUMN_PATTERNS: Record<keyof ContactColumnMapping, RegExp[]> = {
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
  first_name: [
    /^first[_\s-]?name$/i,
    /^fname$/i,
    /^given[_\s-]?name$/i,
    /^first$/i,
  ],
  last_name: [
    /^last[_\s-]?name$/i,
    /^lname$/i,
    /^surname$/i,
    /^family[_\s-]?name$/i,
    /^last$/i,
  ],
  email: [
    /^email$/i,
    /^e-?mail$/i,
    /^email[_\s-]?address$/i,
    /^work[_\s-]?email$/i,
    /^primary[_\s-]?email$/i,
  ],
  phone: [
    /^phone$/i,
    /^mobile$/i,
    /^tel$/i,
    /^telephone$/i,
    /^phone[_\s-]?number$/i,
    /^cell$/i,
    /^cell[_\s-]?phone$/i,
    /^work[_\s-]?phone$/i,
  ],
  title: [
    /^title$/i,
    /^job[_\s-]?title$/i,
    /^position$/i,
    /^role$/i,
    /^designation$/i,
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
 * Auto-detect column mappings for contact fields based on header names
 */
export function detectContactColumnMapping(headers: string[]): DetectedContactMapping {
  const mapping: DetectedContactMapping = {
    lead_name: null,
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    title: null,
    notes: null,
    confidence: {
      lead_name: 0,
      first_name: 0,
      last_name: 0,
      email: 0,
      phone: 0,
      title: 0,
      notes: 0,
    },
  }

  for (const header of headers) {
    for (const [field, patterns] of Object.entries(CONTACT_COLUMN_PATTERNS)) {
      const fieldKey = field as keyof ContactColumnMapping

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
 * Transform CSV rows to contacts using column mapping
 */
export function transformToContacts(
  rows: string[][],
  headers: string[],
  mapping: ContactColumnMapping
): ParsedContact[] {
  const getColumnIndex = (columnName: string | null): number => {
    if (!columnName) return -1
    return headers.indexOf(columnName)
  }

  const leadNameIdx = getColumnIndex(mapping.lead_name)
  const firstNameIdx = getColumnIndex(mapping.first_name)
  const lastNameIdx = getColumnIndex(mapping.last_name)
  const emailIdx = getColumnIndex(mapping.email)
  const phoneIdx = getColumnIndex(mapping.phone)
  const titleIdx = getColumnIndex(mapping.title)
  const notesIdx = getColumnIndex(mapping.notes)

  return rows.map((row, rowIndex) => {
    const errors: string[] = []

    // Get lead name (required for linking)
    const lead_name = leadNameIdx >= 0 ? row[leadNameIdx]?.trim() : ''
    if (!lead_name) {
      errors.push(`Row ${rowIndex + 2}: Missing company/lead name`)
    }

    // Get first name (required)
    const first_name = firstNameIdx >= 0 ? row[firstNameIdx]?.trim() : ''
    if (!first_name) {
      errors.push(`Row ${rowIndex + 2}: Missing first name`)
    }

    // Get optional fields
    const last_name = lastNameIdx >= 0 ? row[lastNameIdx]?.trim() || null : null
    const email = emailIdx >= 0 ? row[emailIdx]?.trim() || null : null
    const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() || null : null
    const title = titleIdx >= 0 ? row[titleIdx]?.trim() || null : null
    const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || null : null

    return {
      lead_name: lead_name || '',
      first_name: first_name || '',
      last_name,
      email,
      phone,
      title,
      notes,
      isValid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Validate that required mappings are set
 */
export function validateContactMapping(mapping: ContactColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!mapping.lead_name) {
    errors.push('Company/Lead name column is required')
  }

  if (!mapping.first_name) {
    errors.push('First name column is required')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create an empty contact column mapping
 */
export function createEmptyContactMapping(): ContactColumnMapping {
  return {
    lead_name: null,
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    title: null,
    notes: null,
  }
}
