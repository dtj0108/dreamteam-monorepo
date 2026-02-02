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
  updateAgentTierSubscription,
  createAgentTierSubscription,
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

    // Determine price ID and session type
    let priceId: string | null = null
    let sessionType: 'workspace_plan' | 'agent_tier'
    let targetPlan: string

    if (type === 'workspace_plan' && plan) {
      sessionType = 'workspace_plan'
      targetPlan = plan

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
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured. Please set up Stripe pricing in admin or environment variables.' },
        { status: 500 }
      )
    }

    // For agent tier: Check if changing from existing tier
    if (type === 'agent_tier' && tier) {
      // Check if user has an existing agent subscription to update
      if (billing?.stripe_agent_subscription_id && billing.agent_tier !== 'none') {
        // Allow both upgrades and downgrades - updateAgentTierSubscription handles proration
        // Perform direct subscription update with proration
        const result = await updateAgentTierSubscription(
          workspaceId,
          billing.stripe_agent_subscription_id,
          tier,
          priceId
        )

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to upgrade subscription' },
            { status: 500 }
          )
        }

        // Return success without redirect (immediate upgrade)
        // Include deployment status so UI can show warning if agents failed to deploy
        return NextResponse.json({
          success: true,
          upgraded: true,
          newTier: tier,
          deploymentFailed: result.deploymentFailed,
          deploymentError: result.deploymentError,
        })
      }

      // NEW: Direct subscription creation for users with saved payment method
      // (no existing subscription, but has card on file)
      if (billing?.default_payment_method_id) {
        console.log(`[checkout] User has saved payment method, attempting direct subscription creation`)

        const result = await createAgentTierSubscription(workspaceId, tier, priceId)

        if (result.requiresAction) {
          // 3DS required - return client secret for frontend handling
          return NextResponse.json({
            success: false,
            requiresAction: true,
            clientSecret: result.clientSecret,
          })
        }

        if (!result.success) {
          // Payment failed - could fall through to Checkout, but better to show error
          // so user knows their saved card failed
          return NextResponse.json(
            { error: result.error || 'Failed to create subscription' },
            { status: 500 }
          )
        }

        // Success - subscription created with saved card
        return NextResponse.json({
          success: true,
          upgraded: true, // Use same response shape as upgrades
          newTier: tier,
          deploymentFailed: result.deploymentFailed,
          deploymentError: result.deploymentError,
        })
      }
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
