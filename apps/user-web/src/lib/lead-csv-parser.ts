/**
 * Lead CSV Parser with automatic column detection
 *
 * Reuses parseCSV from csv-parser.ts for base parsing,
 * adds lead-specific column detection and transformation.
 */

import { parseCSV, type ParsedCSV } from './csv-parser'

export { parseCSV, type ParsedCSV }

// Maximum number of contact slots supported per lead
export const MAX_CONTACTS_PER_LEAD = 5

// Contact field types
export type ContactFieldType = 'first_name' | 'last_name' | 'email' | 'phone' | 'title'

// Interface for a single contact's data
export interface ContactData {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
}

// Interface for a contact slot (used in column mapping UI)
export interface ContactSlot {
  slotIndex: number      // 0 = primary, 1-4 = additional
  slotLabel: string      // "Primary Contact", "Contact 2", etc.
  fields: {
    first_name: string | null  // Column name mapped to first_name
    last_name: string | null
    email: string | null
    phone: string | null
    title: string | null
  }
}

// Multi-contact column mapping
export interface MultiContactLeadColumnMapping {
  // Lead fields (same as before)
  name: string | null
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
  // Multiple contact slots instead of single fields
  contactSlots: ContactSlot[]
}

// Detected multi-contact mapping with confidence scores
export interface DetectedMultiContactLeadMapping extends MultiContactLeadColumnMapping {
  confidence: {
    name: number
    website: number
    industry: number
    status: number
    notes: number
    address: number
    city: number
    state: number
    country: number
    postal_code: number
    source: number
  }
}

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
  // Contact fields (optional)
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_title: string | null
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
  // Legacy single contact fields (for backward compatibility)
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_title: string | null
  // NEW: Multiple contacts array
  contacts: ContactData[]
  hasContactData: boolean  // true if any contact field is present
  contactCount: number     // Number of contacts with data
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
  // Contact fields - includes patterns for primary/numbered contacts
  contact_first_name: [
    /^first[_\s-]?name$/i,
    /^fname$/i,
    /^contact[_\s-]?first[_\s-]?name$/i,
    /^given[_\s-]?name$/i,
    // Primary/main contact patterns
    /^(?:primary|main)[_\s-]?(?:contact[_\s-]?)?first[_\s-]?name$/i,
    // Numbered contact patterns (contact 1 first name, first name 1, etc.)
    /^contact[_\s-]?1[_\s-]?first[_\s-]?name$/i,
    /^(?:contact[_\s-]?)?first[_\s-]?name[_\s-]?1$/i,
  ],
  contact_last_name: [
    /^last[_\s-]?name$/i,
    /^lname$/i,
    /^surname$/i,
    /^family[_\s-]?name$/i,
    /^contact[_\s-]?last[_\s-]?name$/i,
    // Primary/main contact patterns
    /^(?:primary|main)[_\s-]?(?:contact[_\s-]?)?last[_\s-]?name$/i,
    // Numbered contact patterns
    /^contact[_\s-]?1[_\s-]?last[_\s-]?name$/i,
    /^(?:contact[_\s-]?)?last[_\s-]?name[_\s-]?1$/i,
  ],
  contact_email: [
    /^email$/i,
    /^e-?mail$/i,
    /^contact[_\s-]?email$/i,
    /^email[_\s-]?address$/i,
    // Primary/main contact patterns
    /^(?:primary|main)[_\s-]?(?:contact[_\s-]?)?email$/i,
    /^primary[_\s-]?contact[_\s-]?primary[_\s-]?email$/i,  // Close CRM format
    // Numbered contact patterns
    /^contact[_\s-]?1[_\s-]?email$/i,
    /^(?:contact[_\s-]?)?email[_\s-]?1$/i,
  ],
  contact_phone: [
    /^phone$/i,
    /^mobile$/i,
    /^tel$/i,
    /^cell$/i,
    /^telephone$/i,
    /^phone[_\s-]?number$/i,
    /^contact[_\s-]?phone$/i,
    // Primary/main contact patterns
    /^(?:primary|main)[_\s-]?(?:contact[_\s-]?)?phone$/i,
    // Numbered contact patterns
    /^contact[_\s-]?1[_\s-]?phone$/i,
    /^(?:contact[_\s-]?)?phone[_\s-]?1$/i,
  ],
  contact_title: [
    /^title$/i,
    /^job[_\s-]?title$/i,
    /^position$/i,
    /^role$/i,
    /^designation$/i,
    // Primary/main contact patterns
    /^(?:primary|main)[_\s-]?(?:contact[_\s-]?)?(?:job[_\s-]?)?title$/i,
    // Numbered contact patterns
    /^contact[_\s-]?1[_\s-]?(?:job[_\s-]?)?title$/i,
    /^(?:contact[_\s-]?)?(?:job[_\s-]?)?title[_\s-]?1$/i,
  ],
}

