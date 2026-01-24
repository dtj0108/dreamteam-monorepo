import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { getAddOnsSummary } from '@/lib/addons-queries'

/**
 * GET /api/addons/summary
 * Get quick summary of all add-ons (for sidebar badges, etc.)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const summary = await getAddOnsSummary(workspaceId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching add-ons summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch add-ons summary' },
      { status: 500 }
    )
  }
}
