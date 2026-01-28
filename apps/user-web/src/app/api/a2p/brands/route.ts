import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentWorkspaceId } from '@/lib/workspace-utils'
import { CreateBrandInput } from '@/types/a2p'
import { z } from 'zod'

// Validation schema
const createBrandSchema = z.object({
  brand_name: z.string().min(1).max(100),
  business_type: z.enum([
    'sole_proprietor',
    'corporation',
    'llc',
    'partnership',
    'non_profit',
    'government',
  ]),
  ein: z.string().optional(),
  email: z.string().email(),
  phone: z.string().regex(/^\+1\d{10}$/),
  website: z.string().url().optional().or(z.literal('')),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  postal_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default('US'),
  vertical: z.enum([
    'professional_services',
    'real_estate',
    'healthcare',
    'retail',
    'technology',
    'financial_services',
    'education',
    'hospitality',
    'transportation',
    'manufacturing',
    'construction',
    'agriculture',
    'energy',
    'media',
    'telecommunications',
    'insurance',
    'legal',
    'other',
  ]),
})

// POST /api/a2p/brands - Create new brand
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 400 }
      )
    }

    // Parse and validate body
    const body = await req.json()
    const validation = createBrandSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const input: CreateBrandInput = validation.data

    // Check for duplicate brand name in workspace
    const { data: existing } = await supabase
      .from('a2p_brands')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('brand_name', input.brand_name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Brand name already exists in this workspace' },
        { status: 400 }
      )
    }

    // Create brand
    const { data: brand, error } = await supabase
      .from('a2p_brands')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        brand_name: input.brand_name,
        business_type: input.business_type,
        ein: input.ein || null,
        email: input.email,
        phone: input.phone,
        website: input.website || null,
        street: input.street,
        city: input.city,
        state: input.state,
        postal_code: input.postal_code,
        country: input.country || 'US',
        vertical: input.vertical,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create brand:', error)
      return NextResponse.json(
        { error: 'Failed to create brand' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, brand })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}

// GET /api/a2p/brands - List brands for current workspace
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 400 }
      )
    }

    const { data: brands, error } = await supabase
      .from('a2p_brands')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch brands:', error)
      return NextResponse.json(
        { error: 'Failed to fetch brands' },
        { status: 500 }
      )
    }

    return NextResponse.json({ brands })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}
