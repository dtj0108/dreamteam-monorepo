import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import {
  checkLeadsForDuplicates,
  type ExistingLead,
  type LeadDuplicateCheckResult,
} from '@/lib/lead-duplicate-detector'

interface CheckDuplicatesRequest {
  leads: { name: string; website: string | null }[]
}

interface CheckDuplicatesResponse {
  results: LeadDuplicateCheckResult[]
  duplicateCount: number
  totalChecked: number
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

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    const body: CheckDuplicatesRequest = await request.json()

    if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
      return NextResponse.json(
        { error: 'At least one lead is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch all existing leads in the workspace for comparison
    const { data: existingLeadsData, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, website')
      .eq('workspace_id', workspaceId)

    if (fetchError) {
      console.error('Error fetching existing leads:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch existing leads' }, { status: 500 })
    }

    const existingLeads: ExistingLead[] = (existingLeadsData || []).map((lead: { id: string; name: string | null; website: string | null }) => ({
      id: lead.id,
      name: lead.name || '',
      website: lead.website,
    }))

    // Check for duplicates
    const results = checkLeadsForDuplicates(body.leads, existingLeads)
    const duplicateCount = results.filter((r) => r.isDuplicate).length

    const response: CheckDuplicatesResponse = {
      results,
      duplicateCount,
      totalChecked: body.leads.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Check duplicates error:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    )
  }
}
