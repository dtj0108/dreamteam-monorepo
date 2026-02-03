import { getStripe } from './stripe'
import Stripe from 'stripe'

/**
 * Stripe Analytics Utilities
 * Functions for calculating billing metrics from Stripe data
 */

export interface BillingStats {
  mrr: number // Monthly Recurring Revenue in cents
  activeSubscriptions: number
  churnRate: number // Percentage
  failedPayments: number
  totalRevenue30d: number // Revenue in last 30 days in cents
  trialSubscriptions: number
}

export interface RevenueDataPoint {
  date: string // ISO date string
  revenue: number // In cents
  invoiceCount: number
}

export interface PlanDistribution {
  plan: string
  count: number
  revenue: number // Monthly revenue in cents
}

export interface SubscriptionMetrics {
  created30d: number
  canceled30d: number
  upgraded30d: number
  downgraded30d: number
}

/**
 * Calculate MRR (Monthly Recurring Revenue) from active subscriptions
 * Normalizes yearly subscriptions to monthly
 */
export async function calculateMRR(): Promise<number> {
  const stripe = getStripe()
  let mrr = 0
  let hasMore = true
  let startingAfter: string | undefined = undefined

  while (hasMore) {
    const subscriptionsResponse: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.items.data.price'],
    })

    for (const sub of subscriptionsResponse.data) {
      for (const item of sub.items.data) {
        const price = item.price
        const amount = price.unit_amount || 0
        const interval = price.recurring?.interval
        const intervalCount = price.recurring?.interval_count || 1

        // Normalize to monthly
        if (interval === 'year') {
          mrr += Math.round(amount / (12 * intervalCount))
        } else if (interval === 'month') {
          mrr += Math.round(amount / intervalCount)
        } else if (interval === 'week') {
          mrr += Math.round((amount * 4) / intervalCount)
        } else if (interval === 'day') {
          mrr += Math.round((amount * 30) / intervalCount)
        }
      }
    }

    hasMore = subscriptionsResponse.has_more
    if (subscriptionsResponse.data.length > 0) {
      startingAfter = subscriptionsResponse.data[subscriptionsResponse.data.length - 1].id
    }
  }

  return mrr
}

/**
 * Get count of active subscriptions
 */
export async function getActiveSubscriptionCount(): Promise<number> {
  const stripe = getStripe()
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 1,
  })
  return subscriptions.data.length > 0
    ? (await stripe.subscriptions.list({ status: 'active', limit: 100 })).data.length
    : 0
}

/**
 * Get count of subscriptions in trial
 */
export async function getTrialSubscriptionCount(): Promise<number> {
  const stripe = getStripe()
  const subscriptions = await stripe.subscriptions.list({
    status: 'trialing',
    limit: 100,
  })
  return subscriptions.data.length
}

/**
 * Calculate churn rate for the last 30 days
 * Churn = canceled subscriptions / (active + canceled) * 100
 */
export async function calculateChurnRate30d(): Promise<number> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  // Get canceled subscriptions in last 30 days
  const canceled = await stripe.subscriptions.list({
    status: 'canceled',
    limit: 100,
    created: { gte: thirtyDaysAgo },
  })

  // Get all active subscriptions for denominator
  const active = await stripe.subscriptions.list({
    status: 'active',
    limit: 100,
  })

  const canceledCount = canceled.data.length
  const activeCount = active.data.length
  const total = activeCount + canceledCount

  if (total === 0) return 0
  return Math.round((canceledCount / total) * 10000) / 100 // Returns percentage with 2 decimal places
}

/**
 * Get count of failed payment attempts pending recovery
 */
export async function getFailedPaymentCount(): Promise<number> {
  const stripe = getStripe()
  const invoices = await stripe.invoices.list({
    status: 'open',
    limit: 100,
  })

  // Count invoices that have had at least one failed payment attempt
  const failedInvoices = invoices.data.filter(inv => (inv.attempt_count || 0) > 0)
  return failedInvoices.length
}

/**
 * Get total revenue for a time period from paid invoices
 */
export async function getRevenue(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  const stripe = getStripe()
  let totalRevenue = 0
  let hasMore = true
  let startingAfter: string | undefined = undefined

  while (hasMore) {
    const invoicesResponse: Stripe.ApiList<Stripe.Invoice> = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
      starting_after: startingAfter,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    })

    for (const invoice of invoicesResponse.data) {
      totalRevenue += invoice.amount_paid
    }

    hasMore = invoicesResponse.has_more
    if (invoicesResponse.data.length > 0) {
      startingAfter = invoicesResponse.data[invoicesResponse.data.length - 1].id
    }
  }

  return totalRevenue
}

