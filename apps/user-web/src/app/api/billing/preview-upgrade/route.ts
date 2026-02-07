import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getStripe, STRIPE_PRICES, type AgentTierType } from '@/lib/stripe'
import { getWorkspaceBilling } from '@/lib/billing-queries'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

/**
 * POST /api/billing/preview-upgrade
 * Preview prorated amount for upgrading agent tier
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

    const { isValid } = await validateWorkspaceAccess(workspaceId, user.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const body = await request.json()
    const { tier } = body as { tier: AgentTierType }

    if (!tier || !['startup', 'teams', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Get current billing state
    const billing = await getWorkspaceBilling(workspaceId)

    if (!billing?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    if (!billing?.stripe_agent_subscription_id) {
      // No existing subscription - return null to indicate full price applies
      return NextResponse.json({ proration: null })
    }

    // Get the new price ID from database or fallback
    const { data: planData } = await supabase
      .from('plans')
      .select('stripe_price_id')
      .eq('slug', tier)
      .eq('is_active', true)
      .eq('plan_type', 'agent_tier')
      .single()

    const newPriceId = planData?.stripe_price_id || STRIPE_PRICES.agents[tier]

    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured for this tier' },
        { status: 500 }
      )
    }

    // Get current subscription to find item ID
    const subscription = await getStripe().subscriptions.retrieve(billing.stripe_agent_subscription_id)
    const itemId = subscription.items.data[0]?.id

    if (!itemId) {
      return NextResponse.json({ error: 'Subscription item not found' }, { status: 400 })
    }

    // Get upcoming invoice preview with the new price
    // Note: Stripe v20+ uses createPreview instead of retrieveUpcoming
    const upcomingInvoice = await getStripe().invoices.createPreview({
      customer: billing.stripe_customer_id,
      subscription: billing.stripe_agent_subscription_id,
      subscription_details: {
        items: [
          {
            id: itemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      },
    })

    // Calculate amounts from proration line items
    let proratedAmount = 0
    let creditAmount = 0

    for (const line of upcomingInvoice.lines.data) {
      // Cast to access proration field which exists at runtime but may not be in type definitions
      const lineData = line as unknown as { proration: boolean; amount: number }
      // Only count actual proration items, not regular subscription charges
      if (lineData.proration) {
        if (lineData.amount > 0) {
          proratedAmount += lineData.amount
        } else {
          creditAmount += Math.abs(lineData.amount)
        }
      }
    }

    // Total due now is the net proration: charges minus credits
    // NOT the full invoice amount_due (which includes next period's subscription)
    const totalDue = Math.max(0, proratedAmount - creditAmount)

    // Next billing date is the subscription's current period end
    // Cast to access current_period_end which exists at runtime
    const sub = subscription as unknown as { current_period_end?: number }
    const periodEnd = sub.current_period_end
    let nextBillingDate: string
    if (typeof periodEnd === 'number' && periodEnd > 0 && Number.isFinite(periodEnd)) {
      nextBillingDate = new Date(periodEnd * 1000).toISOString()
    } else {
      // Fallback: 30 days from now for monthly billing
      const fallbackDate = new Date()
      fallbackDate.setDate(fallbackDate.getDate() + 30)
      nextBillingDate = fallbackDate.toISOString()
    }

    // Get the full price for the new tier (for next billing cycle)
    const price = await getStripe().prices.retrieve(newPriceId)
    const nextBillingAmount = price.unit_amount || 0

    return NextResponse.json({
      proration: {
        prorated_amount: proratedAmount,
        credit_amount: creditAmount,
        total_due: totalDue,
        next_billing_date: nextBillingDate,
        next_billing_amount: nextBillingAmount,
      },
    })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[billing/preview-upgrade] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}
