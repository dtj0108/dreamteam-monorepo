import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getRateLimitHeaders, rateLimitPresets } from '@dreamteam/auth'
import { sendPreTaskNotification } from '@/lib/agent-messaging'

/**
 * Vercel Cron endpoint - called periodically to send pre-task notifications
 * Sends notifications 30-60 minutes before scheduled tasks run
 */
export async function GET(request: NextRequest) {
  // Rate limiting - use IP address as identifier
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.cron)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    )
  }

  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const sixtyMinsFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  // Find schedules running in the next 60 mins that haven't been pre-notified
  // We'll pick a random time within the 30-60 min window for each schedule
  const { data: upcomingSchedules, error } = await supabase
    .from('agent_schedules')
    .select(`*, agent:ai_agents(id, name, workspace_id)`)
    .eq('is_enabled', true)
    .gt('next_run_at', now.toISOString())
    .lte('next_run_at', sixtyMinsFromNow.toISOString())
    .or(`pre_notified_for_run_at.is.null,pre_notified_for_run_at.neq.next_run_at`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{
    schedule_id: string
    name: string
    success: boolean
    recipientCount: number
    errors: string[]
    skipped?: boolean
  }> = []

  for (const schedule of upcomingSchedules || []) {
    const nextRunAt = new Date(schedule.next_run_at)
    const minsUntilRun = (nextRunAt.getTime() - now.getTime()) / (60 * 1000)

    // Random timing: notify somewhere between 30-60 mins before
    // If we're already inside the 30-min window, send immediately
    // If we're in the 30-60 min window, randomly decide whether to send now
    if (minsUntilRun > 30) {
      // Still in the 30-60 min window - use probability to randomize timing
      // The closer to 30 mins, the higher the chance we send
      const probabilityToSend = (60 - minsUntilRun) / 30  // 0 at 60 mins, 1 at 30 mins
      if (Math.random() > probabilityToSend) {
        results.push({
          schedule_id: schedule.id,
          name: schedule.name,
          success: false,
          recipientCount: 0,
          errors: [],
          skipped: true
        })
        continue  // Skip this time, we'll catch it in a later cron run
      }
    }

    // Send pre-notification
    const result = await sendPreTaskNotification({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      nextRunAt: new Date(schedule.next_run_at),
      aiAgentId: schedule.agent_id,
      workspaceId: schedule.agent?.workspace_id || null,
      scheduleCreatedBy: schedule.created_by,
      timezone: schedule.timezone,
      supabase
    })

    // Mark as pre-notified
    if (result.success) {
      await supabase
        .from('agent_schedules')
        .update({ pre_notified_for_run_at: schedule.next_run_at })
        .eq('id', schedule.id)
    }

    results.push({
      schedule_id: schedule.id,
      name: schedule.name,
      ...result
    })
  }

  return NextResponse.json({
    message: 'Pre-notifications checked',
    checked_at: now.toISOString(),
    count: results.length,
    results
  })
}

export { GET as POST }