/**
 * Get revenue time series data for charts
 */
export async function getRevenueTimeSeries(
  days: number = 30
): Promise<RevenueDataPoint[]> {
  const stripe = getStripe()
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

  // Initialize data points for each day
  const dataPoints: Map<string, RevenueDataPoint> = new Map()
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    dataPoints.set(dateStr, { date: dateStr, revenue: 0, invoiceCount: 0 })
  }

  // Fetch paid invoices
  let hasMore = true
  let startingAfter: string | undefined = undefined

  while (hasMore) {
    const invoicesResponse: Stripe.ApiList<Stripe.Invoice> = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
      starting_after: startingAfter,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    })

    for (const invoice of invoicesResponse.data) {
      const paidAt = invoice.status_transitions?.paid_at
      if (paidAt) {
        const dateStr = new Date(paidAt * 1000).toISOString().split('T')[0]
        const point = dataPoints.get(dateStr)
        if (point) {
          point.revenue += invoice.amount_paid
          point.invoiceCount++
        }
      }
    }

    hasMore = invoicesResponse.has_more
    if (invoicesResponse.data.length > 0) {
      startingAfter = invoicesResponse.data[invoicesResponse.data.length - 1].id
    }
  }

  return Array.from(dataPoints.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get subscription distribution by plan/price
 */
export async function getPlanDistribution(): Promise<PlanDistribution[]> {
  const stripe = getStripe()
  const distribution: Map<string, PlanDistribution> = new Map()

  let hasMore = true
  let startingAfter: string | undefined = undefined

  while (hasMore) {
    const subscriptionsResponse: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.items.data.price.product'],
    })

    for (const sub of subscriptionsResponse.data) {
      for (const item of sub.items.data) {
        const price = item.price
        const product = price.product as { name?: string } | string
        const productName = typeof product === 'object' ? product?.name || 'Unknown' : 'Unknown'
        const amount = price.unit_amount || 0

        // Normalize to monthly
        let monthlyAmount = amount
        const interval = price.recurring?.interval
        if (interval === 'year') {
          monthlyAmount = Math.round(amount / 12)
        }

        const existing = distribution.get(productName)
        if (existing) {
          existing.count++
          existing.revenue += monthlyAmount
        } else {
          distribution.set(productName, {
            plan: productName,
            count: 1,
            revenue: monthlyAmount,
          })
        }
      }
    }

    hasMore = subscriptionsResponse.has_more
    if (subscriptionsResponse.data.length > 0) {
      startingAfter = subscriptionsResponse.data[subscriptionsResponse.data.length - 1].id
    }
  }

  return Array.from(distribution.values()).sort((a, b) => b.count - a.count)
}

/**
 * Get comprehensive billing stats
 */
export async function getBillingStats(): Promise<BillingStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [mrr, activeSubscriptions, churnRate, failedPayments, totalRevenue30d, trialSubscriptions] =
    await Promise.all([
      calculateMRR(),
      getActiveSubscriptionCount(),
      calculateChurnRate30d(),
      getFailedPaymentCount(),
      getRevenue(thirtyDaysAgo),
      getTrialSubscriptionCount(),
    ])

  return {
    mrr,
    activeSubscriptions,
    churnRate,
    failedPayments,
    totalRevenue30d,
    trialSubscriptions,
  }
}

/**
 * Get subscription metrics for the last 30 days
 */
export async function getSubscriptionMetrics30d(): Promise<SubscriptionMetrics> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  // Get subscriptions created in last 30 days
  const created = await stripe.subscriptions.list({
    limit: 100,
    created: { gte: thirtyDaysAgo },
  })

  // Get subscriptions canceled in last 30 days
  const canceled = await stripe.subscriptions.list({
    status: 'canceled',
    limit: 100,
    created: { gte: thirtyDaysAgo },
  })

  return {
    created30d: created.data.length,
    canceled30d: canceled.data.length,
    upgraded30d: 0, // Would need to track in billing_events
    downgraded30d: 0, // Would need to track in billing_events
  }
}

/**
 * Get a specific customer's subscription details
 */
export async function getCustomerSubscriptions(customerId: string) {
  const stripe = getStripe()
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
    expand: ['data.items.data.price.product'],
  })
  return subscriptions.data
}

/**
 * Get payment method details for a customer
 */
export async function getCustomerPaymentMethods(customerId: string) {
  const stripe = getStripe()
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
    limit: 5,
  })
  return paymentMethods.data
}

/**
 * Format cents to currency string
 */
export function formatCurrency(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}
