import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import {
  stripe,
  STRIPE_PRICES,
  TRIAL_DAYS,
  type WorkspacePlanType,
  type AgentTierType,
} from '@/lib/stripe'
import {
  getWorkspaceBilling,
  getOrCreateStripeCustomer,
  recordCheckoutSession,
  isActiveSubscription,
} from '@/lib/billing-queries'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for workspace plan or agent tier
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

    // Verify user is workspace owner (only owner can manage billing)
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('owner_id, name')
      .eq('id', workspaceId)
      .single()

    if (wsError || workspace.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only workspace owner can manage billing' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, plan, tier } = body as {
      type: 'workspace_plan' | 'agent_tier'
      plan?: WorkspacePlanType
      tier?: AgentTierType
    }

    // Get user's email for Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      workspaceId,
      workspace.name,
      profile?.email || ''
    )

    // Get current billing state
    const billing = await getWorkspaceBilling(workspaceId)

    // Validate: Agent tier requires active workspace subscription
    if (type === 'agent_tier') {
      if (!isActiveSubscription(billing)) {
        return NextResponse.json(
          { error: 'Active workspace subscription required for agent tiers' },
          { status: 400 }
        )
      }
    }

    // Determine price ID and session type
    let priceId: string
    let sessionType: 'workspace_plan' | 'agent_tier'
    let targetPlan: string

    if (type === 'workspace_plan' && plan) {
      priceId = STRIPE_PRICES.workspace[plan]
      sessionType = 'workspace_plan'
      targetPlan = plan
    } else if (type === 'agent_tier' && tier) {
      priceId = STRIPE_PRICES.agents[tier]
      sessionType = 'agent_tier'
      targetPlan = tier
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured. Please check environment variables.' },
        { status: 500 }
      )
    }

    // Build checkout session config
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    // Determine if trial should be added (only for workspace plans, and only if never had trial)
    const shouldAddTrial = type === 'workspace_plan' && !billing?.trial_end

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      metadata: {
        workspace_id: workspaceId,
        type: sessionType,
        target_plan: targetPlan,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          type: sessionType,
        },
      },
    })

    // Record checkout session in database for tracking
    await recordCheckoutSession(workspaceId, checkoutSession.id, sessionType, targetPlan)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
