/**
 * Task CSV Parser with automatic column detection
 *
 * Used for importing tasks from CSV files.
 * Includes lead_name field for linking to existing leads.
 */

import { parseCSV, type ParsedCSV } from './csv-parser'

export { parseCSV, type ParsedCSV }

export interface TaskColumnMapping {
  lead_name: string | null      // Required - to link to lead
  title: string | null          // Required
  description: string | null
  due_date: string | null
}

export interface DetectedTaskMapping extends TaskColumnMapping {
  confidence: Record<keyof TaskColumnMapping, number>
}

export interface ParsedTask {
  lead_name: string
  title: string
  description: string | null
  due_date: string | null
  isValid: boolean
  errors: string[]
}

// Column patterns for auto-detection of task fields
const TASK_COLUMN_PATTERNS: Record<keyof TaskColumnMapping, RegExp[]> = {
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
  title: [
    /^task$/i,
    /^title$/i,
    /^subject$/i,
    /^action$/i,
    /^to[_\s-]?do$/i,
    /^task[_\s-]?name$/i,
    /^task[_\s-]?title$/i,
    /^name$/i,
  ],
  description: [
    /^description$/i,
    /^details$/i,
    /^notes?$/i,
    /^body$/i,
    /^content$/i,
    /^comment$/i,
  ],
  due_date: [
    /^due[_\s-]?date$/i,
    /^deadline$/i,
    /^due$/i,
    /^target[_\s-]?date$/i,
    /^complete[_\s-]?by$/i,
    /^finish[_\s-]?by$/i,
    /^date$/i,
  ],
}

/**
 * Auto-detect column mappings for task fields based on header names
 */
export function detectTaskColumnMapping(headers: string[]): DetectedTaskMapping {
  const mapping: DetectedTaskMapping = {
    lead_name: null,
    title: null,
    description: null,
    due_date: null,
    confidence: {
      lead_name: 0,
      title: 0,
      description: 0,
      due_date: 0,
    },
  }

  for (const header of headers) {
    for (const [field, patterns] of Object.entries(TASK_COLUMN_PATTERNS)) {
      const fieldKey = field as keyof TaskColumnMapping

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
 * Transform CSV rows to tasks using column mapping
 */
export function transformToTasks(
  rows: string[][],
  headers: string[],
  mapping: TaskColumnMapping
): ParsedTask[] {
  const getColumnIndex = (columnName: string | null): number => {
    if (!columnName) return -1
    return headers.indexOf(columnName)
  }

  const leadNameIdx = getColumnIndex(mapping.lead_name)
  const titleIdx = getColumnIndex(mapping.title)
  const descriptionIdx = getColumnIndex(mapping.description)
  const dueDateIdx = getColumnIndex(mapping.due_date)

  return rows.map((row, rowIndex) => {
    const errors: string[] = []

    // Get lead name (required for linking)
    const lead_name = leadNameIdx >= 0 ? row[leadNameIdx]?.trim() : ''
    if (!lead_name) {
      errors.push(`Row ${rowIndex + 2}: Missing company/lead name`)
    }

    // Get title (required)
    const title = titleIdx >= 0 ? row[titleIdx]?.trim() : ''
    if (!title) {
      errors.push(`Row ${rowIndex + 2}: Missing task title`)
    }

    // Get optional fields
    const description = descriptionIdx >= 0 ? row[descriptionIdx]?.trim() || null : null

    const dueDateRaw = dueDateIdx >= 0 ? row[dueDateIdx] : null
    const due_date = parseDate(dueDateRaw)

    return {
      lead_name: lead_name || '',
      title: title || '',
      description,
      due_date,
      isValid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Validate that required mappings are set
 */
export function validateTaskMapping(mapping: TaskColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!mapping.lead_name) {
    errors.push('Company/Lead name column is required')
  }

  if (!mapping.title) {
    errors.push('Task title column is required')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create an empty task column mapping
 */
export function createEmptyTaskMapping(): TaskColumnMapping {
  return {
    lead_name: null,
    title: null,
    description: null,
    due_date: null,
  }
}
