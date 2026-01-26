import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import {
  updateBillingFromSubscription,
  handleSubscriptionCanceled,
  recordInvoice,
  completeCheckoutSession,
  type WorkspacePlan,
  type AgentTier,
} from '@/lib/billing-queries'
import {
  findPendingSMSPurchase,
  findPendingCallMinutesPurchase,
  addSMSCredits,
  addCallMinutes,
  markSMSPurchaseFailed,
  markCallMinutesPurchaseFailed,
} from '@/lib/addons-queries'
import { type CreditBundle } from '@/types/addons'
import { autoDeployTeamForPlan } from '@dreamteam/database'

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 *
 * This endpoint receives events from Stripe and updates our database accordingly.
 * It uses the service role to bypass RLS since webhooks don't have user auth.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Missing Stripe webhook signature or secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      // ============================================
      // CHECKOUT COMPLETED
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const workspaceId = session.metadata?.workspace_id
        const sessionType = session.metadata?.type as 'workspace_plan' | 'agent_tier' | 'sms_credits' | 'call_minutes'
        const targetPlan = session.metadata?.target_plan
        const subscriptionId = session.subscription as string
        const isGuestCheckout = session.metadata?.guest_checkout === 'true'

        // For guest checkout (pay first, sign up after), workspace_id will be null
        // The subscription will be linked to workspace during signup
        if (isGuestCheckout && !workspaceId) {
          console.log(`Guest checkout completed: ${session.id}. Subscription will be linked during signup.`)
          // Just mark the session as completed in our records - billing update happens at signup
          await supabase
            .from('billing_checkout_sessions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('stripe_session_id', session.id)
          break
        }

        // Handle SMS Credits purchase (one-time payment, no subscription)
        if (sessionType === 'sms_credits') {
          const bundleType = session.metadata?.bundle_type as CreditBundle
          const purchase = await findPendingSMSPurchase(session.id)

          if (purchase) {
            await addSMSCredits(purchase.workspace_id, bundleType, purchase.id)
            console.log(`SMS credits added for workspace ${purchase.workspace_id}: ${bundleType}`)
          } else {
            console.error('Could not find pending SMS purchase for session:', session.id)
          }
          break
        }

        // Handle Call Minutes purchase (one-time payment, no subscription)
        if (sessionType === 'call_minutes') {
          const bundleType = session.metadata?.bundle_type as CreditBundle
          const purchase = await findPendingCallMinutesPurchase(session.id)

          if (purchase) {
            await addCallMinutes(purchase.workspace_id, bundleType, purchase.id)
            console.log(`Call minutes added for workspace ${purchase.workspace_id}: ${bundleType}`)
          } else {
            console.error('Could not find pending call minutes purchase for session:', session.id)
          }
          break
        }

        if (!workspaceId || !subscriptionId) {
          console.error('Missing workspace_id or subscription_id in checkout session')
          break
        }

        // Mark checkout session as completed
        await completeCheckoutSession(session.id)

        // Update billing from subscription
        await updateBillingFromSubscription(workspaceId, subscriptionId, sessionType as 'workspace_plan' | 'agent_tier', targetPlan)

        // Auto-deploy team for agent tier subscriptions
        if (sessionType === 'agent_tier' && targetPlan) {
          console.log(`[auto-deploy] Triggering deployment for workspace ${workspaceId} with plan ${targetPlan}`)
          const deployResult = await autoDeployTeamForPlan(workspaceId, targetPlan)
          if (deployResult.deployed) {
            console.log(`[auto-deploy] Successfully deployed team ${deployResult.teamId} to workspace ${workspaceId}`)
          } else {
            console.error(`[auto-deploy] Failed to deploy team for workspace ${workspaceId}: ${deployResult.error}`)
          }
        }

        console.log(`Checkout completed for workspace ${workspaceId}: ${sessionType} -> ${targetPlan}`)
        break
      }

      // ============================================
      // SUBSCRIPTION UPDATED
      // ============================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const workspaceId = subscription.metadata?.workspace_id
        const subscriptionType = subscription.metadata?.type as 'workspace_plan' | 'agent_tier'

        if (!workspaceId) {
          // Try to find workspace by subscription ID
          const { data: billing } = await supabase
            .from('workspace_billing')
            .select('workspace_id')
            .or(`stripe_subscription_id.eq.${subscription.id},stripe_agent_subscription_id.eq.${subscription.id}`)
            .single()

          if (!billing) {
            console.error('Could not find workspace for subscription:', subscription.id)
            break
          }

          // Determine subscription type from which field matched
          const isWorkspacePlan = await supabase
            .from('workspace_billing')
            .select('workspace_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          const type = isWorkspacePlan.data ? 'workspace_plan' : 'agent_tier'
          await updateBillingFromSubscription(billing.workspace_id, subscription.id, type)
        } else {
          await updateBillingFromSubscription(workspaceId, subscription.id, subscriptionType)
        }

        console.log(`Subscription updated: ${subscription.id} -> ${subscription.status}`)
        break
      }

      // ============================================
      // SUBSCRIPTION DELETED / CANCELED
      // ============================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const workspaceId = subscription.metadata?.workspace_id
        const subscriptionType = subscription.metadata?.type as 'workspace_plan' | 'agent_tier'

        if (!workspaceId) {
          // Try to find workspace by subscription ID
          const { data: billing } = await supabase
            .from('workspace_billing')
            .select('workspace_id, stripe_subscription_id')
            .or(`stripe_subscription_id.eq.${subscription.id},stripe_agent_subscription_id.eq.${subscription.id}`)
            .single()

          if (!billing) {
            console.error('Could not find workspace for deleted subscription:', subscription.id)
            break
          }

          const type = billing.stripe_subscription_id === subscription.id ? 'workspace_plan' : 'agent_tier'
          await handleSubscriptionCanceled(billing.workspace_id, type)
        } else {
          await handleSubscriptionCanceled(workspaceId, subscriptionType)
        }

        console.log(`Subscription canceled: ${subscription.id}`)
        break
      }

      // ============================================
      // INVOICE PAID
      // ============================================
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find workspace by customer ID
        const { data: billing } = await supabase
          .from('workspace_billing')
          .select('workspace_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!billing) {
          console.error('Could not find workspace for customer:', customerId)
          break
        }

        // Cast to access payment_intent which may be string, PaymentIntent, or null
        const rawPaymentIntent = (invoice as { payment_intent?: string | null }).payment_intent
        const paymentIntentId: string | undefined = typeof rawPaymentIntent === 'string' ? rawPaymentIntent : undefined

        await recordInvoice(billing.workspace_id, invoice.id, {
          payment_intent_id: paymentIntentId,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          description: invoice.description || undefined,
          invoice_url: invoice.hosted_invoice_url || undefined,
          invoice_pdf: invoice.invoice_pdf || undefined,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
          paid_at: new Date(),
        })

        console.log(`Invoice paid: ${invoice.id} for workspace ${billing.workspace_id}`)
        break
      }

      // ============================================
      // INVOICE PAYMENT FAILED
      // ============================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: billing } = await supabase
          .from('workspace_billing')
          .select('workspace_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!billing) {
          console.error('Could not find workspace for failed invoice:', customerId)
          break
        }

        await recordInvoice(billing.workspace_id, invoice.id, {
          amount_due: invoice.amount_due,
          amount_paid: 0,
          currency: invoice.currency,
          status: 'open',
          description: invoice.description || undefined,
          invoice_url: invoice.hosted_invoice_url || undefined,
        })

        console.log(`Invoice payment failed: ${invoice.id} for workspace ${billing.workspace_id}`)
        // TODO: Consider sending notification to workspace owner about failed payment
        break
      }

      // ============================================
      // CHECKOUT SESSION EXPIRED
      // ============================================
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const sessionType = session.metadata?.type

        // Mark add-on purchases as failed if checkout expired
        if (sessionType === 'sms_credits') {
          const purchase = await findPendingSMSPurchase(session.id)
          if (purchase) {
            await markSMSPurchaseFailed(purchase.id)
            console.log(`SMS purchase marked as failed (expired): ${purchase.id}`)
          }
        } else if (sessionType === 'call_minutes') {
          const purchase = await findPendingCallMinutesPurchase(session.id)
          if (purchase) {
            await markCallMinutesPurchaseFailed(purchase.id)
            console.log(`Call minutes purchase marked as failed (expired): ${purchase.id}`)
          }
        }
        break
      }

      default:
        // Log unhandled events for debugging
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

