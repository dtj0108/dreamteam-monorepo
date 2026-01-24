/**
 * Lead Duplicate Detection Utility
 *
 * Uses name + website domain matching:
 * - Exact name + same domain = definite duplicate
 * - Similar name (85%+) + same domain = likely duplicate
 * - Exact name only (no websites) = possible duplicate
 */

import { calculateSimilarity } from './duplicate-detector'

export { calculateSimilarity }

export interface LeadForComparison {
  name: string
  website: string | null
}

export interface ExistingLead extends LeadForComparison {
  id: string
}

export type MatchReason = 'exact_name_and_domain' | 'similar_name_and_domain' | 'exact_name' | null

export interface LeadDuplicateCheckResult {
  isDuplicate: boolean
  similarity: number
  matchReason: MatchReason
  matchedLead: ExistingLead | null
}

/**
 * Normalize a company name for comparison
 * - Lowercase
 * - Remove common suffixes (Inc, LLC, Ltd, Corp, etc.)
 * - Remove punctuation
 * - Trim whitespace
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return ''

  let normalized = name.toLowerCase().trim()

  // Remove common business suffixes
  const suffixes = [
    /,?\s+(inc\.?|incorporated)$/i,
    /,?\s+(llc|l\.l\.c\.)$/i,
    /,?\s+(ltd\.?|limited)$/i,
    /,?\s+(corp\.?|corporation)$/i,
    /,?\s+(co\.?|company)$/i,
    /,?\s+(plc|p\.l\.c\.)$/i,
    /,?\s+(gmbh)$/i,
    /,?\s+(ag)$/i,
    /,?\s+(sa|s\.a\.)$/i,
    /,?\s+(pty\.?\s*ltd\.?)$/i,
    /,?\s+(pvt\.?\s*ltd\.?)$/i,
  ]

  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, '')
  }

  // Remove punctuation except spaces
  normalized = normalized.replace(/[^\w\s]/g, '')

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Extract domain from a URL or website string
 * - Handles full URLs (https://www.example.com/path)
 * - Handles partial URLs (www.example.com)
 * - Handles bare domains (example.com)
 * - Removes www prefix
 */
export function extractDomain(url: string | null): string | null {
  if (!url || !url.trim()) return null

  let domain = url.trim().toLowerCase()

  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '')

  // Remove path and query string
  domain = domain.split('/')[0]
  domain = domain.split('?')[0]
  domain = domain.split('#')[0]

  // Remove www prefix
  domain = domain.replace(/^www\./, '')

  // Remove port number
  domain = domain.split(':')[0]

  // Basic validation - must have at least one dot
  if (!domain.includes('.')) return null

  // Must not be empty
  if (!domain) return null

  return domain
}

/**
 * Check if a single lead is a duplicate of any existing lead
 */
export function checkLeadDuplicate(
  newLead: LeadForComparison,
  existingLeads: ExistingLead[],
  similarityThreshold: number = 85
): LeadDuplicateCheckResult {
  const normalizedNewName = normalizeCompanyName(newLead.name)
  const newDomain = extractDomain(newLead.website)

  if (!normalizedNewName) {
    return {
      isDuplicate: false,
      similarity: 0,
      matchReason: null,
      matchedLead: null,
    }
  }

  for (const existing of existingLeads) {
    const normalizedExistingName = normalizeCompanyName(existing.name)
    const existingDomain = extractDomain(existing.website)

    // Exact name + same domain = definite duplicate
    if (
      normalizedNewName === normalizedExistingName &&
      newDomain &&
      existingDomain &&
      newDomain === existingDomain
    ) {
      return {
        isDuplicate: true,
        similarity: 100,
        matchReason: 'exact_name_and_domain',
        matchedLead: existing,
      }
    }

    // Similar name (>= threshold) + same domain = likely duplicate
    if (newDomain && existingDomain && newDomain === existingDomain) {
      const nameSimilarity = calculateSimilarity(normalizedNewName, normalizedExistingName)
      if (nameSimilarity >= similarityThreshold) {
        return {
          isDuplicate: true,
          similarity: nameSimilarity,
          matchReason: 'similar_name_and_domain',
          matchedLead: existing,
        }
      }
    }

    // Exact name only (when neither has a website) = possible duplicate
    if (normalizedNewName === normalizedExistingName && !newDomain && !existingDomain) {
      return {
        isDuplicate: true,
        similarity: 100,
        matchReason: 'exact_name',
        matchedLead: existing,
      }
    }
  }

  return {
    isDuplicate: false,
    similarity: 0,
    matchReason: null,
    matchedLead: null,
  }
}

/**
 * Check multiple leads for duplicates
 */
export function checkLeadsForDuplicates(
  newLeads: LeadForComparison[],
  existingLeads: ExistingLead[],
  similarityThreshold: number = 85
): LeadDuplicateCheckResult[] {
  return newLeads.map((lead) => checkLeadDuplicate(lead, existingLeads, similarityThreshold))
}
