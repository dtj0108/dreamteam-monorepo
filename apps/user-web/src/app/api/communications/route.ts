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
    const leadId = searchParams.get('leadId')
    const contactId = searchParams.get('contactId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()

    let query = supabase
      .from('communications')
      .select(`
        *,
        recordings:call_recordings(*)
      `)
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (leadId) query = query.eq('lead_id', leadId)
    if (contactId) query = query.eq('contact_id', contactId)
    if (type) query = query.eq('type', type)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching communications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