// Patterns to detect multiple contact columns with slot indices
const MULTI_CONTACT_PATTERNS: Array<{
  pattern: RegExp
  field: ContactFieldType
  slotExtractor: (match: RegExpMatchArray, header: string) => number
}> = [
  // Primary/main contact patterns -> slot 0
  // Handles: primary_contact_email, primary_contact_first_name, main_contact_phone, etc.
  {
    pattern: /^(?:primary|main)[_\s-]?(?:contact[_\s-]?)?(first[_\s-]?name|last[_\s-]?name|(?:primary[_\s-]?)?e?-?mail|phone|mobile|cell|tel(?:ephone)?|(?:job[_\s-]?)?title)$/i,
    field: 'first_name', // Will be overridden by match
    slotExtractor: () => 0
  },
  // Close CRM format: primary_contact_primary_email, primary_contact_primary_phone, etc.
  {
    pattern: /^(?:primary|main)[_\s-]?contact[_\s-]?(primary[_\s-]?e?-?mail|(?:primary|direct|other)[_\s-]?phones?|mobile|cell)$/i,
    field: 'email',
    slotExtractor: () => 0
  },
  // Secondary/other contact patterns -> slot 1
  {
    pattern: /^(?:secondary|other)[_\s-]?(?:contact[_\s-]?)?(first[_\s-]?name|last[_\s-]?name|(?:primary[_\s-]?)?e?-?mail|phone|mobile|cell|tel(?:ephone)?|(?:job[_\s-]?)?title)$/i,
    field: 'first_name',
    slotExtractor: () => 1
  },
  // Secondary Close CRM format
  {
    pattern: /^(?:secondary|other)[_\s-]?contact[_\s-]?(primary[_\s-]?e?-?mail|(?:primary|direct|other)[_\s-]?phones?|mobile|cell)$/i,
    field: 'email',
    slotExtractor: () => 1
  },
  // Numbered patterns: contact_1_email, contact_2_first_name, etc.
  {
    pattern: /^contact[_\s-]?(\d+)[_\s-]?(first[_\s-]?name|last[_\s-]?name|(?:primary[_\s-]?)?e?-?mail|phone|mobile|cell|tel(?:ephone)?|(?:job[_\s-]?)?title)$/i,
    field: 'first_name',
    slotExtractor: (match) => parseInt(match[1], 10) - 1 // 1-indexed to 0-indexed
  },
  // Numbered patterns: first_name_1, email_2, etc.
  {
    pattern: /^(?:contact[_\s-]?)?(first[_\s-]?name|last[_\s-]?name|e?-?mail|phone|mobile|cell|tel(?:ephone)?|(?:job[_\s-]?)?title)[_\s-]?(\d+)$/i,
    field: 'first_name',
    slotExtractor: (match) => parseInt(match[2], 10) - 1
  },
]

/**
 * Extract the contact field type from a matched header
 */
function extractContactFieldType(fieldMatch: string): ContactFieldType | null {
  const normalized = fieldMatch.toLowerCase().replace(/[\s_-]/g, '')
  if (normalized.includes('firstname')) return 'first_name'
  if (normalized.includes('lastname')) return 'last_name'
  // Email patterns: email, e-mail, primary_email, primaryemail
  if (normalized.includes('mail')) return 'email'
  // Phone patterns: phone, phones, mobile, cell, tel, telephone, primaryphone, otherphones
  if (normalized.includes('phone') || normalized.includes('mobile') ||
      normalized.includes('cell') || normalized === 'tel' ||
      normalized.includes('telephone')) return 'phone'
  if (normalized.includes('title')) return 'title'
  return null
}

