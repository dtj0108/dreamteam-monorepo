import { createAdminClient } from '@dreamteam/database/server'
import { sendEmail } from '@/lib/nylas'
import type { ScheduledEmail } from '@/types/scheduled-email'

export interface ProcessResult {
  processed: number
  sent: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

/**
 * Process all pending scheduled emails that are due to be sent.
 * This function should be called by a cron job every minute.
 */
export async function processScheduledEmails(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [],
  }

  const supabase = createAdminClient()

  // 1. Fetch pending emails where scheduled_for <= now
  const { data: pendingEmails, error: fetchError } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50) // Process max 50 at a time to avoid timeout

  if (fetchError) {
    console.error('Error fetching pending scheduled emails:', fetchError)
    return result
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    return result
  }

  // 2. Process each scheduled email
  for (const scheduled of pendingEmails as ScheduledEmail[]) {
    result.processed++

    // Mark as processing
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({ status: 'processing' })
      .eq('id', scheduled.id)
      .eq('status', 'pending') // Ensure it's still pending (prevent race conditions)

    if (updateError) {
      console.error(`Error marking scheduled email ${scheduled.id} as processing:`, updateError)
      result.errors.push({ id: scheduled.id, error: updateError.message })
      result.failed++
      continue
    }

    try {
      // 3. Get the Nylas grant ID from our internal grant record
      const { data: grant, error: grantError } = await supabase
        .from('nylas_grants')
        .select('grant_id, email')
        .eq('id', scheduled.grant_id)
        .single()

      if (grantError || !grant) {
        throw new Error('Connected email account not found')
      }

      // 4. Send via Nylas
      const emailResult = await sendEmail(grant.grant_id, {
        to: [{ email: scheduled.to_email, name: scheduled.to_name || undefined }],
        subject: scheduled.subject,
        body: scheduled.body,
      })

      if (!emailResult.success) {
        // Update as failed
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: emailResult.error,
          })
          .eq('id', scheduled.id)

        result.errors.push({ id: scheduled.id, error: emailResult.error || 'Unknown error' })
        result.failed++
        continue
      }

      // 5. Create activity record on the lead if we have a lead_id
      if (scheduled.lead_id) {
        const { error: activityError } = await supabase
          .from('activities')
          .insert({
            lead_id: scheduled.lead_id,
            contact_id: scheduled.contact_id || null,
            type: 'email',
            subject: `Email: ${scheduled.subject}`,
            description: `Sent scheduled email to ${scheduled.to_name || scheduled.to_email} (${scheduled.to_email})`,
            is_completed: true,
            completed_at: new Date().toISOString(),
          })

        if (activityError) {
          console.error(`Error creating activity for scheduled email ${scheduled.id}:`, activityError)
          // Don't fail the email - it was sent successfully
        }
      }

      // 6. Update scheduled email as sent
      await supabase
        .from('scheduled_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', scheduled.id)

      result.sent++
    } catch (error) {
      console.error(`Error processing scheduled email ${scheduled.id}:`, error)

      // Mark as failed
      await supabase
        .from('scheduled_emails')
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
