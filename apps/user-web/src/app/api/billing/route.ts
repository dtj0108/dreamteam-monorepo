import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { getWorkspaceBilling, getWorkspaceInvoices, syncBillingFromStripeSubscription } from '@/lib/billing-queries'
import { getStripe } from '@/lib/stripe'

/**
 * GET /api/billing
 * Get billing status and invoices for the current workspace
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, user.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    // Get billing data
    let billing = await getWorkspaceBilling(workspaceId)

    // Always sync subscription status from Stripe (for accuracy)
    try {
      if (billing?.stripe_agent_subscription_id) {
        const subscription = await getStripe().subscriptions.retrieve(billing.stripe_agent_subscription_id)
        const targetPlan =
          subscription.metadata?.agent_tier ||
          subscription.metadata?.target_plan ||
          null

        let resolvedTier = targetPlan
        if (!resolvedTier) {
          const priceId = subscription.items?.data?.[0]?.price?.id
          if (priceId) {
            const { data: plan } = await supabase
              .from('plans')
              .select('slug')
              .eq('plan_type', 'agent_tier')
              .eq('stripe_price_id', priceId)
              .single()
            resolvedTier = plan?.slug || null
          }
        }

        await syncBillingFromStripeSubscription(
          workspaceId,
          subscription,
          'agent_tier',
          resolvedTier || undefined
        )
        billing = await getWorkspaceBilling(workspaceId)
      }

      if (billing?.stripe_subscription_id) {
        const subscription = await getStripe().subscriptions.retrieve(billing.stripe_subscription_id)
        const targetPlan =
          subscription.metadata?.plan ||
          subscription.metadata?.target_plan ||
          null

        let resolvedPlan = targetPlan
        if (!resolvedPlan) {
          const priceId = subscription.items?.data?.[0]?.price?.id
          if (priceId) {
            const { data: plan } = await supabase
              .from('plans')
              .select('slug')
              .eq('plan_type', 'workspace_plan')
              .eq('stripe_price_id', priceId)
              .single()
            resolvedPlan = plan?.slug || null
          }
        }

        await syncBillingFromStripeSubscription(
          workspaceId,
          subscription,
          'workspace_plan',
          resolvedPlan || undefined
        )
        billing = await getWorkspaceBilling(workspaceId)
      }
    } catch (stripeError) {
      console.error('Billing sync from Stripe failed:', stripeError)
      // continue with existing billing data
    }

    const invoices = await getWorkspaceInvoices(workspaceId)

    // Check if current user is workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    const isOwner = workspace?.owner_id === user.id

    // Check can_manage_billing permission for non-owners
    let canManageBilling = isOwner // Owners always have billing permission

    if (!isOwner) {
      // Get current user's membership and check for billing permission
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('id, role')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', user.id)
        .single()

      if (membership) {
        // Check for user-specific override first
        const { data: override } = await supabase
          .from('member_permission_overrides')
          .select('is_enabled')
          .eq('member_id', membership.id)
          .eq('permission_key', 'can_manage_billing')
          .single()

        if (override) {
          canManageBilling = override.is_enabled
        } else {
          // Fall back to role default
          const { data: rolePermission } = await supabase
            .from('workspace_permissions')
            .select('is_enabled')
            .eq('workspace_id', workspaceId)
            .eq('role', membership.role)
            .eq('permission_key', 'can_manage_billing')
            .single()

          canManageBilling = rolePermission?.is_enabled ?? false
        }
      }
    }

    return NextResponse.json({
      billing,
      invoices,
      isOwner,
      canManageBilling,
    })
  } catch (error) {
    console.error('Get billing error:', error)
    return NextResponse.json({ error: 'Failed to get billing info' }, { status: 500 })
  }
}
