import { createAdminClient } from '@/lib/supabase-server'
import { sendPushToUser } from '@/lib/push-notifications'

export interface ProcessResult {
  processed: number
  reminded: number
  missed: number
  errors: Array<{ id: string; error: string }>
}

interface ScheduledCall {
  id: string
  user_id: string
  lead_id: string | null
  contact_id: string | null
  from_number: string
  to_number: string
  scheduled_for: string
  status: string
  notes: string | null
  reminder_sent_at: string | null
}

/**
 * Process scheduled calls:
 * 1. Send reminders for calls due within 15 minutes
 * 2. Mark calls as missed if past due and not completed
 * This function should be called by a cron job every minute.
 */
export async function processScheduledCalls(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    reminded: 0,
    missed: 0,
    errors: [],
  }

  const supabase = createAdminClient()
  const now = new Date()
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)

  // 1. Find pending calls due within 15 minutes that haven't been reminded
  const { data: upcomingCalls, error: fetchError } = await supabase
    .from('scheduled_calls')
    .select('*')
    .eq('status', 'pending')
    .is('reminder_sent_at', null)
    .lte('scheduled_for', fifteenMinutesFromNow.toISOString())
    .gte('scheduled_for', now.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50)

  if (fetchError) {
    console.error('Error fetching upcoming scheduled calls:', fetchError)
    return result
  }

  // 2. Process reminders
  if (upcomingCalls && upcomingCalls.length > 0) {
    for (const call of upcomingCalls as ScheduledCall[]) {
      result.processed++

      try {
        // Send push notification reminder
        const scheduledTime = new Date(call.scheduled_for)
        const minutesUntil = Math.round((scheduledTime.getTime() - now.getTime()) / 60000)

        await sendPushToUser(call.user_id, {
          title: 'Scheduled Call Reminder',
          body: `You have a call scheduled to ${formatPhoneNumber(call.to_number)} in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`,
          data: {
            type: 'task_assigned', // Using existing type that routes to tasks/calls
            scheduledCallId: call.id,
            phoneNumber: call.to_number,
          },
        })

        // Mark as reminded
        const { error: updateError } = await supabase
          .from('scheduled_calls')
          .update({
            status: 'reminded',
            reminder_sent_at: now.toISOString(),
          })
          .eq('id', call.id)
          .eq('status', 'pending')

        if (updateError) {
          console.error(`Error updating reminder status for ${call.id}:`, updateError)
          result.errors.push({ id: call.id, error: updateError.message })
        } else {
          result.reminded++
        }
      } catch (error) {
        console.error(`Error sending reminder for scheduled call ${call.id}:`, error)
        result.errors.push({
          id: call.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  // 3. Find calls that are past due and mark as missed
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

  const { data: overdueCalls, error: overdueError } = await supabase
    .from('scheduled_calls')
    .select('id')
    .in('status', ['pending', 'reminded'])
    .lt('scheduled_for', thirtyMinutesAgo.toISOString())
    .limit(50)

  if (overdueError) {
    console.error('Error fetching overdue scheduled calls:', overdueError)
  } else if (overdueCalls && overdueCalls.length > 0) {
    const overdueIds = overdueCalls.map((c: { id: string }) => c.id)

    const { error: missedError } = await supabase
      .from('scheduled_calls')
      .update({ status: 'missed' })
      .in('id', overdueIds)

    if (missedError) {
      console.error('Error marking calls as missed:', missedError)
      result.errors.push({ id: 'batch', error: missedError.message })
    } else {
      result.missed = overdueIds.length
    }
  }

  return result
}

/**
 * Format phone number for display
 */
function formatPhoneNumber(number: string): string {
  if (number.startsWith('+1') && number.length === 12) {
    return `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
  }
  return number
}
