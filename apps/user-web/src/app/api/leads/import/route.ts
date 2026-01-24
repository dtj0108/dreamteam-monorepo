import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import {
  checkLeadDuplicate,
  type ExistingLead,
} from '@/lib/lead-duplicate-detector'

interface ImportLead {
  name: string
  website?: string | null
  industry?: string | null
  status?: string | null
  notes?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  postal_code?: string | null
  source?: string | null
}

interface ImportRequest {
  leads: ImportLead[]
  skip_duplicates?: boolean
  pipeline_id?: string
  stage_id?: string
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

    // For session auth, we need a userId to set as lead owner
    // For API key auth, we'll need to handle this differently (perhaps a default user or the workspace owner)
    let ownerId = userId

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    } else {
      // API key auth - get workspace owner as the lead owner
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
      return NextResponse.json({ error: 'Could not determine lead owner' }, { status: 400 })
    }

    const body: ImportRequest = await request.json()

    if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
      return NextResponse.json(
        { error: 'At least one lead is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get default pipeline and stage if not provided
    let finalPipelineId = body.pipeline_id
    let finalStageId = body.stage_id

    if (!finalPipelineId) {
      const { data: defaultPipeline } = await supabase
        .from('lead_pipelines')
        .select(`
          id,
          stages:lead_pipeline_stages(id, name, position)
        `)
        .eq('user_id', ownerId)
        .eq('is_default', true)
        .single()

      if (defaultPipeline) {
        finalPipelineId = defaultPipeline.id
        const stages = defaultPipeline.stages as { id: string; name: string; position: number }[]
        if (stages && stages.length > 0 && !finalStageId) {
          const sortedStages = stages.sort((a, b) => a.position - b.position)
          finalStageId = sortedStages[0].id
        }
      }
    } else if (!finalStageId) {
      // Pipeline specified but no stage - get the first stage
      const { data: stages } = await supabase
        .from('lead_pipeline_stages')
        .select('id, name')
        .eq('pipeline_id', finalPipelineId)
        .order('position', { ascending: true })
        .limit(1)

      if (stages && stages.length > 0) {
        finalStageId = stages[0].id
      }
    }

    // Handle duplicate detection if enabled (default: true)
    const skipDuplicates = body.skip_duplicates !== false
    let leadsToInsert = body.leads
    let skippedDuplicates = 0

    if (skipDuplicates) {
      // Fetch existing leads for comparison
      const { data: existingLeadsData } = await supabase
        .from('leads')
        .select('id, name, website')
        .eq('workspace_id', workspaceId)

      const existingLeads: ExistingLead[] = (existingLeadsData || []).map((lead: { id: string; name: string | null; website: string | null }) => ({
        id: lead.id,
        name: lead.name || '',
        website: lead.website,
      }))

      leadsToInsert = body.leads.filter((lead) => {
        const result = checkLeadDuplicate(
          { name: lead.name, website: lead.website || null },
          existingLeads
        )
        if (result.isDuplicate) {
          skippedDuplicates++
          return false
        }
        return true
      })
    }

    // Prepare leads for insert
    const formattedLeads = leadsToInsert
      .filter((lead) => lead.name && lead.name.trim()) // Filter out leads without names
      .map((lead) => ({
        user_id: ownerId,
        workspace_id: workspaceId,
        name: lead.name.trim(),
        website: lead.website?.trim() || null,
        industry: lead.industry?.trim() || null,
        status: lead.status?.trim()?.toLowerCase().replace(/\s+/g, '_') || 'new',
        notes: lead.notes?.trim() || null,
        address: lead.address?.trim() || null,
        city: lead.city?.trim() || null,
        state: lead.state?.trim() || null,
        country: lead.country?.trim() || null,
        postal_code: lead.postal_code?.trim() || null,
        source: lead.source?.trim() || null,
        pipeline_id: finalPipelineId || null,
        stage_id: finalStageId || null,
      }))

    // Insert leads in batches
    const BATCH_SIZE = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < formattedLeads.length; i += BATCH_SIZE) {
      const batch = formattedLeads.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('leads')
        .insert(batch)
        .select()

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        insertedCount += data?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      imported: insertedCount,
      total: body.leads.length,
      failed: body.leads.length - insertedCount - skippedDuplicates,
      skipped_duplicates: skippedDuplicates,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}
