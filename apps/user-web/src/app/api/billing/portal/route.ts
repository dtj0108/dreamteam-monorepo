import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { stripe } from '@/lib/stripe'
import { getWorkspaceBilling } from '@/lib/billing-queries'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function POST() {
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

    // Verify user is workspace owner (only owner can access billing portal)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    if (workspace?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only workspace owner can access billing portal' },
        { status: 403 }
      )
    }

    // Get billing record with Stripe customer ID
    const billing = await getWorkspaceBilling(workspaceId)
    if (!billing?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please set up a subscription first.' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
