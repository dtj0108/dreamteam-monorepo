import { getStripe } from './stripe'

export interface Plan {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  price_monthly: number | null
  price_yearly: number | null
  stripe_product_id?: string | null
  stripe_price_id?: string | null
  stripe_price_id_yearly?: string | null
}

export interface StripeSyncResult {
  stripe_product_id: string
  stripe_price_id: string | null
  stripe_price_id_yearly: string | null
  archived_prices: string[]
}

/**
 * Determines if a plan update requires syncing to Stripe.
 * Returns true if prices or product name changed.
 */
export function shouldSyncToStripe(newPlan: Partial<Plan>, oldPlan: Plan): boolean {
  // Check if price_monthly changed
  if (newPlan.price_monthly !== undefined && newPlan.price_monthly !== oldPlan.price_monthly) {
    return true
  }

  // Check if price_yearly changed
  if (newPlan.price_yearly !== undefined && newPlan.price_yearly !== oldPlan.price_yearly) {
    return true
  }

  // Check if name changed (affects Stripe Product)
  if (newPlan.name !== undefined && newPlan.name !== oldPlan.name) {
    return true
  }

  return false
}

/**
 * Syncs a plan to Stripe, creating/updating Product and Prices as needed.
 * Prices are immutable in Stripe, so we create new ones and archive old ones.
 *
 * @param newPlan - The updated plan data (partial, contains only changed fields)
 * @param oldPlan - The current plan data from database
 * @returns Object containing new Stripe IDs and list of archived price IDs
 */
export async function syncPlanToStripe(
  newPlan: Partial<Plan>,
  oldPlan: Plan
): Promise<StripeSyncResult> {
  const stripe = getStripe()
  const archivedPrices: string[] = []

  // Merge new plan data with old plan to get complete state
  const mergedPlan: Plan = { ...oldPlan, ...newPlan }

  // 1. Create or update Stripe Product
  let productId: string = oldPlan.stripe_product_id ?? ''

  if (!productId) {
    // Create new product
    const product = await stripe.products.create({
      name: mergedPlan.name,
      description: mergedPlan.description || undefined,
      metadata: {
        plan_id: oldPlan.id,
        plan_slug: mergedPlan.slug || '',
      },
    })
    productId = product.id
  } else if (newPlan.name !== undefined || newPlan.description !== undefined) {
    // Update existing product if name or description changed
    await stripe.products.update(productId, {
      name: mergedPlan.name,
      description: mergedPlan.description || undefined,
    })
  }

  // Track old prices to archive after we set new defaults
  const pricesToArchive: string[] = []

  // 2. Handle monthly price
  let monthlyPriceId: string | null = oldPlan.stripe_price_id ?? null

  const monthlyPriceChanged =
    newPlan.price_monthly !== undefined && newPlan.price_monthly !== oldPlan.price_monthly

  if (monthlyPriceChanged) {
    // Create new monthly price first (if amount is set)
    if (mergedPlan.price_monthly !== null && mergedPlan.price_monthly > 0) {
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: mergedPlan.price_monthly,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan_id: oldPlan.id,
          billing_period: 'monthly',
        },
      })
      monthlyPriceId = newPrice.id
    } else {
      monthlyPriceId = null
    }

    // Queue old price for archiving
    if (oldPlan.stripe_price_id) {
      pricesToArchive.push(oldPlan.stripe_price_id)
    }
  }

  // 3. Handle yearly price
  let yearlyPriceId: string | null = oldPlan.stripe_price_id_yearly ?? null

  const yearlyPriceChanged =
    newPlan.price_yearly !== undefined && newPlan.price_yearly !== oldPlan.price_yearly

  if (yearlyPriceChanged) {
    // Create new yearly price first (if amount is set)
    if (mergedPlan.price_yearly !== null && mergedPlan.price_yearly > 0) {
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: mergedPlan.price_yearly,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          plan_id: oldPlan.id,
          billing_period: 'yearly',
        },
      })
      yearlyPriceId = newPrice.id
    } else {
      yearlyPriceId = null
    }

    // Queue old price for archiving
    if (oldPlan.stripe_price_id_yearly) {
      pricesToArchive.push(oldPlan.stripe_price_id_yearly)
    }
  }

  // 4. Archive old prices (handling default_price constraint)
  for (const priceId of pricesToArchive) {
    try {
      // First, try to archive directly
      await stripe.prices.update(priceId, { active: false })
      archivedPrices.push(priceId)
    } catch (err) {
      // If it fails because it's the default price, we need to change the default first
      const isDefaultPriceError =
        err instanceof Error && err.message.includes('default price')

      if (isDefaultPriceError) {
        // Get the price to find its product
        const price = await stripe.prices.retrieve(priceId)
        const priceProductId = typeof price.product === 'string'
          ? price.product
          : price.product.id

        // Set a new default price on that product
        const newDefaultPrice = monthlyPriceId || yearlyPriceId
        if (newDefaultPrice && priceProductId === productId) {
          // Only update if it's our product and we have a new price
          await stripe.products.update(priceProductId, {
            default_price: newDefaultPrice,
          })
          // Now try archiving again
          await stripe.prices.update(priceId, { active: false })
          archivedPrices.push(priceId)
        } else {
          // Price belongs to a different product or we have no replacement
          // Skip archiving - the price will remain active but unused
          console.warn(
            `Skipping archive of price ${priceId}: it's the default on product ${priceProductId} and we can't replace it`
          )
        }
      } else {
        // Re-throw unexpected errors
        throw err
      }
    }
  }

  return {
    stripe_product_id: productId,
    stripe_price_id: monthlyPriceId,
    stripe_price_id_yearly: yearlyPriceId,
    archived_prices: archivedPrices,
  }
}
