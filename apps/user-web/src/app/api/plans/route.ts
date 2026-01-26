import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Plan type enum matching database
type PlanType = 'workspace_plan' | 'agent_tier'

// Display config for UI metadata
interface DisplayConfig {
  tagline?: string
  badge_text?: string
  human_equivalent?: string
  agent_count?: number
  savings_text?: string
  departments?: Array<{
    name: string
    agents: string[]
  }>
}

// Public plan response shape
interface PublicPlan {
  id: string
  name: string
  slug: string
  description: string | null
  plan_type: PlanType | null
  price_monthly: number | null
  price_yearly: number | null
  features: string[]
  is_coming_soon: boolean
  display_config: DisplayConfig
  stripe_price_id: string | null
  stripe_price_id_yearly: string | null
}

/**
 * GET /api/plans - Public endpoint to fetch pricing plans
 *
 * Query params:
 *   - type: 'workspace_plan' | 'agent_tier' - Filter by plan type
 *
 * Response is cached for 60 seconds with stale-while-revalidate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type') as PlanType | null

    const supabase = createAdminClient()

    // Build query for active plans only
    let query = supabase
      .from('plans')
      .select(`
        id,
        name,
        slug,
        description,
        plan_type,
        price_monthly,
        price_yearly,
        features,
        is_coming_soon,
        display_config,
        stripe_price_id,
        stripe_price_id_yearly
      `)
      .eq('is_active', true)
      .order('price_monthly', { ascending: true, nullsFirst: true })

    // Apply type filter if provided
    if (typeFilter && ['workspace_plan', 'agent_tier'].includes(typeFilter)) {
      query = query.eq('plan_type', typeFilter)
    }

    const { data: plans, error } = await query

    if (error) {
      console.error('Plans query error:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    // Transform to public shape with defaults
    const publicPlans: PublicPlan[] = (plans || []).map((plan: NonNullable<typeof plans>[number]) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      plan_type: plan.plan_type,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features || [],
      is_coming_soon: plan.is_coming_soon ?? false,
      display_config: plan.display_config || {},
      stripe_price_id: plan.stripe_price_id,
      stripe_price_id_yearly: plan.stripe_price_id_yearly
    }))

    // Return with caching headers
    return NextResponse.json(
      { plans: publicPlans },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    )
  } catch (err) {
    console.error('Plans GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
