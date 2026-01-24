import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { stripe, STRIPE_PRICES } from '@/lib/stripe'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { getOrCreateStripeCustomer } from '@/lib/billing-queries'
import {
  getWorkspaceSMSCredits,
  getSMSPurchases,
  getSMSUsage,
  recordSMSPurchase,
  updateSMSAutoReplenish,
} from '@/lib/addons-queries'
import { type CreditBundle, SMS_BUNDLES } from '@/types/addons'

/**
 * GET /api/addons/sms-credits
 * Get SMS credits balance, recent purchases, and usage
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

    // Fetch SMS credits data in parallel
    const [credits, recentPurchases, recentUsage] = await Promise.all([
      getWorkspaceSMSCredits(workspaceId),
      getSMSPurchases(workspaceId, 5),
      getSMSUsage(workspaceId, 20),
    ])

    return NextResponse.json({
      credits,
      recentPurchases,
      recentUsage,
    })
  } catch (error) {
    console.error('Error fetching SMS credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS credits' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/addons/sms-credits
 * Purchase SMS credits bundle - creates Stripe checkout session
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
    if (!bundle || !SMS_BUNDLES[bundle]) {
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
    const priceId = STRIPE_PRICES.smsCredits[bundle]
    if (!priceId) {
      return NextResponse.json(
        { error: 'SMS bundle price not configured' },
        { status: 500 }
      )
    }

    const bundleConfig = SMS_BUNDLES[bundle]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    // Create Stripe checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/sales/add-ons?success=sms&credits=${bundleConfig.credits}`,
      cancel_url: `${appUrl}/sales/add-ons?canceled=true`,
      metadata: {
        workspace_id: workspaceId,
        type: 'sms_credits',
        bundle_type: bundle,
        credits_amount: bundleConfig.credits.toString(),
      },
    })

    // Record pending purchase
    await recordSMSPurchase(workspaceId, bundle, checkoutSession.id)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating SMS checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/addons/sms-credits
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

    await updateSMSAutoReplenish(
      workspaceId,
      enabled ?? false,
      threshold,
      bundle
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating SMS auto-replenish:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
