import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import {
  stripe,
  STRIPE_PRICES,
  TRIAL_DAYS,
  type WorkspacePlanType,
  type AgentTierType,
} from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * POST /api/checkout
 * Public checkout endpoint - creates a Stripe Checkout session without requiring authentication.
 * Used for "pay first, sign up after" flow.
 *
 * For authenticated users with a workspace, redirects to the existing /api/billing/checkout endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, plan, tier } = body as {
      type: 'workspace_plan' | 'agent_tier'
      plan?: WorkspacePlanType
      tier?: AgentTierType
    }

    // Check if user is authenticated (optional)
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If authenticated and has workspace, use existing billing checkout flow
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      if (profile?.default_workspace_id) {
        // Redirect to existing checkout endpoint for authenticated users
        return NextResponse.json(
          { redirect: '/api/billing/checkout', authenticated: true },
          { status: 200 }
        )
      }
    }

    // Determine price ID and session type based on request
    let priceId: string | null = null
    let sessionType: 'workspace_plan' | 'agent_tier'
    let targetPlan: string
    let successParam: string

    if (type === 'workspace_plan' && plan) {
      sessionType = 'workspace_plan'
      targetPlan = plan
      successParam = `plan=${plan}`

      // Try to get Stripe price ID from database first
      const { data: planData } = await supabase
        .from('plans')
        .select('stripe_price_id')
        .eq('slug', plan)
        .eq('is_active', true)
        .eq('plan_type', 'workspace_plan')
        .single()

      priceId = planData?.stripe_price_id || STRIPE_PRICES.workspace[plan]
    } else if (type === 'agent_tier' && tier) {
      sessionType = 'agent_tier'
      targetPlan = tier
      successParam = `tier=${tier}`

      // Try to get Stripe price ID from database first
      const { data: planData } = await supabase
        .from('plans')
        .select('stripe_price_id')
        .eq('slug', tier)
        .eq('is_active', true)
        .eq('plan_type', 'agent_tier')
        .single()

      priceId = planData?.stripe_price_id || STRIPE_PRICES.agents[tier]
    } else {
      return NextResponse.json({ error: 'Invalid request. Plan or tier is required.' }, { status: 400 })
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured. Please set up Stripe pricing in admin or environment variables.' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    // Create Stripe Checkout Session for guest checkout
    // Note: No customer is created yet - Stripe will collect email
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Collect customer email during checkout
      customer_email: undefined, // Let Stripe collect it
      // Redirect to signup page after successful payment
      success_url: `${appUrl}/signup?session_id={CHECKOUT_SESSION_ID}&${successParam}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      // Store metadata for later linking
      metadata: {
        type: sessionType,
        target_plan: targetPlan,
        guest_checkout: 'true',
      },
      subscription_data: {
        metadata: {
          type: sessionType,
          target_plan: targetPlan,
          guest_checkout: 'true',
        },
      },
    })

    // Record checkout session in database (with null workspace_id for guest checkout)
    const adminClient = createAdminClient()
    await adminClient.from('billing_checkout_sessions').insert({
      workspace_id: null, // Guest checkout - no workspace yet
      stripe_session_id: checkoutSession.id,
      session_type: sessionType,
      target_plan: targetPlan,
      status: 'pending',
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Public checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
