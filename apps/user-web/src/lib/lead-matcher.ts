/**
 * Lead Matcher Utility
 *
 * Matches CSV lead/company names to existing leads in the database.
 * Used when importing contacts, opportunities, and tasks that need to be
 * linked to existing leads.
 */

import { normalizeCompanyName, calculateSimilarity } from './lead-duplicate-detector'

export interface ExistingLeadForMatching {
  id: string
  name: string
}

export type MatchType = 'exact' | 'fuzzy' | 'none'

export interface LeadMatchResult {
  csvLeadName: string
  matchedLead: ExistingLeadForMatching | null
  confidence: number  // 0-100
  matchType: MatchType
}

/**
 * Match a single CSV lead name to existing leads
 */
export function matchLeadByName(
  csvLeadName: string,
  existingLeads: ExistingLeadForMatching[],
  fuzzyThreshold: number = 85
): LeadMatchResult {
  if (!csvLeadName || !csvLeadName.trim()) {
    return {
      csvLeadName,
      matchedLead: null,
      confidence: 0,
      matchType: 'none',
    }
  }

  const normalizedCsvName = normalizeCompanyName(csvLeadName)

  if (!normalizedCsvName) {
    return {
      csvLeadName,
      matchedLead: null,
      confidence: 0,
      matchType: 'none',
    }
  }

  // First, try exact match (after normalization)
  for (const lead of existingLeads) {
    const normalizedLeadName = normalizeCompanyName(lead.name)
    if (normalizedCsvName === normalizedLeadName) {
      return {
        csvLeadName,
        matchedLead: lead,
        confidence: 100,
        matchType: 'exact',
      }
    }
  }

  // Second, try fuzzy match
  let bestMatch: ExistingLeadForMatching | null = null
  let bestSimilarity = 0

  for (const lead of existingLeads) {
    const normalizedLeadName = normalizeCompanyName(lead.name)
    const similarity = calculateSimilarity(normalizedCsvName, normalizedLeadName)

    if (similarity > bestSimilarity && similarity >= fuzzyThreshold) {
      bestSimilarity = similarity
      bestMatch = lead
    }
  }

  if (bestMatch) {
    return {
      csvLeadName,
      matchedLead: bestMatch,
      confidence: bestSimilarity,
      matchType: 'fuzzy',
    }
  }

  return {
    csvLeadName,
    matchedLead: null,
    confidence: 0,
    matchType: 'none',
  }
}

/**
 * Match multiple CSV lead names to existing leads
 */
export function matchLeadsByName(
  csvLeadNames: string[],
  existingLeads: ExistingLeadForMatching[],
  fuzzyThreshold: number = 85
): LeadMatchResult[] {
  return csvLeadNames.map((name) => matchLeadByName(name, existingLeads, fuzzyThreshold))
}

/**
 * Get unique lead names from a list (for batch matching)
 */
export function getUniqueLeadNames(leadNames: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const name of leadNames) {
    if (name && name.trim()) {
      const normalized = name.trim().toLowerCase()
      if (!seen.has(normalized)) {
        seen.add(normalized)
        unique.push(name.trim())
      }
    }
  }

  return unique
}

/**
 * Build a lookup map from match results for quick access
 */
export function buildLeadMatchMap(
  matchResults: LeadMatchResult[]
): Map<string, LeadMatchResult> {
  const map = new Map<string, LeadMatchResult>()

  for (const result of matchResults) {
    // Store by both original name and normalized name
    map.set(result.csvLeadName.toLowerCase().trim(), result)
  }

  return map
}

/**
 * Get match statistics
 */
export function getMatchStats(matchResults: LeadMatchResult[]): {
  total: number
  matched: number
  unmatched: number
  exactMatches: number
  fuzzyMatches: number
} {
  const matched = matchResults.filter((r) => r.matchedLead !== null)
  const exactMatches = matchResults.filter((r) => r.matchType === 'exact')
  const fuzzyMatches = matchResults.filter((r) => r.matchType === 'fuzzy')

  return {
    total: matchResults.length,
    matched: matched.length,
    unmatched: matchResults.length - matched.length,
    exactMatches: exactMatches.length,
    fuzzyMatches: fuzzyMatches.length,
  }
}
