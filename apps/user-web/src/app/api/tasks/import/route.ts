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

interface ImportTask {
  lead_name: string           // Required - to match to lead
  title: string               // Required
  description?: string | null
  due_date?: string | null
}

interface ImportRequest {
  tasks: ImportTask[]
  skip_unmatched?: boolean    // Default: true - skip tasks that can't be matched to a lead
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

    // For tasks, we need a user_id for the owner
    let ownerId = userId

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    } else {
      // API key auth - get workspace owner as the task owner
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
      return NextResponse.json({ error: 'Could not determine task owner' }, { status: 400 })
    }

    const body: ImportRequest = await request.json()

    if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json(
        { error: 'At least one task is required' },
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

    // Get unique lead names from tasks
    const uniqueLeadNames = getUniqueLeadNames(body.tasks.map((t) => t.lead_name))

    // Match lead names to existing leads
    const fuzzyThreshold = body.fuzzy_threshold ?? 85
    const matchResults = matchLeadsByName(uniqueLeadNames, existingLeads, fuzzyThreshold)
    const matchMap = buildLeadMatchMap(matchResults)

    // Process tasks
    const skipUnmatched = body.skip_unmatched !== false
    const tasksToInsert: {
      lead_id: string
      user_id: string
      title: string
      description: string | null
      due_date: string | null
    }[] = []
    const unmatchedLeads = new Set<string>()
    let skippedUnmatched = 0

    for (const task of body.tasks) {
      // Validate required fields
      if (!task.title?.trim()) {
        continue // Skip tasks without title
      }

      // Find the lead match
      const matchKey = task.lead_name?.toLowerCase().trim() || ''
      const matchResult = matchMap.get(matchKey)

      if (!matchResult?.matchedLead) {
        unmatchedLeads.add(task.lead_name || 'Unknown')
        if (skipUnmatched) {
          skippedUnmatched++
          continue
        }
        // If not skipping unmatched, we can't insert (no lead_id)
        skippedUnmatched++
        continue
      }

      tasksToInsert.push({
        lead_id: matchResult.matchedLead.id,
        user_id: ownerId,
        title: task.title.trim(),
        description: task.description?.trim() || null,
        due_date: task.due_date || null,
      })
    }

    // Insert tasks in batches
    const BATCH_SIZE = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < tasksToInsert.length; i += BATCH_SIZE) {
      const batch = tasksToInsert.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('lead_tasks')
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
      total: body.tasks.length,
      failed: body.tasks.length - insertedCount - skippedUnmatched,
      skipped_unmatched: skippedUnmatched,
      errors: errors.length > 0 ? errors : undefined,
      unmatched_leads: unmatchedLeads.size > 0 ? Array.from(unmatchedLeads) : undefined,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import tasks' },
      { status: 500 }
    )
  }
}
