import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentWorkspaceId } from '@/lib/workspace-utils'
import { UpdateCampaignInput } from '@/types/a2p'
import { z } from 'zod'

// Validation schema for updates (all fields optional)
const updateCampaignSchema = z.object({
  campaign_name: z.string().min(1).max(100).optional(),
  use_case: z
    .enum([
      'marketing',
      'customer_care',
      'mixed',
      'two_factor_auth',
      'account_notifications',
      'appointment_reminders',
      'delivery_notifications',
      'fraud_alerts',
      'higher_education',
      'polling_voting',
      'public_service_announcement',
      'security_alerts',
      'emergency',
    ])
    .optional(),
  sub_use_case: z.string().optional(),
  message_samples: z.array(z.string().min(1).max(160)).min(3).max(5).optional(),
  opt_in_workflow: z.string().min(1).max(500).optional(),
  opt_in_keywords: z.array(z.string()).optional(),
  opt_out_keywords: z.array(z.string()).optional(),
  help_keywords: z.array(z.string()).optional(),
  help_message: z.string().optional(),
  opt_out_message: z.string().optional(),
  direct_lending: z.boolean().optional(),
  embedded_link: z.boolean().optional(),
  embedded_phone: z.boolean().optional(),
  age_gated: z.boolean().optional(),
  affiliate_marketing: z.boolean().optional(),
  expected_monthly_volume: z.number().min(1).max(10000000).optional(),
})

// GET /api/a2p/campaigns/[id] - Get single campaign with phone numbers
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

    // Fetch campaign with brand and phone numbers
    const { data: campaign, error } = await supabase
      .from('a2p_campaigns')
      .select(
        `
        *,
        brand:a2p_brands(
          id,
          brand_name,
          status
        )
      `
      )
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Fetch associated phone numbers
    const { data: phoneNumbers } = await supabase
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

    return NextResponse.json({ campaign, phone_numbers: phoneNumbers || [] })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PATCH /api/a2p/campaigns/[id] - Update campaign (drafts/rejected only)
export async function PATCH(
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

    // Parse body
    const body = await req.json()

    // Special case: manual approval for testing
    if (body.status === 'approved' && body._manualApproval === true) {
      const { data: campaign, error } = await supabase
        .from('a2p_campaigns')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) {
        console.error('Failed to approve campaign:', error)
        return NextResponse.json(
          { error: 'Failed to approve campaign' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, campaign })
    }

    const validation = updateCampaignSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const input: UpdateCampaignInput = validation.data

    // Verify campaign exists and belongs to workspace
    const { data: existingCampaign } = await supabase
      .from('a2p_campaigns')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Only allow editing drafts and rejected campaigns
    if (!['draft', 'rejected'].includes(existingCampaign.status)) {
      return NextResponse.json(
        {
          error: `Cannot edit ${existingCampaign.status} campaigns. Only draft or rejected campaigns can be edited.`,
        },
        { status: 400 }
      )
    }

    // Check for duplicate campaign name if name is being changed
    if (input.campaign_name) {
      const { data: duplicate } = await supabase
        .from('a2p_campaigns')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('campaign_name', input.campaign_name)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'Campaign name already exists in this workspace' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (input.campaign_name !== undefined)
      updates.campaign_name = input.campaign_name
    if (input.use_case !== undefined) updates.use_case = input.use_case
    if (input.sub_use_case !== undefined)
      updates.sub_use_case = input.sub_use_case
    if (input.message_samples !== undefined)
      updates.message_samples = input.message_samples
    if (input.opt_in_workflow !== undefined)
      updates.opt_in_workflow = input.opt_in_workflow
    if (input.opt_in_keywords !== undefined)
      updates.opt_in_keywords = input.opt_in_keywords
    if (input.opt_out_keywords !== undefined)
      updates.opt_out_keywords = input.opt_out_keywords
    if (input.help_keywords !== undefined)
      updates.help_keywords = input.help_keywords
    if (input.help_message !== undefined)
      updates.help_message = input.help_message
    if (input.opt_out_message !== undefined)
      updates.opt_out_message = input.opt_out_message
    if (input.direct_lending !== undefined)
      updates.direct_lending = input.direct_lending
    if (input.embedded_link !== undefined)
      updates.embedded_link = input.embedded_link
    if (input.embedded_phone !== undefined)
      updates.embedded_phone = input.embedded_phone
    if (input.age_gated !== undefined) updates.age_gated = input.age_gated
    if (input.affiliate_marketing !== undefined)
      updates.affiliate_marketing = input.affiliate_marketing
    if (input.expected_monthly_volume !== undefined)
      updates.expected_monthly_volume = input.expected_monthly_volume

    // Update campaign
    const { data: campaign, error } = await supabase
      .from('a2p_campaigns')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update campaign:', error)
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

// DELETE /api/a2p/campaigns/[id] - Delete campaign (drafts/rejected only)
export async function DELETE(
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

    // Verify campaign exists and belongs to workspace
    const { data: campaign } = await supabase
      .from('a2p_campaigns')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Only allow deleting drafts and rejected campaigns
    if (!['draft', 'rejected'].includes(campaign.status)) {
      return NextResponse.json(
        {
          error: `Cannot delete ${campaign.status} campaigns. Only draft or rejected campaigns can be deleted.`,
        },
        { status: 400 }
      )
    }

    // Delete campaign (phone number assignments will cascade delete)
    const { error } = await supabase
      .from('a2p_campaigns')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Failed to delete campaign:', error)
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
