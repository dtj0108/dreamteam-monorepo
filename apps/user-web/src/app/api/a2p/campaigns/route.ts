import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentWorkspaceId } from '@/lib/workspace-utils'
import { CreateCampaignInput } from '@/types/a2p'
import { z } from 'zod'

// Validation schema
const createCampaignSchema = z.object({
  brand_id: z.string().uuid(),
  campaign_name: z.string().min(1).max(100),
  use_case: z.enum([
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
  ]),
  sub_use_case: z.string().optional(),
  message_samples: z.array(z.string().min(1).max(160)).min(3).max(5),
  opt_in_workflow: z.string().min(1).max(500),
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

// POST /api/a2p/campaigns - Create new campaign
export async function POST(req: NextRequest) {
  try {
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

    // Parse and validate body
    const body = await req.json()
    const validation = createCampaignSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const input: CreateCampaignInput = validation.data

    // Verify brand exists and belongs to workspace
    const { data: brand } = await supabase
      .from('a2p_brands')
      .select('id, status')
      .eq('id', input.brand_id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found or does not belong to this workspace' },
        { status: 404 }
      )
    }

    // Block campaigns for rejected or suspended brands
    if (brand.status === 'rejected' || brand.status === 'suspended') {
      return NextResponse.json(
        { error: `Cannot create campaigns for a ${brand.status} brand. Please resolve brand issues first.` },
        { status: 400 }
      )
    }

    // Check for duplicate campaign name in workspace
    const { data: existing } = await supabase
      .from('a2p_campaigns')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('campaign_name', input.campaign_name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Campaign name already exists in this workspace' },
        { status: 400 }
      )
    }

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('a2p_campaigns')
      .insert({
        workspace_id: workspaceId,
        brand_id: input.brand_id,
        campaign_name: input.campaign_name,
        use_case: input.use_case,
        sub_use_case: input.sub_use_case || null,
        message_samples: input.message_samples,
        opt_in_workflow: input.opt_in_workflow,
        opt_in_keywords: input.opt_in_keywords || ['START', 'YES', 'UNSTOP'],
        opt_out_keywords:
          input.opt_out_keywords ||
          ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
        help_keywords: input.help_keywords || ['HELP', 'INFO'],
        help_message:
          input.help_message || 'Reply HELP for help, STOP to unsubscribe.',
        opt_out_message:
          input.opt_out_message ||
          'You have been unsubscribed and will receive no further messages.',
        direct_lending: input.direct_lending || false,
        embedded_link: input.embedded_link || false,
        embedded_phone: input.embedded_phone || false,
        age_gated: input.age_gated || false,
        affiliate_marketing: input.affiliate_marketing || false,
        expected_monthly_volume: input.expected_monthly_volume || 1000,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create campaign:', error)
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

// GET /api/a2p/campaigns - List campaigns for current workspace
export async function GET(req: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brand_id')
    const status = searchParams.get('status')

    let query = supabase
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
      .eq('workspace_id', workspaceId)

    if (brandId) {
      query = query.eq('brand_id', brandId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: campaigns, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Failed to fetch campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
