import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/plans - Fetch all plans from database
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    const supabase = createAdminClient()

    let query = supabase
      .from('plans')
      .select(`
        *,
        team:teams(id, name, slug)
      `)
      .order('price_monthly', { ascending: true, nullsFirst: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: plans, error: dbError } = await query

    if (dbError) {
      console.error('Plans query error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ plans: plans || [] })
  } catch (err) {
    console.error('Plans GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/plans - Create a new plan
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const body = await request.json()
    const {
      name,
      slug,
      description,
      team_id,
      price_monthly,
      price_yearly,
      features = [],
      limits = {},
      is_active = true,
      is_coming_soon = false,
      plan_type,
      display_config = {}
    } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data, error: dbError } = await supabase
      .from('plans')
      .insert({
        name,
        slug: finalSlug,
        description: description || null,
        team_id: team_id || null,
        price_monthly: price_monthly ?? null,
        price_yearly: price_yearly ?? null,
        features,
        limits,
        is_active,
        is_coming_soon,
        plan_type: plan_type || null,
        display_config
      })
      .select(`
        *,
        team:teams(id, name, slug)
      `)
      .single()

    if (dbError) {
      console.error('Create plan error:', dbError)
      if (dbError.code === '23505') {
        return NextResponse.json({ error: 'A plan with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'plan_created',
      'plan',
      data.id,
      { name, slug: finalSlug, plan_type },
      request
    )

    return NextResponse.json({ plan: data }, { status: 201 })
  } catch (err) {
    console.error('Plans POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
