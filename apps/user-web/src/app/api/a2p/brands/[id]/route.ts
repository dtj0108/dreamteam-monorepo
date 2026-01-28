import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentWorkspaceId } from '@/lib/workspace-utils'
import { UpdateBrandInput } from '@/types/a2p'
import { z } from 'zod'

// Validation schema for updates (all fields optional)
const updateBrandSchema = z.object({
  brand_name: z.string().min(1).max(100).optional(),
  business_type: z
    .enum([
      'sole_proprietor',
      'corporation',
      'llc',
      'partnership',
      'non_profit',
      'government',
    ])
    .optional(),
  ein: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+1\d{10}$/).optional(),
  website: z.string().url().optional().or(z.literal('')),
  street: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2).optional(),
  postal_code: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  country: z.string().optional(),
  vertical: z
    .enum([
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
    ])
    .optional(),
})

// GET /api/a2p/brands/[id] - Get single brand
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: brand, error } = await supabase
      .from('a2p_brands')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    return NextResponse.json({ brand })
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand' },
      { status: 500 }
    )
  }
}

// PATCH /api/a2p/brands/[id] - Update brand (drafts/rejected only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Special case: manual approval for testing
    if (body.status === 'approved' && body._manualApproval === true) {
      const { data: brand, error } = await supabase
        .from('a2p_brands')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) {
        console.error('Failed to approve brand:', error)
        return NextResponse.json(
          { error: 'Failed to approve brand' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, brand })
    }

    const validation = updateBrandSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const input: UpdateBrandInput = validation.data

    // Verify brand exists and belongs to workspace
    const { data: existingBrand } = await supabase
      .from('a2p_brands')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existingBrand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Only allow editing drafts and rejected brands
    if (!['draft', 'rejected'].includes(existingBrand.status)) {
      return NextResponse.json(
        {
          error: `Cannot edit ${existingBrand.status} brands. Only draft or rejected brands can be edited.`,
        },
        { status: 400 }
      )
    }

    // Check for duplicate brand name if name is being changed
    if (input.brand_name) {
      const { data: duplicate } = await supabase
        .from('a2p_brands')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('brand_name', input.brand_name)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'Brand name already exists in this workspace' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (input.brand_name !== undefined) updates.brand_name = input.brand_name
    if (input.business_type !== undefined)
      updates.business_type = input.business_type
    if (input.ein !== undefined) updates.ein = input.ein
    if (input.email !== undefined) updates.email = input.email
    if (input.phone !== undefined) updates.phone = input.phone
    if (input.website !== undefined) updates.website = input.website
    if (input.street !== undefined) updates.street = input.street
    if (input.city !== undefined) updates.city = input.city
    if (input.state !== undefined) updates.state = input.state
    if (input.postal_code !== undefined) updates.postal_code = input.postal_code
    if (input.country !== undefined) updates.country = input.country
    if (input.vertical !== undefined) updates.vertical = input.vertical

    // Update brand
    const { data: brand, error } = await supabase
      .from('a2p_brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update brand:', error)
      return NextResponse.json(
        { error: 'Failed to update brand' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, brand })
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

// DELETE /api/a2p/brands/[id] - Delete brand (drafts/rejected only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify brand exists and belongs to workspace
    const { data: brand } = await supabase
      .from('a2p_brands')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Only allow deleting drafts and rejected brands
    if (!['draft', 'rejected'].includes(brand.status)) {
      return NextResponse.json(
        {
          error: `Cannot delete ${brand.status} brands. Only draft or rejected brands can be deleted.`,
        },
        { status: 400 }
      )
    }

    // Check for dependent campaigns
    const { data: campaigns } = await supabase
      .from('a2p_campaigns')
      .select('id')
      .eq('brand_id', id)

    if (campaigns && campaigns.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete brand with existing campaigns. Delete campaigns first.',
        },
        { status: 400 }
      )
    }

    // Delete brand
    const { error } = await supabase.from('a2p_brands').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete brand:', error)
      return NextResponse.json(
        { error: 'Failed to delete brand' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}
