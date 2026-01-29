import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import { getWorkspaceBilling, removePaymentMethod, createSetupIntent } from '@/lib/billing-queries'

/**
 * GET /api/addons/payment-method
 * Get the saved payment method for the current workspace
 */
export async function GET(): Promise<NextResponse> {
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

    const billing = await getWorkspaceBilling(workspaceId)

    const hasCard = !!(billing?.default_payment_method_id && billing?.payment_method_last4)

    return NextResponse.json({
      hasPaymentMethod: hasCard,
      paymentMethod: hasCard
        ? {
            brand: billing!.payment_method_brand,
            last4: billing!.payment_method_last4,
            expMonth: billing!.payment_method_exp_month,
            expYear: billing!.payment_method_exp_year,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching payment method:', error)
    return NextResponse.json({ error: 'Failed to fetch payment method' }, { status: 500 })
  }
}

/**
 * POST /api/addons/payment-method
 * Create a SetupIntent for adding/updating a payment method
 * Returns client_secret for Stripe Elements
 */
export async function POST(): Promise<NextResponse> {
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

    const { clientSecret } = await createSetupIntent(workspaceId)

    return NextResponse.json({ clientSecret })
  } catch (error) {
    console.error('Error creating SetupIntent:', error)
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 })
  }
}

/**
 * DELETE /api/addons/payment-method
 * Remove the saved payment method
 */
export async function DELETE(): Promise<NextResponse> {
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

    await removePaymentMethod(workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing payment method:', error)
    return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 })
  }
}
