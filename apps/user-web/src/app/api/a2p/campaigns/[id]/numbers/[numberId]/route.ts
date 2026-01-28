import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentWorkspaceId } from '@/lib/workspace-utils'

// DELETE /api/a2p/campaigns/[id]/numbers/[numberId] - Unassign phone number from campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; numberId: string }> }
) {
  try {
    const { id, numberId } = await params
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 400 }
      )
    }

    // Verify campaign belongs to workspace
    const { data: campaign } = await supabase
      .from('a2p_campaigns')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Delete assignment
    const { error } = await supabase
      .from('a2p_campaign_phone_numbers')
      .delete()
      .eq('campaign_id', id)
      .eq('phone_number_id', numberId)

    if (error) {
      console.error('Failed to unassign phone number:', error)
      return NextResponse.json(
        { error: 'Failed to unassign phone number' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning phone number:', error)
    return NextResponse.json(
      { error: 'Failed to unassign phone number' },
      { status: 500 }
    )
  }
}
