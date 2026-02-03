import { getStripe } from './stripe'

export interface StripePriceDetails {
  amount: number | null  // in cents
  currency: string
  interval: 'month' | 'year' | null
}

export interface PlanPricing {
  slug: string
  priceMonthly: number | null  // in cents
  priceYearly: number | null   // in cents
  currency: string
}

/**
 * Fetch price details from Stripe for a single price ID
 */
export async function getStripePriceDetails(priceId: string): Promise<StripePriceDetails> {
  const stripe = getStripe()
  const price = await stripe.prices.retrieve(priceId)
  return {
    amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval as 'month' | 'year' | null,
  }
}

/**
 * Batch fetch prices from Stripe for multiple price IDs
 * Returns a Map of priceId -> price details
 */
export async function fetchStripePrices(
  priceIds: string[]
): Promise<Map<string, StripePriceDetails>> {
  if (priceIds.length === 0) {
    return new Map()
  }

  const stripe = getStripe()
  const priceMap = new Map<string, StripePriceDetails>()

  // Stripe's prices.list doesn't have a direct "ids" filter,
  // so we need to fetch prices individually or use a workaround
  // For efficiency, we'll fetch them in parallel
  const pricePromises = priceIds.map(async (priceId) => {
    try {
      const price = await stripe.prices.retrieve(priceId)
      return {
        id: priceId,
        details: {
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval as 'month' | 'year' | null,
        },
      }
    } catch (error) {
      console.error(`Failed to fetch price ${priceId}:`, error)
      return null
    }
  })

  const results = await Promise.all(pricePromises)

  for (const result of results) {
    if (result) {
      priceMap.set(result.id, result.details)
    }
  }

  return priceMap
}

/**
 * Fetch prices for multiple plans and merge with plan data
 * Returns map of slug -> pricing info
 */
export async function fetchPlanPricesFromStripe(plans: Array<{
  slug: string
  stripe_price_id: string | null
  stripe_price_id_yearly: string | null
}>): Promise<Map<string, PlanPricing>> {
  // Collect all unique price IDs
  const priceIds = plans.flatMap(p => [
    p.stripe_price_id,
    p.stripe_price_id_yearly,
  ]).filter((id): id is string => Boolean(id))

  // Fetch all prices in parallel
  const stripePrices = await fetchStripePrices(priceIds)

  // Build the result map
  const result = new Map<string, PlanPricing>()

  for (const plan of plans) {
    const monthlyPrice = plan.stripe_price_id
      ? stripePrices.get(plan.stripe_price_id)
      : null
    const yearlyPrice = plan.stripe_price_id_yearly
      ? stripePrices.get(plan.stripe_price_id_yearly)
      : null

    result.set(plan.slug, {
      slug: plan.slug,
      priceMonthly: monthlyPrice?.amount ?? null,
      priceYearly: yearlyPrice?.amount ?? null,
      currency: monthlyPrice?.currency ?? yearlyPrice?.currency ?? 'usd',
    })
  }

  return result
}