/**
 * Detect multiple contact columns from headers and group them by slot
 */
export function detectMultipleContactColumns(headers: string[]): ContactSlot[] {
  const slotMap = new Map<number, ContactSlot>()

  // Track which headers have been assigned to avoid duplicates
  const assignedHeaders = new Set<string>()

  // First pass: detect explicitly indexed columns (contact_1_email, primary_contact_email, etc.)
  for (const header of headers) {
    for (const { pattern, slotExtractor } of MULTI_CONTACT_PATTERNS) {
      const match = header.match(pattern)
      if (match) {
        const slotIndex = slotExtractor(match, header)
        if (slotIndex < 0 || slotIndex >= MAX_CONTACTS_PER_LEAD) continue

        // Extract field type from the match
        const fieldTypeMatch = match[1] || match[2]
        if (!fieldTypeMatch) continue

        const fieldType = extractContactFieldType(fieldTypeMatch)
        if (!fieldType) continue

        // Get or create slot
        if (!slotMap.has(slotIndex)) {
          slotMap.set(slotIndex, {
            slotIndex,
            slotLabel: slotIndex === 0 ? 'Primary Contact' : `Contact ${slotIndex + 1}`,
            fields: {
              first_name: null,
              last_name: null,
              email: null,
              phone: null,
              title: null,
            }
          })
        }

        const slot = slotMap.get(slotIndex)!
        if (slot.fields[fieldType] === null) {
          slot.fields[fieldType] = header
          assignedHeaders.add(header)
        }
        break
      }
    }
  }

  // Second pass: assign generic contact columns to slot 0 (primary) if not yet assigned
  // This handles columns like "first_name", "email", "phone" without prefix/suffix
  const genericPatterns: Array<{ pattern: RegExp; field: ContactFieldType }> = [
    { pattern: /^first[_\s-]?name$/i, field: 'first_name' },
    { pattern: /^fname$/i, field: 'first_name' },
    { pattern: /^given[_\s-]?name$/i, field: 'first_name' },
    { pattern: /^contact[_\s-]?first[_\s-]?name$/i, field: 'first_name' },
    { pattern: /^last[_\s-]?name$/i, field: 'last_name' },
    { pattern: /^lname$/i, field: 'last_name' },
    { pattern: /^surname$/i, field: 'last_name' },
    { pattern: /^family[_\s-]?name$/i, field: 'last_name' },
    { pattern: /^contact[_\s-]?last[_\s-]?name$/i, field: 'last_name' },
    { pattern: /^email$/i, field: 'email' },
    { pattern: /^e-?mail$/i, field: 'email' },
    { pattern: /^contact[_\s-]?email$/i, field: 'email' },
    { pattern: /^email[_\s-]?address$/i, field: 'email' },
    { pattern: /^phone$/i, field: 'phone' },
    { pattern: /^mobile$/i, field: 'phone' },
    { pattern: /^tel$/i, field: 'phone' },
    { pattern: /^cell$/i, field: 'phone' },
    { pattern: /^telephone$/i, field: 'phone' },
    { pattern: /^phone[_\s-]?number$/i, field: 'phone' },
    { pattern: /^contact[_\s-]?phone$/i, field: 'phone' },
    { pattern: /^title$/i, field: 'title' },
    { pattern: /^job[_\s-]?title$/i, field: 'title' },
    { pattern: /^position$/i, field: 'title' },
    { pattern: /^role$/i, field: 'title' },
    { pattern: /^designation$/i, field: 'title' },
  ]

  for (const header of headers) {
    if (assignedHeaders.has(header)) continue

    for (const { pattern, field } of genericPatterns) {
      if (pattern.test(header)) {
        // Ensure slot 0 exists
        if (!slotMap.has(0)) {
          slotMap.set(0, {
            slotIndex: 0,
            slotLabel: 'Primary Contact',
            fields: {
              first_name: null,
              last_name: null,
              email: null,
              phone: null,
              title: null,
            }
          })
        }

        const slot = slotMap.get(0)!
        if (slot.fields[field] === null) {
          slot.fields[field] = header
          assignedHeaders.add(header)
        }
        break
      }
    }
  }

  // Convert map to sorted array
  const slots = Array.from(slotMap.values()).sort((a, b) => a.slotIndex - b.slotIndex)

  // If no slots detected, create an empty primary slot
  if (slots.length === 0) {
    slots.push({
      slotIndex: 0,
      slotLabel: 'Primary Contact',
      fields: {
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
        title: null,
      }
    })
  }

  return slots
}

