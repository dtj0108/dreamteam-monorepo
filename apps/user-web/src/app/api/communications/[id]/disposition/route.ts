import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

const VALID_DISPOSITIONS = [
  'interested',
  'not_interested',
  'follow_up',
  'voicemail',
  'no_answer',
  'wrong_number',
  'do_not_call',
  'other',
]

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
    const { disposition } = await request.json()

    // Validate disposition value
    if (disposition && !VALID_DISPOSITIONS.includes(disposition)) {
      return NextResponse.json(
        { error: `Invalid disposition. Must be one of: ${VALID_DISPOSITIONS.join(', ')}` },
        { status: 400 }
      )
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

    // Update the disposition
    const { data, error } = await supabase
      .from('communications')
      .update({ disposition: disposition || null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating disposition:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating disposition:', error)
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
      .select('id, disposition')
      .eq('id', id)
      .eq('user_id', session.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    return NextResponse.json({ disposition: data.disposition })
  } catch (error) {
    console.error('Error fetching disposition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
