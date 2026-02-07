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
  savePaymentMethodFromIntent,
  type WorkspacePlan,
  type AgentTier,
  type SubscriptionStatus,
  getTierLevel,
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
import { autoDeployTeamForPlan, applyPendingTierChange } from '@dreamteam/database'
import {
  logBillingEvent,
  logSubscriptionCreated,
  logSubscriptionUpdated,
  logSubscriptionCanceled,
  logPaymentSucceeded,
  logPaymentFailed,
  logAddonPurchased,
} from '@/lib/billing-events'

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

            // Log billing event
            await logAddonPurchased(
              purchase.workspace_id,
              'sms_credits',
              bundleType,
              session.amount_total || 0,
              session.id
            )

            // Save payment method from the completed checkout session
            const paymentIntentId = session.payment_intent as string
            console.log(`[webhook] Attempting to save payment method. PI: ${paymentIntentId}, workspace: ${purchase.workspace_id}`)
            if (paymentIntentId && purchase.workspace_id) {
              try {
                await savePaymentMethodFromIntent(purchase.workspace_id, paymentIntentId)
                console.log(`[webhook] Payment method saved successfully for workspace ${purchase.workspace_id}`)
              } catch (pmError) {
                console.error('[webhook] Failed to save payment method:', pmError)
                // Log full error details
                if (pmError instanceof Error) {
                  console.error('[webhook] Error name:', pmError.name)
                  console.error('[webhook] Error message:', pmError.message)
                  console.error('[webhook] Error stack:', pmError.stack)
                }
                // Don't fail the webhook - credits were still added
              }
            } else {
              console.error(`[webhook] Missing data: paymentIntentId=${paymentIntentId}, workspace_id=${purchase.workspace_id}`)
            }
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

            // Log billing event
            await logAddonPurchased(
              purchase.workspace_id,
              'call_minutes',
              bundleType,
              session.amount_total || 0,
              session.id
            )

            // Save payment method from the completed checkout session
            const paymentIntentId = session.payment_intent as string
            console.log(`[webhook] Attempting to save payment method. PI: ${paymentIntentId}, workspace: ${purchase.workspace_id}`)
            if (paymentIntentId && purchase.workspace_id) {
              try {
                await savePaymentMethodFromIntent(purchase.workspace_id, paymentIntentId)
                console.log(`[webhook] Payment method saved successfully for workspace ${purchase.workspace_id}`)
              } catch (pmError) {
                console.error('[webhook] Failed to save payment method:', pmError)
                // Log full error details
                if (pmError instanceof Error) {
                  console.error('[webhook] Error name:', pmError.name)
                  console.error('[webhook] Error message:', pmError.message)
                  console.error('[webhook] Error stack:', pmError.stack)
                }
                // Don't fail the webhook - minutes were still added
              }
            } else {
              console.error(`[webhook] Missing data: paymentIntentId=${paymentIntentId}, workspace_id=${purchase.workspace_id}`)
            }
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
        await updateBillingFromSubscription(
          workspaceId,
          subscriptionId,
          sessionType as 'workspace_plan' | 'agent_tier',
          targetPlan
        )

        // Retrieve subscription once for status + logging
        const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId)

        // Auto-deploy team for agent tier subscriptions (active only)
        if (sessionType === 'agent_tier' && targetPlan && fullSubscription.status === 'active') {
          console.log(`[auto-deploy] Triggering deployment for workspace ${workspaceId} with plan ${targetPlan}`)

          // Set deploy status to pending before attempting
          await supabase
            .from('workspace_billing')
            .update({
              agent_deploy_status: 'pending',
              agent_deploy_error: null,
              agent_deploy_attempted_at: new Date().toISOString(),
            })
            .eq('workspace_id', workspaceId)

          try {
            const deployResult = await autoDeployTeamForPlan(workspaceId, targetPlan)
            if (deployResult.deployed) {
              console.log(`[auto-deploy] Successfully deployed team ${deployResult.teamId} to workspace ${workspaceId}`)
              await supabase
                .from('workspace_billing')
                .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
                .eq('workspace_id', workspaceId)
            } else {
              console.error(`[auto-deploy] Failed to deploy team for workspace ${workspaceId}: ${deployResult.error}`)
              await supabase
                .from('workspace_billing')
                .update({ agent_deploy_status: 'failed', agent_deploy_error: deployResult.error || 'deploy_failed' })
                .eq('workspace_id', workspaceId)
              await supabase.from('billing_alerts').insert({
                workspace_id: workspaceId,
                alert_type: 'deploy_failed',
                severity: 'high',
                title: 'Agent deployment failed',
                description: `Auto-deploy failed after checkout for plan ${targetPlan}: ${deployResult.error || 'unknown error'}`,
              })
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'unknown error'
            console.error(`[auto-deploy] Deploy error for workspace ${workspaceId}:`, err)
            await supabase
              .from('workspace_billing')
              .update({ agent_deploy_status: 'failed', agent_deploy_error: errMsg })
              .eq('workspace_id', workspaceId)
            await supabase.from('billing_alerts').insert({
              workspace_id: workspaceId,
              alert_type: 'deploy_failed',
              severity: 'high',
              title: 'Agent deployment failed',
              description: `Auto-deploy threw error after checkout for plan ${targetPlan}: ${errMsg}`,
            })
          }
        }

        // Log billing event for subscription creation
        await logSubscriptionCreated(
          workspaceId,
          fullSubscription,
          event.id,
          sessionType as 'workspace_plan' | 'agent_tier',
          targetPlan || ''
        )

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

        const resolveAgentTier = async (): Promise<AgentTier | null> => {
          const metadataTier = subscription.metadata?.agent_tier || subscription.metadata?.target_plan
          if (metadataTier) {
            return metadataTier as AgentTier
          }

          const priceId = subscription.items?.data?.[0]?.price?.id
          if (!priceId) return null

          const { data: plan } = await supabase
            .from('plans')
            .select('slug')
            .eq('plan_type', 'agent_tier')
            .eq('stripe_price_id', priceId)
            .single()

          return (plan?.slug as AgentTier) || null
        }

        const applyAgentTierUpdate = async (workspaceId: string, targetPlan: AgentTier | null) => {
          if (!targetPlan) return

          const { data: billing } = await supabase
            .from('workspace_billing')
            .select('agent_tier, agent_tier_pending, agent_tier_pending_effective_at')
            .eq('workspace_id', workspaceId)
            .single()

          const currentTier = (billing?.agent_tier as AgentTier) || 'none'
          const pendingTier = (billing?.agent_tier_pending as AgentTier | null) || null
          const pendingEffectiveAt = billing?.agent_tier_pending_effective_at || null

          const isDowngrade = getTierLevel(targetPlan) < getTierLevel(currentTier)
          const isUpgrade = getTierLevel(targetPlan) > getTierLevel(currentTier)

          const periodEndTs = (subscription as unknown as { current_period_end?: number }).current_period_end
          const periodEnd = typeof periodEndTs === 'number'
            ? new Date(periodEndTs * 1000).toISOString()
            : null

          if (isDowngrade) {
            await supabase
              .from('workspace_billing')
              .update({
                stripe_agent_subscription_id: subscription.id,
                agent_status: subscription.status as SubscriptionStatus,
                agent_period_end: periodEnd,
                agent_tier_pending: targetPlan,
                agent_tier_pending_effective_at: periodEnd,
              })
              .eq('workspace_id', workspaceId)
            return
          }

          if (isUpgrade) {
            if (subscription.status === 'active') {
              await supabase
                .from('workspace_billing')
                .update({
                  stripe_agent_subscription_id: subscription.id,
                  agent_tier: targetPlan,
                  agent_status: subscription.status as SubscriptionStatus,
                  agent_period_end: periodEnd,
                  agent_tier_pending: null,
                  agent_tier_pending_effective_at: null,
                  agent_deploy_status: 'pending',
                  agent_deploy_error: null,
                  agent_deploy_attempted_at: new Date().toISOString(),
                })
                .eq('workspace_id', workspaceId)

              try {
                const deployResult = await autoDeployTeamForPlan(workspaceId, targetPlan)
                if (deployResult.deployed) {
                  await supabase
                    .from('workspace_billing')
                    .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
                    .eq('workspace_id', workspaceId)
                } else {
                  console.error(`[auto-deploy] Failed to deploy team for workspace ${workspaceId}: ${deployResult.error}`)
                  await supabase
                    .from('workspace_billing')
                    .update({ agent_deploy_status: 'failed', agent_deploy_error: deployResult.error || 'deploy_failed' })
                    .eq('workspace_id', workspaceId)
                  await supabase.from('billing_alerts').insert({
                    workspace_id: workspaceId,
                    alert_type: 'deploy_failed',
                    severity: 'high',
                    title: 'Agent deployment failed',
                    description: `Auto-deploy failed after upgrade to ${targetPlan}: ${deployResult.error || 'unknown error'}`,
                  })
                }
              } catch (err) {
                const errMsg = err instanceof Error ? err.message : 'unknown error'
                console.error(`[auto-deploy] Deploy error for workspace ${workspaceId}:`, err)
                await supabase
                  .from('workspace_billing')
                  .update({ agent_deploy_status: 'failed', agent_deploy_error: errMsg })
                  .eq('workspace_id', workspaceId)
                await supabase.from('billing_alerts').insert({
                  workspace_id: workspaceId,
                  alert_type: 'deploy_failed',
                  severity: 'high',
                  title: 'Agent deployment failed',
                  description: `Auto-deploy threw error after upgrade to ${targetPlan}: ${errMsg}`,
                })
              }
            } else {
              await supabase
                .from('workspace_billing')
                .update({
                  stripe_agent_subscription_id: subscription.id,
                  agent_status: subscription.status as SubscriptionStatus,
                  agent_period_end: periodEnd,
                  agent_tier_pending: targetPlan,
                  agent_tier_pending_effective_at: null,
                })
                .eq('workspace_id', workspaceId)
            }
            return
          }

          // Same tier: update status/period, and apply pending if due + active
          if (
            pendingTier &&
            subscription.status === 'active' &&
            pendingEffectiveAt &&
            new Date(pendingEffectiveAt).getTime() <= Date.now()
          ) {
            // Update subscription status fields first
            await supabase
              .from('workspace_billing')
              .update({
                stripe_agent_subscription_id: subscription.id,
                agent_status: subscription.status as SubscriptionStatus,
                agent_period_end: periodEnd,
              })
              .eq('workspace_id', workspaceId)

            // Use atomic CAS to apply the pending tier change
            const casResult = await applyPendingTierChange(workspaceId, pendingTier)
            if (!casResult.applied) {
              console.warn(`[webhook] CAS did not apply pending tier for workspace ${workspaceId}: ${casResult.error}`)
            } else if (casResult.error) {
              console.error(`[webhook] Pending tier applied but deploy issue for workspace ${workspaceId}: ${casResult.error}`)
            }
          } else {
            await supabase
              .from('workspace_billing')
              .update({
                stripe_agent_subscription_id: subscription.id,
                agent_status: subscription.status as SubscriptionStatus,
                agent_period_end: periodEnd,
              })
              .eq('workspace_id', workspaceId)
          }
        }

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
          const targetPlan = type === 'agent_tier' ? await resolveAgentTier() : undefined
          if (type === 'agent_tier') {
            await applyAgentTierUpdate(billing.workspace_id, targetPlan || null)
          } else {
            await updateBillingFromSubscription(billing.workspace_id, subscription.id, type, targetPlan || undefined)
          }
        } else {
          const targetPlan = subscriptionType === 'agent_tier'
            ? await resolveAgentTier()
            : subscription.metadata?.target_plan

          if (subscriptionType === 'agent_tier') {
            await applyAgentTierUpdate(workspaceId, (targetPlan as AgentTier | null) || null)
          } else {
            await updateBillingFromSubscription(
              workspaceId,
              subscription.id,
              subscriptionType,
              targetPlan || undefined
            )
          }
        }

        // Log billing event for subscription update
        const subWorkspaceId = workspaceId || (await supabase
          .from('workspace_billing')
          .select('workspace_id')
          .or(`stripe_subscription_id.eq.${subscription.id},stripe_agent_subscription_id.eq.${subscription.id}`)
          .single()).data?.workspace_id

        if (subWorkspaceId) {
          await logSubscriptionUpdated(
            subWorkspaceId,
            subscription,
            event.id,
            subscriptionType || 'workspace_plan'
          )
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

        // Log billing event for subscription cancellation
        const canceledWorkspaceId = workspaceId || (await supabase
          .from('workspace_billing')
          .select('workspace_id')
          .or(`stripe_subscription_id.eq.${subscription.id},stripe_agent_subscription_id.eq.${subscription.id}`)
          .single()).data?.workspace_id

        if (canceledWorkspaceId) {
          await logSubscriptionCanceled(
            canceledWorkspaceId,
            subscription,
            event.id,
            subscriptionType || 'workspace_plan'
          )
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

        // Log billing event for successful payment
        await logPaymentSucceeded(billing.workspace_id, invoice, event.id)

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

        // Log billing event for failed payment (also creates alert)
        await logPaymentFailed(billing.workspace_id, invoice, event.id)

        console.log(`Invoice payment failed: ${invoice.id} for workspace ${billing.workspace_id}`)
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

      // ============================================
      // PAYMENT INTENT SUCCEEDED (Direct charges)
      // ============================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const workspaceId = paymentIntent.metadata?.workspace_id
        const chargeType = paymentIntent.metadata?.type
        const isDirectCharge = paymentIntent.metadata?.direct_charge === 'true'

        // Only handle direct charges (not checkout session payments)
        if (!isDirectCharge || !workspaceId) {
          break
        }

        // Direct charges are handled synchronously in the charge endpoint
        // This webhook confirms the charge was successful
        console.log(`Direct charge succeeded for workspace ${workspaceId}: ${chargeType}, amount: ${paymentIntent.amount}`)

        // Update auto_replenish_attempts if this was an auto-replenish charge
        if (paymentIntent.metadata?.auto_replenish_attempt_id) {
          await supabase
            .from('auto_replenish_attempts')
            .update({
              status: 'succeeded',
              stripe_charge_id: paymentIntent.latest_charge as string,
              succeeded_at: new Date().toISOString(),
            })
            .eq('id', paymentIntent.metadata.auto_replenish_attempt_id)
        }
        break
      }

      // ============================================
      // PAYMENT INTENT FAILED (Direct charges)
      // ============================================
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const workspaceId = paymentIntent.metadata?.workspace_id
        const chargeType = paymentIntent.metadata?.type
        const isDirectCharge = paymentIntent.metadata?.direct_charge === 'true'

        if (!isDirectCharge || !workspaceId) {
          break
        }

        const lastError = paymentIntent.last_payment_error
        console.log(`Direct charge failed for workspace ${workspaceId}: ${chargeType}`, lastError?.message)

        // Update auto_replenish_attempts if this was an auto-replenish charge
        if (paymentIntent.metadata?.auto_replenish_attempt_id) {
          await supabase
            .from('auto_replenish_attempts')
            .update({
              status: 'failed',
              error_code: lastError?.code || null,
              error_message: lastError?.message || 'Payment failed',
              failed_at: new Date().toISOString(),
            })
            .eq('id', paymentIntent.metadata.auto_replenish_attempt_id)
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