/**
 * Create an empty contact slot
 */
export function createEmptyContactSlot(slotIndex: number): ContactSlot {
  return {
    slotIndex,
    slotLabel: slotIndex === 0 ? 'Primary Contact' : `Contact ${slotIndex + 1}`,
    fields: {
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      title: null,
    }
  }
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
    contact_first_name: null,
    contact_last_name: null,
    contact_email: null,
    contact_phone: null,
    contact_title: null,
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
      contact_first_name: 0,
      contact_last_name: 0,
      contact_email: 0,
      contact_phone: 0,
      contact_title: 0,
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
 * Transform CSV rows to leads using column mapping (legacy single contact)
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
  // Contact field indexes
  const contactFirstNameIdx = getColumnIndex(mapping.contact_first_name)
  const contactLastNameIdx = getColumnIndex(mapping.contact_last_name)
  const contactEmailIdx = getColumnIndex(mapping.contact_email)
  const contactPhoneIdx = getColumnIndex(mapping.contact_phone)
  const contactTitleIdx = getColumnIndex(mapping.contact_title)

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

    // Get contact fields
    const contact_first_name = contactFirstNameIdx >= 0 ? row[contactFirstNameIdx]?.trim() || null : null
    const contact_last_name = contactLastNameIdx >= 0 ? row[contactLastNameIdx]?.trim() || null : null
    const contact_email = contactEmailIdx >= 0 ? row[contactEmailIdx]?.trim() || null : null
    const contact_phone = contactPhoneIdx >= 0 ? row[contactPhoneIdx]?.trim() || null : null
    const contact_title = contactTitleIdx >= 0 ? row[contactTitleIdx]?.trim() || null : null

    // Build contacts array (for backward compatibility, build from single contact fields)
    const contacts: ContactData[] = []
    if (contact_first_name) {
      contacts.push({
        first_name: contact_first_name,
        last_name: contact_last_name,
        email: contact_email,
        phone: contact_phone,
        title: contact_title,
      })
    }

    // Check if any contact data is present
    const hasContactData = contacts.length > 0

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
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      contact_title,
      contacts,
      hasContactData,
      contactCount: contacts.length,
      isValid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Transform CSV rows to leads using multi-contact column mapping
 */
export function transformToLeadsWithMultipleContacts(
  rows: string[][],
  headers: string[],
  mapping: MultiContactLeadColumnMapping
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

  // Pre-compute contact slot field indexes
  const slotIndexes = mapping.contactSlots.map(slot => ({
    first_name: getColumnIndex(slot.fields.first_name),
    last_name: getColumnIndex(slot.fields.last_name),
    email: getColumnIndex(slot.fields.email),
    phone: getColumnIndex(slot.fields.phone),
    title: getColumnIndex(slot.fields.title),
  }))

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

    // Build contacts array from all slots
    const contacts: ContactData[] = []
    for (const indexes of slotIndexes) {
      const first_name = indexes.first_name >= 0 ? row[indexes.first_name]?.trim() || null : null

      // Only include contact if it has at least a first name
      if (first_name) {
        contacts.push({
          first_name,
          last_name: indexes.last_name >= 0 ? row[indexes.last_name]?.trim() || null : null,
          email: indexes.email >= 0 ? row[indexes.email]?.trim() || null : null,
          phone: indexes.phone >= 0 ? row[indexes.phone]?.trim() || null : null,
          title: indexes.title >= 0 ? row[indexes.title]?.trim() || null : null,
        })
      }
    }

    // Legacy fields from first contact (if exists)
    const firstContact = contacts[0] || null
    const contact_first_name = firstContact?.first_name || null
    const contact_last_name = firstContact?.last_name || null
    const contact_email = firstContact?.email || null
    const contact_phone = firstContact?.phone || null
    const contact_title = firstContact?.title || null

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
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      contact_title,
      contacts,
      hasContactData: contacts.length > 0,
      contactCount: contacts.length,
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
    contact_first_name: null,
    contact_last_name: null,
    contact_email: null,
    contact_phone: null,
    contact_title: null,
  }
}

