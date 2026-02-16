import { createAdminClient } from '@/lib/supabase-server'
import { sendSMSWithCredits } from '@/lib/sms-with-credits'
import { fireWebhooks } from '@/lib/make-webhooks'
import type { ScheduledSMS } from '@/types/scheduled-sms'

export interface ProcessResult {
  processed: number
  sent: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

/**
 * Process all pending scheduled SMS messages that are due to be sent.
 * This function should be called by a cron job every minute.
 */
export async function processScheduledSMS(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [],
  }

  const supabase = createAdminClient()

  // Recovery: reset items stuck in 'processing' for more than 10 minutes
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: resetItems } = await supabase
    .from('scheduled_sms')
    .update({ status: 'pending' })
    .eq('status', 'processing')
    .lt('updated_at', staleThreshold)
    .select('id')

  if (resetItems && resetItems.length > 0) {
    console.warn(`[Scheduled SMS] Reset ${resetItems.length} stuck items back to pending`)
  }

  // 1. Fetch pending SMS where scheduled_for <= now
  const { data: pendingSMS, error: fetchError } = await supabase
    .from('scheduled_sms')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50) // Process max 50 at a time to avoid timeout

  if (fetchError) {
    console.error('Error fetching pending scheduled SMS:', fetchError)
    return result
  }

  if (!pendingSMS || pendingSMS.length === 0) {
    return result
  }

  // 2. Process each scheduled SMS
  for (const scheduled of pendingSMS as ScheduledSMS[]) {
    result.processed++

    // Mark as processing
    const { error: updateError } = await supabase
      .from('scheduled_sms')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', scheduled.id)
      .eq('status', 'pending') // Ensure it's still pending (prevent race conditions)

    if (updateError) {
      console.error(`Error marking scheduled SMS ${scheduled.id} as processing:`, updateError)
      result.errors.push({ id: scheduled.id, error: updateError.message })
      result.failed++
      continue
    }

    try {
      // 3. Resolve workspaceId for billing
      let scheduledWorkspaceId: string | null = null
      if (scheduled.lead_id) {
        const { data: leadRecord } = await supabase
          .from('leads')
          .select('workspace_id')
          .eq('id', scheduled.lead_id)
          .single()
        scheduledWorkspaceId = leadRecord?.workspace_id || null
      }

      if (!scheduledWorkspaceId) {
        // Fall back to profile default workspace
        const { data: profile } = await supabase
          .from('profiles')
          .select('default_workspace_id')
          .eq('id', scheduled.user_id)
          .single()
        scheduledWorkspaceId = profile?.default_workspace_id || null
      }

      if (!scheduledWorkspaceId) {
        await supabase
          .from('scheduled_sms')
          .update({
            status: 'failed',
            error_message: 'No workspace found for billing',
          })
          .eq('id', scheduled.id)

        result.errors.push({ id: scheduled.id, error: 'No workspace found for billing' })
        result.failed++
        continue
      }

      // Send via Twilio with credit check and deduction
      const smsResult = await sendSMSWithCredits({
        workspaceId: scheduledWorkspaceId,
        to: scheduled.to_number,
        from: scheduled.from_number,
        body: scheduled.body,
      })

      if (!smsResult.success) {
        // Update as failed
        await supabase
          .from('scheduled_sms')
          .update({
            status: 'failed',
            error_message: smsResult.error,
          })
          .eq('id', scheduled.id)

        result.errors.push({ id: scheduled.id, error: smsResult.error || 'Unknown error' })
        result.failed++
        continue
      }

      // 4. Create communication record
      const { data: comm, error: commError } = await supabase
        .from('communications')
        .insert({
          user_id: scheduled.user_id,
          lead_id: scheduled.lead_id || null,
          contact_id: scheduled.contact_id || null,
          type: 'sms',
          direction: 'outbound',
          from_number: scheduled.from_number,
          to_number: scheduled.to_number,
          body: scheduled.body,
          twilio_sid: smsResult.messageSid || null,
          twilio_status: 'queued',
          triggered_by: 'scheduled',
          workspace_id: scheduledWorkspaceId,
        })
        .select()
        .single()

      if (commError) {
        console.error(`Error creating communication for scheduled SMS ${scheduled.id}:`, commError)
        // Don't fail the SMS - it was sent successfully
      }

      // Update conversation thread
      await supabase
        .from('conversation_threads')
        .upsert({
          user_id: scheduled.user_id,
          lead_id: scheduled.lead_id || null,
          contact_id: scheduled.contact_id || null,
          phone_number: scheduled.to_number,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        }, {
          onConflict: 'user_id,phone_number',
        })

      // 5. Update scheduled SMS as sent
      await supabase
        .from('scheduled_sms')
        .update({
          status: 'sent',
          communication_id: comm?.id || null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', scheduled.id)

      // Fire webhooks for Make.com integrations
      if (comm) {
        fireWebhooks('sms.sent', {
          id: comm.id,
          twilio_sid: smsResult.messageSid,
          from: scheduled.from_number,
          to: scheduled.to_number,
          body: scheduled.body,
          status: 'queued',
          lead_id: scheduled.lead_id,
          contact_id: scheduled.contact_id,
          scheduled: true,
        }, scheduledWorkspaceId)
      }

      result.sent++
    } catch (error) {
      console.error(`Error processing scheduled SMS ${scheduled.id}:`, error)

      // Mark as failed
      await supabase
        .from('scheduled_sms')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', scheduled.id)

      result.errors.push({
        id: scheduled.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      result.failed++
    }
  }

  return result
}
