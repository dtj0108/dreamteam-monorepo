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

interface ImportOpportunity {
  lead_name: string           // Required - to match to lead
  name: string                // Required - opportunity/deal name
  value?: number | null
  probability?: number | null
  expected_close_date?: string | null
  status?: string | null      // active, won, lost
  notes?: string | null
}

interface ImportRequest {
  opportunities: ImportOpportunity[]
  skip_unmatched?: boolean    // Default: true - skip opportunities that can't be matched to a lead
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

    // For opportunities, we need a user_id for the owner
    let ownerId = userId

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    } else {
      // API key auth - get workspace owner as the opportunity owner
      const supabaseForOwner = createAdminClient()
      const { data: workspace } = await supabaseForOwner
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single()

      if (workspace?.owner_id) {
        ownerId = workspace.owner_id
      }
    }

    if (!ownerId) {
      return NextResponse.json({ error: 'Could not determine opportunity owner' }, { status: 400 })
    }

    const body: ImportRequest = await request.json()

    if (!body.opportunities || !Array.isArray(body.opportunities) || body.opportunities.length === 0) {
      return NextResponse.json(
        { error: 'At least one opportunity is required' },
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

    // Get unique lead names from opportunities
    const uniqueLeadNames = getUniqueLeadNames(body.opportunities.map((o) => o.lead_name))

    // Match lead names to existing leads
    const fuzzyThreshold = body.fuzzy_threshold ?? 85
    const matchResults = matchLeadsByName(uniqueLeadNames, existingLeads, fuzzyThreshold)
    const matchMap = buildLeadMatchMap(matchResults)

    // Process opportunities
    const skipUnmatched = body.skip_unmatched !== false
    const opportunitiesToInsert: {
      lead_id: string
      user_id: string
      workspace_id: string
      name: string
      value: number | null
      probability: number
      expected_close_date: string | null
      status: string
      notes: string | null
    }[] = []
    const unmatchedLeads = new Set<string>()
    let skippedUnmatched = 0

    for (const opportunity of body.opportunities) {
      // Validate required fields
      if (!opportunity.name?.trim()) {
        continue // Skip opportunities without name
      }

      // Find the lead match
      const matchKey = opportunity.lead_name?.toLowerCase().trim() || ''
      const matchResult = matchMap.get(matchKey)

      if (!matchResult?.matchedLead) {
        unmatchedLeads.add(opportunity.lead_name || 'Unknown')
        if (skipUnmatched) {
          skippedUnmatched++
          continue
        }
        // If not skipping unmatched, we can't insert (no lead_id)
        skippedUnmatched++
        continue
      }

      // Normalize status
      let status = 'active'
      if (opportunity.status) {
        const lower = opportunity.status.toLowerCase().trim()
        if (['won', 'closed won', 'success'].includes(lower)) {
          status = 'won'
        } else if (['lost', 'closed lost', 'failed'].includes(lower)) {
          status = 'lost'
        }
      }

      // Default probability
      let probability = opportunity.probability ?? 50
      if (probability < 0) probability = 0
      if (probability > 100) probability = 100

      opportunitiesToInsert.push({
        lead_id: matchResult.matchedLead.id,
        user_id: ownerId,
        workspace_id: workspaceId,
        name: opportunity.name.trim(),
        value: opportunity.value ?? null,
        probability,
        expected_close_date: opportunity.expected_close_date || null,
        status,
        notes: opportunity.notes?.trim() || null,
      })
    }

    // Insert opportunities in batches
    const BATCH_SIZE = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < opportunitiesToInsert.length; i += BATCH_SIZE) {
      const batch = opportunitiesToInsert.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('lead_opportunities')
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
      total: body.opportunities.length,
      failed: body.opportunities.length - insertedCount - skippedUnmatched,
      skipped_unmatched: skippedUnmatched,
      errors: errors.length > 0 ? errors : undefined,
      unmatched_leads: unmatchedLeads.size > 0 ? Array.from(unmatchedLeads) : undefined,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import opportunities' },
      { status: 500 }
    )
  }
}
