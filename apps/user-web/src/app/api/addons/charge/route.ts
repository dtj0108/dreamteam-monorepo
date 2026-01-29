import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import {
  getWorkspaceBilling,
  createDirectCharge,
  hasPaymentMethodSaved,
} from '@/lib/billing-queries'
import { addSMSCredits, addCallMinutes, recordSMSPurchase, recordCallMinutesPurchase } from '@/lib/addons-queries'
import { type CreditBundle, SMS_BUNDLES, MINUTES_BUNDLES } from '@/types/addons'

interface ChargeRequest {
  type: 'sms_credits' | 'call_minutes'
  bundle: CreditBundle
}

interface ChargeResponse {
  success: boolean
  noPaymentMethod?: boolean
  requiresAction?: boolean
  clientSecret?: string
  paymentIntentId?: string
  error?: string
  errorCode?: string
  // Credits/minutes added
  creditsAdded?: number
  minutesAdded?: number
}

/**
 * POST /api/addons/charge
 * Charge saved payment method directly (no redirect to Stripe Checkout)
 *
 * Returns:
 * - success: true if charged successfully and credits added
 * - noPaymentMethod: true if no saved card (caller should redirect to Stripe Checkout)
 * - requiresAction: true if 3DS required (caller should complete with Stripe.js)
 * - error: error message if charge failed
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChargeResponse>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'No workspace selected' }, { status: 400 })
    }

    const body = (await request.json()) as ChargeRequest
    const { type, bundle } = body

    // Validate request
    if (!type || !['sms_credits', 'call_minutes'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be sms_credits or call_minutes' },
        { status: 400 }
      )
    }

    if (!bundle || !['starter', 'growth', 'pro'].includes(bundle)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bundle. Must be starter, growth, or pro' },
        { status: 400 }
      )
    }

    // Check if workspace has a saved payment method
    const hasCard = await hasPaymentMethodSaved(workspaceId)
    if (!hasCard) {
      // No card on file - caller should redirect to Stripe Checkout
      return NextResponse.json({
        success: false,
        noPaymentMethod: true,
        error: 'No payment method on file',
      })
    }

    // Get bundle details
    let amountCents: number
    let creditsOrMinutes: number

    if (type === 'sms_credits') {
      const bundleConfig = SMS_BUNDLES[bundle]
      if (!bundleConfig) {
        return NextResponse.json({ success: false, error: 'Invalid SMS bundle' }, { status: 400 })
      }
      amountCents = bundleConfig.price
      creditsOrMinutes = bundleConfig.credits
    } else {
      const bundleConfig = MINUTES_BUNDLES[bundle]
      if (!bundleConfig) {
        return NextResponse.json({ success: false, error: 'Invalid minutes bundle' }, { status: 400 })
      }
      amountCents = bundleConfig.price
      creditsOrMinutes = bundleConfig.minutes * 60 // Store as seconds internally
    }

    // Attempt direct charge
    const chargeResult = await createDirectCharge(workspaceId, amountCents, {
      type,
      bundle,
      credits_or_minutes: creditsOrMinutes,
    })

    if (!chargeResult.success) {
      // Check if 3DS is required
      if (chargeResult.requiresAction) {
        return NextResponse.json({
          success: false,
          requiresAction: true,
          clientSecret: chargeResult.clientSecret,
          paymentIntentId: chargeResult.paymentIntentId,
          error: chargeResult.error,
          errorCode: chargeResult.errorCode,
        })
      }

      // Charge failed
      return NextResponse.json({
        success: false,
        error: chargeResult.error || 'Charge failed',
        errorCode: chargeResult.errorCode,
      })
    }

    // Charge succeeded - add credits/minutes
    if (type === 'sms_credits') {
      // Record the purchase first
      const purchaseId = await recordSMSPurchase(
        workspaceId,
        bundle,
        null, // No checkout session - direct charge
        chargeResult.paymentIntentId
      )

      // Add the credits
      await addSMSCredits(workspaceId, bundle, purchaseId)

      return NextResponse.json({
        success: true,
        creditsAdded: SMS_BUNDLES[bundle].credits,
        paymentIntentId: chargeResult.paymentIntentId,
      })
    } else {
      // Record the purchase first
      const purchaseId = await recordCallMinutesPurchase(
        workspaceId,
        bundle,
        null, // No checkout session - direct charge
        chargeResult.paymentIntentId
      )

      // Add the minutes
      await addCallMinutes(workspaceId, bundle, purchaseId)

      return NextResponse.json({
        success: true,
        minutesAdded: MINUTES_BUNDLES[bundle].minutes,
        paymentIntentId: chargeResult.paymentIntentId,
      })
    }
  } catch (error) {
    console.error('Error processing direct charge:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process charge' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/addons/charge
 * Check if workspace has a saved payment method
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
    console.error('Error checking payment method:', error)
    return NextResponse.json({ error: 'Failed to check payment method' }, { status: 500 })
  }
}
