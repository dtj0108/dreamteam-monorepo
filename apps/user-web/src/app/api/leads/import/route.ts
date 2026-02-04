import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import {
  checkLeadDuplicate,
  type ExistingLead,
} from '@/lib/lead-duplicate-detector'

interface ImportContact {
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  title?: string | null
}

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
  // Legacy single contact fields (optional, for backward compatibility)
  contact_first_name?: string | null
  contact_last_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_title?: string | null
  // NEW: Multiple contacts array
  contacts?: ImportContact[]
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

    // Track leads that are duplicates but have contact data (we'll add contacts to existing leads)
    const duplicateLeadsWithContacts: Array<{ existingLeadId: string; lead: ImportLead }> = []

    // Fetch existing leads for comparison (needed for both duplicate detection and contact addition)
    const { data: existingLeadsData } = await supabase
      .from('leads')
      .select('id, name, website')
      .eq('workspace_id', workspaceId)

    const existingLeads: ExistingLead[] = (existingLeadsData || []).map((lead: { id: string; name: string | null; website: string | null }) => ({
      id: lead.id,
      name: lead.name || '',
      website: lead.website,
    }))

    // Helper to check if a lead has any contact data
    const hasContactData = (lead: ImportLead): boolean => {
      // Check new contacts array format
      if (lead.contacts && Array.isArray(lead.contacts)) {
        return lead.contacts.some(c => c.first_name?.trim())
      }
      // Check legacy single contact fields
      return !!lead.contact_first_name?.trim()
    }

    if (skipDuplicates) {
      leadsToInsert = body.leads.filter((lead) => {
        const result = checkLeadDuplicate(
          { name: lead.name, website: lead.website || null },
          existingLeads
        )
        if (result.isDuplicate) {
          skippedDuplicates++
          // If this duplicate lead has contact data, save it so we can add contact to existing lead
          if (hasContactData(lead) && result.matchedLead) {
            duplicateLeadsWithContacts.push({
              existingLeadId: result.matchedLead.id,
              lead,
            })
          }
          return false
        }
        return true
      })
    }

    // Prepare leads for insert, preserving original lead data for contact creation
    const validLeads = leadsToInsert.filter((lead) => lead.name && lead.name.trim())
    const formattedLeads = validLeads.map((lead) => ({
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
    const insertedLeadIds: string[] = [] // Track IDs for contact creation

    for (let i = 0; i < formattedLeads.length; i += BATCH_SIZE) {
      const batch = formattedLeads.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('leads')
        .insert(batch)
        .select('id')

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else if (data) {
        insertedCount += data.length
        insertedLeadIds.push(...data.map((d: { id: string }) => d.id))
      }
    }

    // Create contacts for newly inserted leads that have contact data
    let contactsCreated = 0
    let contactsForExistingLeads = 0

    const contactsToInsert: Array<{
      lead_id: string
      workspace_id: string
      first_name: string
      last_name: string | null
      email: string | null
      phone: string | null
      title: string | null
    }> = []

    // Helper function to extract contacts from a lead (handles both legacy and array format)
    const extractContacts = (lead: ImportLead): ImportContact[] => {
      const contacts: ImportContact[] = []

      // First, check for new contacts array format
      if (lead.contacts && Array.isArray(lead.contacts)) {
        for (const contact of lead.contacts) {
          if (contact.first_name?.trim()) {
            contacts.push({
              first_name: contact.first_name.trim(),
              last_name: contact.last_name?.trim() || null,
              email: contact.email?.trim() || null,
              phone: contact.phone?.trim() || null,
              title: contact.title?.trim() || null,
            })
          }
        }
      }

      // Fall back to legacy single contact fields if no contacts array provided
      // Only if the array is empty (to avoid duplicates)
      if (contacts.length === 0 && lead.contact_first_name?.trim()) {
        contacts.push({
          first_name: lead.contact_first_name.trim(),
          last_name: lead.contact_last_name?.trim() || null,
          email: lead.contact_email?.trim() || null,
          phone: lead.contact_phone?.trim() || null,
          title: lead.contact_title?.trim() || null,
        })
      }

      return contacts
    }

    // Add contacts for newly created leads
    for (let i = 0; i < insertedLeadIds.length; i++) {
      const originalLead = validLeads[i]
      const leadId = insertedLeadIds[i]

      if (!originalLead || !leadId) continue

      const contacts = extractContacts(originalLead)
      for (const contact of contacts) {
        contactsToInsert.push({
          lead_id: leadId,
          workspace_id: workspaceId,
          first_name: contact.first_name,
          last_name: contact.last_name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          title: contact.title || null,
        })
      }
    }

    // Add contacts for existing leads (duplicates with contact data)
    for (const { existingLeadId, lead } of duplicateLeadsWithContacts) {
      const contacts = extractContacts(lead)
      for (const contact of contacts) {
        contactsToInsert.push({
          lead_id: existingLeadId,
          workspace_id: workspaceId,
          first_name: contact.first_name,
          last_name: contact.last_name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          title: contact.title || null,
        })
      }
    }

    // Insert contacts in batches
    if (contactsToInsert.length > 0) {
      for (let i = 0; i < contactsToInsert.length; i += BATCH_SIZE) {
        const batch = contactsToInsert.slice(i, i + BATCH_SIZE)

        const { data, error } = await supabase
          .from('contacts')
          .insert(batch)
          .select('id')

        if (error) {
          errors.push(`Contact batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        } else if (data) {
          contactsCreated += data.length
        }
      }

      // Count contacts added to existing leads (duplicates)
      contactsForExistingLeads = duplicateLeadsWithContacts.reduce((count, { lead }) => {
        return count + extractContacts(lead).length
      }, 0)
    }

    return NextResponse.json({
      success: true,
      imported: insertedCount,
      total: body.leads.length,
      failed: body.leads.length - insertedCount - skippedDuplicates,
      skipped_duplicates: skippedDuplicates,
      contacts_created: contactsCreated,
      contacts_for_existing_leads: contactsForExistingLeads,
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
