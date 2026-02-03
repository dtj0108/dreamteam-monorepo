import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const leadId = searchParams.get('leadId')
    const contactId = searchParams.get('contactId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()

    let query = supabase
      .from('scheduled_calls')
      .select('*')
      .eq('user_id', session.id)
      .order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    } else {
      // Default to pending and reminded (upcoming calls)
      query = query.in('status', ['pending', 'reminded'])
    }

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching scheduled calls:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching scheduled calls:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')?.split(',')

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided for cancellation' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Cancel scheduled calls (only pending ones)
    const { error } = await supabase
      .from('scheduled_calls')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', session.id)
      .in('id', ids)
      .in('status', ['pending', 'reminded'])

    if (error) {
      console.error('Error cancelling scheduled calls:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, cancelled: ids.length })
  } catch (error) {
    console.error('Error cancelling scheduled calls:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