/**
 * Create an empty multi-contact lead column mapping
 */
export function createEmptyMultiContactLeadMapping(): MultiContactLeadColumnMapping {
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
    contactSlots: [createEmptyContactSlot(0)],
  }
}

/**
 * Validate multi-contact lead mapping
 */
export function validateMultiContactLeadMapping(mapping: MultiContactLeadColumnMapping): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!mapping.name) {
    errors.push('Company name column is required')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Auto-detect multi-contact column mapping for lead fields
 */
export function detectMultiContactLeadColumnMapping(headers: string[]): DetectedMultiContactLeadMapping {
  // First, detect lead fields using existing patterns
  const leadPatterns = LEAD_COLUMN_PATTERNS
  const leadFields: Record<string, { value: string | null; confidence: number }> = {
    name: { value: null, confidence: 0 },
    website: { value: null, confidence: 0 },
    industry: { value: null, confidence: 0 },
    status: { value: null, confidence: 0 },
    notes: { value: null, confidence: 0 },
    address: { value: null, confidence: 0 },
    city: { value: null, confidence: 0 },
    state: { value: null, confidence: 0 },
    country: { value: null, confidence: 0 },
    postal_code: { value: null, confidence: 0 },
    source: { value: null, confidence: 0 },
  }

  // Detect lead fields (excluding contact fields)
  for (const header of headers) {
    for (const [field, patterns] of Object.entries(leadPatterns)) {
      // Skip contact fields - they'll be handled separately
      if (field.startsWith('contact_')) continue

      const fieldKey = field as keyof typeof leadFields
      if (!leadFields[fieldKey]) continue

      for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(header)) {
          const confidence = 1 - (i * 0.1)
          if (confidence > leadFields[fieldKey].confidence) {
            leadFields[fieldKey].value = header
            leadFields[fieldKey].confidence = confidence
          }
          break
        }
      }
    }
  }

  // Detect contact slots
  const contactSlots = detectMultipleContactColumns(headers)

  return {
    name: leadFields.name.value,
    website: leadFields.website.value,
    industry: leadFields.industry.value,
    status: leadFields.status.value,
    notes: leadFields.notes.value,
    address: leadFields.address.value,
    city: leadFields.city.value,
    state: leadFields.state.value,
    country: leadFields.country.value,
    postal_code: leadFields.postal_code.value,
    source: leadFields.source.value,
    contactSlots,
    confidence: {
      name: leadFields.name.confidence,
      website: leadFields.website.confidence,
      industry: leadFields.industry.confidence,
      status: leadFields.status.confidence,
      notes: leadFields.notes.confidence,
      address: leadFields.address.confidence,
      city: leadFields.city.confidence,
      state: leadFields.state.confidence,
      country: leadFields.country.confidence,
      postal_code: leadFields.postal_code.confidence,
      source: leadFields.source.confidence,
    },
  }
}

/**
 * Convert legacy LeadColumnMapping to MultiContactLeadColumnMapping
 */
export function convertToMultiContactMapping(mapping: LeadColumnMapping): MultiContactLeadColumnMapping {
  return {
    name: mapping.name,
    website: mapping.website,
    industry: mapping.industry,
    status: mapping.status,
    notes: mapping.notes,
    address: mapping.address,
    city: mapping.city,
    state: mapping.state,
    country: mapping.country,
    postal_code: mapping.postal_code,
    source: mapping.source,
    contactSlots: [{
      slotIndex: 0,
      slotLabel: 'Primary Contact',
      fields: {
        first_name: mapping.contact_first_name,
        last_name: mapping.contact_last_name,
        email: mapping.contact_email,
        phone: mapping.contact_phone,
        title: mapping.contact_title,
      }
    }],
  }
}
