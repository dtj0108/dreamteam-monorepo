import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { notes } = await request.json()

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the communication belongs to this user
    const { data: existing, error: fetchError } = await supabase
      .from('communications')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    // Update the notes
    const { data, error } = await supabase
      .from('communications')
      .update({ notes: notes || null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating notes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('communications')
      .select('id, notes')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    return NextResponse.json({ notes: data.notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
