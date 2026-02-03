import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { getCustomerSubscriptions, getCustomerPaymentMethods } from '@/lib/stripe-analytics'
import Stripe from 'stripe'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface InvoiceData {
  id: string
  number: string | null
  amount_due: number
  amount_paid: number
  currency: string
  status: Stripe.Invoice.Status | null
  created: number
  paid_at: number | null | undefined
  invoice_url: string | null | undefined
  invoice_pdf: string | null | undefined
}

/**
 * GET /api/admin/billing/workspace/[id]
 * Get detailed billing information for a specific workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id: workspaceId } = await params
  const supabase = createAdminClient()

  try {
    // Fetch workspace and billing info
    const [workspaceResult, billingResult, eventsResult] = await Promise.all([
      supabase
        .from('workspaces')
        .select(`
          id,
          name,
          created_at,
          owner:profiles!workspaces_owner_id_fkey(id, email, name)
        `)
        .eq('id', workspaceId)
        .single(),
      supabase
        .from('workspace_billing')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single(),
      supabase
        .from('billing_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (workspaceResult.error || !workspaceResult.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const workspace = workspaceResult.data
    const billing = billingResult.data

    // Fetch Stripe details if customer exists
    let stripeSubscriptions: Stripe.Subscription[] = []
    let stripePaymentMethods: Stripe.PaymentMethod[] = []

    if (billing?.stripe_customer_id) {
      try {
        const [subs, pms] = await Promise.all([
          getCustomerSubscriptions(billing.stripe_customer_id),
          getCustomerPaymentMethods(billing.stripe_customer_id),
        ])
        stripeSubscriptions = subs
        stripePaymentMethods = pms
      } catch (stripeErr) {
        console.error('[billing/workspace] Stripe error:', stripeErr)
        // Continue without Stripe data
      }
    }

    // Get alerts for this workspace
    const { data: alerts } = await supabase
      .from('billing_alerts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('status', ['new', 'acknowledged'])
      .order('created_at', { ascending: false })
      .limit(10)

    // Get invoices from Stripe
    let invoices: InvoiceData[] = []
    if (billing?.stripe_customer_id) {
      try {
        const stripe = getStripe()
        const invoiceList = await stripe.invoices.list({
          customer: billing.stripe_customer_id,
          limit: 20,
        })
        invoices = invoiceList.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          status: inv.status,
          created: inv.created,
          paid_at: inv.status_transitions?.paid_at,
          invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
        }))
      } catch (stripeErr) {
        console.error('[billing/workspace] Error fetching invoices:', stripeErr)
      }
    }

    return NextResponse.json({
      workspace,
      billing,
      events: eventsResult.data || [],
      alerts: alerts || [],
      stripe: {
        subscriptions: stripeSubscriptions.map(sub => ({
          id: sub.id,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          items: sub.items.data.map(item => ({
            id: item.id,
            price_id: item.price.id,
            product: (item.price.product as { name?: string })?.name || 'Unknown',
            unit_amount: item.price.unit_amount,
            interval: item.price.recurring?.interval,
          })),
        })),
        paymentMethods: stripePaymentMethods.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
        })),
        invoices,
      },
    })
  } catch (err) {
    console.error('[billing/workspace] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch workspace billing details' },
      { status: 500 }
    )
  }
}
