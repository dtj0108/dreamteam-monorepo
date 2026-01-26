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
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = createAdminClient()

    let query = supabase
      .from('scheduled_sms')
      .select('*')
      .eq('user_id', session.id)
      .order('scheduled_for', { ascending: true })

    // Filter by lead
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    // Filter by contact
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by date range (for calendar view)
    if (startDate) {
      query = query.gte('scheduled_for', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_for', endDate)
    }

    const { data: scheduled, error } = await query

    if (error) {
      console.error('Error fetching scheduled SMS:', error)
      return NextResponse.json({ error: 'Failed to fetch scheduled SMS' }, { status: 500 })
    }

    return NextResponse.json(scheduled || [])
  } catch (error) {
    console.error('Error fetching scheduled SMS:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
