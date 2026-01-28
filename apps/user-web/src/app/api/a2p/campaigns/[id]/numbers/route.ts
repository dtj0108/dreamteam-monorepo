import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentWorkspaceId } from '@/lib/workspace-utils'

// GET /api/a2p/campaigns/[id]/numbers - List phone numbers for campaign
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Fetch phone numbers
    const { data: numbers, error } = await supabase
      .from('a2p_campaign_phone_numbers')
      .select(
        `
        *,
        phone_number:twilio_numbers(
          id,
          phone_number,
          friendly_name
        )
      `
      )
      .eq('campaign_id', id)

    if (error) {
      console.error('Failed to fetch campaign numbers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaign numbers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ numbers: numbers || [] })
  } catch (error) {
    console.error('Error fetching campaign numbers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign numbers' },
      { status: 500 }
    )
  }
}

// POST /api/a2p/campaigns/[id]/numbers - Assign phone number to campaign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await req.json()
    const { phone_number_id } = body

    if (!phone_number_id) {
      return NextResponse.json(
        { error: 'Phone number ID is required' },
        { status: 400 }
      )
    }

    // Verify campaign belongs to workspace
    const { data: campaign } = await supabase
      .from('a2p_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Note: For now we allow assigning numbers to any campaign status
    // In production, you may want to require approved campaigns:
    // if (campaign.status !== 'approved') {
    //   return NextResponse.json(
    //     { error: 'Campaign must be approved before assigning phone numbers' },
    //     { status: 400 }
    //   )
    // }

    // Verify phone number exists and belongs to workspace
    const { data: phoneNumber } = await supabase
      .from('twilio_numbers')
      .select('id, workspace_id')
      .eq('id', phone_number_id)
      .single()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      )
    }

    // Verify phone number belongs to workspace (if workspace_id column exists)
    if (phoneNumber.workspace_id && phoneNumber.workspace_id !== workspaceId) {
      return NextResponse.json(
        { error: 'Phone number does not belong to this workspace' },
        { status: 403 }
      )
    }

    // Check if phone number is already assigned to another campaign
    const { data: existingAssignment } = await supabase
      .from('a2p_campaign_phone_numbers')
      .select(
        `
        id,
        campaign:a2p_campaigns(campaign_name)
      `
      )
      .eq('phone_number_id', phone_number_id)
      .single()

    if (existingAssignment) {
      const otherCampaignName =
        (existingAssignment.campaign as unknown as { campaign_name: string })
          ?.campaign_name || 'another campaign'
      return NextResponse.json(
        {
          error: `Phone number is already assigned to ${otherCampaignName}. Unassign it first.`,
        },
        { status: 400 }
      )
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('a2p_campaign_phone_numbers')
      .insert({
        campaign_id: id,
        phone_number_id: phone_number_id,
        status: 'pending',
      })
      .select(
        `
        *,
        phone_number:twilio_numbers(
          id,
          phone_number,
          friendly_name
        )
      `
      )
      .single()

    if (error) {
      console.error('Failed to assign phone number:', error)
      return NextResponse.json(
        { error: 'Failed to assign phone number' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, assignment })
  } catch (error) {
    console.error('Error assigning phone number:', error)
    return NextResponse.json(
      { error: 'Failed to assign phone number' },
      { status: 500 }
    )
  }
}
