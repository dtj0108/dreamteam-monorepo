import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { getOrCreateStripeCustomer } from '@/lib/billing-queries'
import {
  getWorkspaceCallMinutes,
  getCallMinutesPurchases,
  getCallUsage,
  recordCallMinutesPurchase,
  updateCallMinutesAutoReplenish,
} from '@/lib/addons-queries'
import { type CreditBundle, MINUTES_BUNDLES } from '@/types/addons'

/**
 * GET /api/addons/call-minutes
 * Get call minutes balance, recent purchases, and usage
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

    // Fetch call minutes data in parallel
    const [minutes, recentPurchases, recentUsage] = await Promise.all([
      getWorkspaceCallMinutes(workspaceId),
      getCallMinutesPurchases(workspaceId, 5),
      getCallUsage(workspaceId, 20),
    ])

    return NextResponse.json({
      minutes,
      recentPurchases,
      recentUsage,
    })
  } catch (error) {
    console.error('Error fetching call minutes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call minutes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/addons/call-minutes
 * Purchase call minutes bundle - creates Stripe checkout session
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { bundle } = body as { bundle: CreditBundle }

    // Validate bundle type
    if (!bundle || !MINUTES_BUNDLES[bundle]) {
      return NextResponse.json({ error: 'Invalid bundle type' }, { status: 400 })
    }

    // Get workspace info for Stripe customer
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      workspaceId,
      workspace?.name || 'Workspace',
      profile?.email || ''
    )

    // Get Stripe price ID
    const priceId = STRIPE_PRICES.callMinutes[bundle]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Call minutes bundle price not configured' },
        { status: 500 }
      )
    }

    const bundleConfig = MINUTES_BUNDLES[bundle]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    // Create Stripe checkout session for one-time payment
    // setup_future_usage saves the card for future off-session charges (auto-replenish, quick purchases)
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      success_url: `${appUrl}/sales/add-ons?success=minutes&minutes=${bundleConfig.minutes}`,
      cancel_url: `${appUrl}/sales/add-ons?canceled=true`,
      metadata: {
        workspace_id: workspaceId,
        type: 'call_minutes',
        bundle_type: bundle,
        minutes_amount: bundleConfig.minutes.toString(),
      },
    })

    // Record pending purchase
    await recordCallMinutesPurchase(workspaceId, bundle, checkoutSession.id)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating call minutes checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/addons/call-minutes
 * Update auto-replenish settings
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { enabled, threshold, bundle } = body as {
      enabled?: boolean
      threshold?: number
      bundle?: CreditBundle
    }

    await updateCallMinutesAutoReplenish(
      workspaceId,
      enabled ?? false,
      threshold,
      bundle
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating call minutes auto-replenish:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
