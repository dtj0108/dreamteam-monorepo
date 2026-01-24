import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import {
  matchLeadsByName,
  getUniqueLeadNames,
  buildLeadMatchMap,
  type ExistingLeadForMatching,
} from '@/lib/lead-matcher'

interface ImportContact {
  lead_name: string           // Required - to match to lead
  first_name: string          // Required
  last_name?: string | null
  email?: string | null
  phone?: string | null
  title?: string | null
  notes?: string | null
}

interface ImportRequest {
  contacts: ImportContact[]
  skip_unmatched?: boolean    // Default: true - skip contacts that can't be matched to a lead
  fuzzy_threshold?: number    // Threshold for fuzzy matching (default: 85)
}

interface ImportResult {
  success: boolean
  imported: number
  total: number
  failed: number
  skipped_unmatched: number
  errors?: string[]
  unmatched_leads?: string[]
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = auth.type === 'api_key' ? null : auth.userId
    const workspaceId = auth.type === 'api_key'
      ? auth.workspaceId
      : await getCurrentWorkspaceId(auth.userId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    // Validate workspace access for session auth
    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    const body: ImportRequest = await request.json()

    if (!body.contacts || !Array.isArray(body.contacts) || body.contacts.length === 0) {
      return NextResponse.json(
        { error: 'At least one contact is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get all existing leads in the workspace
    const { data: existingLeadsData } = await supabase
      .from('leads')
      .select('id, name')
      .eq('workspace_id', workspaceId)

    const existingLeads: ExistingLeadForMatching[] = (existingLeadsData || []).map((lead: { id: string; name: string | null }) => ({
      id: lead.id,
      name: lead.name || '',
    }))

    // Get unique lead names from contacts
    const uniqueLeadNames = getUniqueLeadNames(body.contacts.map((c) => c.lead_name))

    // Match lead names to existing leads
    const fuzzyThreshold = body.fuzzy_threshold ?? 85
    const matchResults = matchLeadsByName(uniqueLeadNames, existingLeads, fuzzyThreshold)
    const matchMap = buildLeadMatchMap(matchResults)

    // Process contacts
    const skipUnmatched = body.skip_unmatched !== false
    const contactsToInsert: { lead_id: string; first_name: string; last_name?: string | null; email?: string | null; phone?: string | null; title?: string | null; notes?: string | null }[] = []
    const unmatchedLeads = new Set<string>()
    let skippedUnmatched = 0

    for (const contact of body.contacts) {
      // Validate required fields
      if (!contact.first_name?.trim()) {
        continue // Skip contacts without first name
      }

      // Find the lead match
      const matchKey = contact.lead_name?.toLowerCase().trim() || ''
      const matchResult = matchMap.get(matchKey)

      if (!matchResult?.matchedLead) {
        unmatchedLeads.add(contact.lead_name || 'Unknown')
        if (skipUnmatched) {
          skippedUnmatched++
          continue
        }
        // If not skipping unmatched, we can't insert (no lead_id)
        skippedUnmatched++
        continue
      }

      contactsToInsert.push({
        lead_id: matchResult.matchedLead.id,
        first_name: contact.first_name.trim(),
        last_name: contact.last_name?.trim() || null,
        email: contact.email?.trim() || null,
        phone: contact.phone?.trim() || null,
        title: contact.title?.trim() || null,
        notes: contact.notes?.trim() || null,
      })
    }

    // Insert contacts in batches
    const BATCH_SIZE = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < contactsToInsert.length; i += BATCH_SIZE) {
      const batch = contactsToInsert.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('contacts')
        .insert(batch)
        .select()

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        insertedCount += data?.length || 0
      }
    }

    const result: ImportResult = {
      success: true,
      imported: insertedCount,
      total: body.contacts.length,
      failed: body.contacts.length - insertedCount - skippedUnmatched,
      skipped_unmatched: skippedUnmatched,
      errors: errors.length > 0 ? errors : undefined,
      unmatched_leads: unmatchedLeads.size > 0 ? Array.from(unmatchedLeads) : undefined,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import contacts' },
      { status: 500 }
    )
  }
}
