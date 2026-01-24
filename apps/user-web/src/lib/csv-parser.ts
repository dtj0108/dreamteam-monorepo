/**
 * CSV Parser with automatic column detection
 */

export interface ParsedCSV {
  headers: string[]
  rows: string[][]
  rawData: string
}

export interface ColumnMapping {
  date: string | null
  amount: string | null
  description: string | null
  notes: string | null
  // For separate debit/credit columns
  debit: string | null
  credit: string | null
}

export interface DetectedMapping extends ColumnMapping {
  confidence: Record<keyof ColumnMapping, number>
}

export interface ParsedTransaction {
  date: string
  amount: number
  description: string
  notes: string | null
  categoryId: string | null
  categoryName: string | null
  isValid: boolean
  errors: string[]
}

// Common column name patterns for auto-detection
const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  date: [
    /^date$/i,
    /^transaction[_\s]?date$/i,
    /^posted[_\s]?date$/i,
    /^created$/i,
    /^created[_\s]?at$/i,
    /^post[_\s]?date$/i,
    /^trans[_\s]?date$/i,
    /^booking[_\s]?date$/i,
  ],
  amount: [
    /^amount$/i,
    /^total$/i,
    /^net$/i,
    /^value$/i,
    /^sum$/i,
    /^transaction[_\s]?amount$/i,
  ],
  description: [
    /^description$/i,
    /^memo$/i,
    /^narrative$/i,
    /^name$/i,
    /^merchant$/i,
    /^payee$/i,
    /^details$/i,
    /^transaction[_\s]?description$/i,
    /^statement[_\s]?description$/i,
  ],
  notes: [
    /^notes?$/i,
    /^comment$/i,
    /^reference$/i,
    /^category$/i,
  ],
  debit: [
    /^debit$/i,
    /^withdrawal$/i,
    /^out$/i,
    /^expense$/i,
    /^money[_\s]?out$/i,
  ],
  credit: [
    /^credit$/i,
    /^deposit$/i,
    /^in$/i,
    /^income$/i,
    /^money[_\s]?in$/i,
  ],
}

/**
 * Parse CSV string into headers and rows
 */
export function parseCSV(csvText: string): ParsedCSV {
  const lines = csvText.trim().split(/\r?\n/)
  
  if (lines.length === 0) {
    return { headers: [], rows: [], rawData: csvText }
  }

  // Parse header row
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const rows: string[][] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line) {
      const row = parseCSVLine(line)
      // Pad or trim row to match header length
      while (row.length < headers.length) row.push('')
      if (row.length > headers.length) row.length = headers.length
      rows.push(row)
    }
  }

  return { headers, rows, rawData: csvText }
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else if (char === '"') {
        // End of quoted value
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true
      } else if (char === ',') {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  
  // Add last field
  result.push(current.trim())
  
  return result
}

/**
 * Auto-detect column mappings based on header names
 */
export function detectColumnMapping(headers: string[]): DetectedMapping {
  const mapping: DetectedMapping = {
    date: null,
    amount: null,
    description: null,
    notes: null,
    debit: null,
    credit: null,
    confidence: {
      date: 0,
      amount: 0,
      description: 0,
      notes: 0,
      debit: 0,
      credit: 0,
    },
  }

  for (const header of headers) {
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      const fieldKey = field as keyof ColumnMapping
      
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
 * Parse amount string to number
 */
export function parseAmount(value: string): number | null {
  if (!value || value.trim() === '') return null
  
  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[$€£¥₹,\s]/g, '')
  
  // Handle parentheses for negative numbers: (100.00) -> -100.00
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1)
  }
  
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse date string to ISO format
 */
export function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null
  
  const cleaned = value.trim()
  
  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})/, // 2024-01-15
    // US format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // 1/15/2024 or 01/15/2024
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})/, // 1/15/24
    // European format  
    /^(\d{1,2})-(\d{1,2})-(\d{4})/, // 15-01-2024
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})/, // 15.01.2024
  ]

  // Try native Date parsing first
  const date = new Date(cleaned)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Manual parsing for common formats
  for (const format of formats) {
    const match = cleaned.match(format)
    if (match) {
      let year: number, month: number, day: number
      
      if (format.source.startsWith('^(\\d{4})')) {
        // ISO format: year first
        year = parseInt(match[1])
        month = parseInt(match[2])
        day = parseInt(match[3])
      } else {
        // US/EU format: year last
        const first = parseInt(match[1])
        const second = parseInt(match[2])
        year = parseInt(match[3])
        
        // 2-digit year
        if (year < 100) {
          year += year < 50 ? 2000 : 1900
        }
        
        // Guess if MM/DD or DD/MM based on values
        if (first > 12) {
          // Must be DD/MM
          day = first
          month = second
        } else if (second > 12) {
          // Must be MM/DD
          month = first
          day = second
        } else {
          // Assume US format (MM/DD)
          month = first
          day = second
        }
      }
      
      // Validate
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }
  
  return null
}

/**
 * Transform CSV rows to transactions using column mapping
 */
export function transformToTransactions(
  rows: string[][],
  headers: string[],
  mapping: ColumnMapping
): ParsedTransaction[] {
  const getColumnIndex = (columnName: string | null): number => {
    if (!columnName) return -1
    return headers.indexOf(columnName)
  }

  const dateIdx = getColumnIndex(mapping.date)
  const amountIdx = getColumnIndex(mapping.amount)
  const descIdx = getColumnIndex(mapping.description)
  const notesIdx = getColumnIndex(mapping.notes)
  const debitIdx = getColumnIndex(mapping.debit)
  const creditIdx = getColumnIndex(mapping.credit)

  return rows.map((row, rowIndex) => {
    const errors: string[] = []
    
    // Parse date
    const dateValue = dateIdx >= 0 ? row[dateIdx] : ''
    const date = parseDate(dateValue)
    if (!date) {
      errors.push(`Row ${rowIndex + 2}: Invalid date "${dateValue}"`)
    }
    
    // Parse amount
    let amount: number | null = null
    
    if (amountIdx >= 0) {
      // Single amount column
      amount = parseAmount(row[amountIdx])
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      // Separate debit/credit columns
      const debit = debitIdx >= 0 ? parseAmount(row[debitIdx]) : null
      const credit = creditIdx >= 0 ? parseAmount(row[creditIdx]) : null
      
      if (debit !== null && debit !== 0) {
        amount = -Math.abs(debit) // Debits are negative
      } else if (credit !== null && credit !== 0) {
        amount = Math.abs(credit) // Credits are positive
      }
    }
    
    if (amount === null) {
      errors.push(`Row ${rowIndex + 2}: Invalid or missing amount`)
    }
    
    // Get description
    const description = descIdx >= 0 ? row[descIdx].trim() : ''
    if (!description) {
      errors.push(`Row ${rowIndex + 2}: Missing description`)
    }
    
    // Get notes (optional)
    const notes = notesIdx >= 0 ? row[notesIdx].trim() || null : null

    return {
      date: date || new Date().toISOString().split('T')[0],
      amount: amount || 0,
      description: description || 'Unknown',
      notes,
      categoryId: null,
      categoryName: null,
      isValid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Validate that required mappings are set
 */
export function validateMapping(mapping: ColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!mapping.date) {
    errors.push('Date column is required')
  }
  
  if (!mapping.amount && !mapping.debit && !mapping.credit) {
    errors.push('Amount column (or Debit/Credit columns) is required')
  }
  
  if (!mapping.description) {
    errors.push('Description column is required')
  }
  
  return { valid: errors.length === 0, errors }
}

