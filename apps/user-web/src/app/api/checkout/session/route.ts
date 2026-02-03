import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

/**
 * GET /api/checkout/session?session_id=xxx
 * Retrieves checkout session details from Stripe.
 * Used by the post-checkout signup page to get customer info.
 */
export async function GET(request: NextRequest) {
  console.log('[API /checkout/session] Request received')
  console.log('[API /checkout/session] URL:', request.url)

  try {
    const stripe = getStripe() // Throws if STRIPE_SECRET_KEY is not configured
    console.log('[API /checkout/session] Stripe initialized')

    const sessionId = request.nextUrl.searchParams.get('session_id')
    console.log('[API /checkout/session] session_id:', sessionId)

    if (!sessionId) {
      console.log('[API /checkout/session] Missing session_id, returning 400')
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Verify the session is completed/paid
    if (session.payment_status !== 'paid') {
      console.log('[API /checkout/session] Session not paid, payment_status:', session.payment_status)
      return NextResponse.json(
        { error: 'Checkout session has not been paid' },
        { status: 400 }
      )
    }
    console.log('[API /checkout/session] Session retrieved successfully, payment_status:', session.payment_status)

    // Get subscription ID (can be string or expanded object)
    let subscriptionId: string | null = null
    if (session.subscription) {
      subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id
    }

    // Get customer ID (can be string or expanded object)
    let customerId: string | null = null
    if (session.customer) {
      customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer.id
    }

    const responseData = {
      email: session.customer_details?.email,
      name: session.customer_details?.name,
      tier: session.metadata?.target_plan,
      type: session.metadata?.type,
      customerId,
      subscriptionId,
    }
    console.log('[API /checkout/session] Returning success response:', responseData)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[API /checkout/session] Error:', error)
    console.error('[API /checkout/session] Error message:', error instanceof Error ? error.message : 'Unknown')
    console.error('[API /checkout/session] Error stack:', error instanceof Error ? error.stack : 'N/A')

    // Handle missing Stripe key
    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      console.log('[API /checkout/session] Missing Stripe key, returning 500')
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    // Handle Stripe-specific errors
    if (error instanceof Error && error.message.includes('No such checkout.session')) {
      console.log('[API /checkout/session] Session not found, returning 404')
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      )
    }

    console.log('[API /checkout/session] Unknown error, returning 500')
    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    )
  }
}
