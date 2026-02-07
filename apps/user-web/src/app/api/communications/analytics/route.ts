import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'

interface CallRecord {
  id: string
  type: string
  direction: 'inbound' | 'outbound'
  duration_seconds: number | null
  twilio_status: string
  created_at: string
  recordings?: Array<{ id: string }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const supabase = createAdminClient()

    // Get calls from the specified time period
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: calls, error } = await supabase
      .from('communications')
      .select(`
        id,
        type,
        direction,
        duration_seconds,
        twilio_status,
        created_at,
        recordings:call_recordings(id)
      `)
      .eq('user_id', session.id)
      .eq('type', 'call')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching call analytics:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const callsData = (calls || []) as CallRecord[]

    // Calculate totals
    const totals = {
      all: callsData.length,
      inbound: callsData.filter((c) => c.direction === 'inbound').length,
      outbound: callsData.filter((c) => c.direction === 'outbound').length,
      missed: callsData.filter(
        (c) =>
          c.twilio_status === 'no-answer' ||
          c.twilio_status === 'busy' ||
          c.twilio_status === 'failed'
      ).length,
      completed: callsData.filter((c) => c.twilio_status === 'completed').length,
    }

    // Calculate average duration (only for completed calls with duration)
    const completedCalls = callsData.filter(
      (c) => c.twilio_status === 'completed' && c.duration_seconds
    )
    const avgDuration =
      completedCalls.length > 0
        ? Math.round(
            completedCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
              completedCalls.length
          )
        : 0

    // Calculate calls by day
    const byDay: Record<string, { date: string; count: number; inbound: number; outbound: number }> = {}
    callsData.forEach((call) => {
      const date = new Date(call.created_at).toISOString().split('T')[0]
      if (!byDay[date]) {
        byDay[date] = { date, count: 0, inbound: 0, outbound: 0 }
      }
      byDay[date].count++
      if (call.direction === 'inbound') {
        byDay[date].inbound++
      } else {
        byDay[date].outbound++
      }
    })

    // Calculate calls by hour of day
    const byHour: Record<number, number> = {}
    for (let i = 0; i < 24; i++) {
      byHour[i] = 0
    }
    callsData.forEach((call) => {
      const hour = new Date(call.created_at).getHours()
      byHour[hour]++
    })

    // Calculate recording rate
    const callsWithRecording = callsData.filter(
      (c) => c.recordings && c.recordings.length > 0
    ).length
    const recordingRate = totals.all > 0 ? callsWithRecording / totals.all : 0

    // Calculate missed rate
    const missedRate = totals.all > 0 ? totals.missed / totals.all : 0

    // Call outcome breakdown
    const outcomes = {
      completed: totals.completed,
      missed: totals.missed,
      other: totals.all - totals.completed - totals.missed,
    }

    return NextResponse.json({
      totals,
      avgDuration,
      byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      byHour: Object.entries(byHour).map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      })),
      missedRate,
      recordingRate,
      outcomes,
      periodDays: days,
    })
  } catch (error) {
    console.error('Error fetching call analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
