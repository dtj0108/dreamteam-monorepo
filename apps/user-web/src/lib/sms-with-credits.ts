/**
 * SMS Sending with Credits Integration
 *
 * This module wraps SMS sending with credit checks and deduction.
 * It ensures sufficient credits before sending and logs usage.
 */

import {
  hasSufficientSMSCredits,
  deductSMSCredits,
  recordSMSUsage,
  getWorkspaceSMSCredits,
} from '@/lib/addons-queries'
import { calculateSMSCredits } from '@/types/addons'

export interface SendSMSOptions {
  workspaceId: string
  to: string
  from: string
  body: string
  mediaUrls?: string[]
}

export interface SendSMSResult {
  success: boolean
  messageSid?: string
  creditsUsed?: number
  error?: string
  errorCode?: 'INSUFFICIENT_CREDITS' | 'SEND_FAILED' | 'UNKNOWN'
}

/**
 * Calculate the number of SMS segments for a message
 * Standard SMS: 160 chars, Concatenated: 153 chars per segment
 */
export function calculateSegments(body: string): number {
  const length = body.length

  // Check if message contains non-GSM characters (requires UCS-2 encoding)
  const hasUnicode = /[^\x00-\x7F]/.test(body)

  if (hasUnicode) {
    // UCS-2: 70 chars single, 67 per segment for multi-part
    if (length <= 70) return 1
    return Math.ceil(length / 67)
  }

  // GSM-7: 160 chars single, 153 per segment for multi-part
  if (length <= 160) return 1
  return Math.ceil(length / 153)
}

/**
 * Send SMS with credit check and deduction
 *
 * 1. Calculate credits needed
 * 2. Check if workspace has sufficient credits
 * 3. Atomically deduct credits
 * 4. Send via Twilio
 * 5. Log usage
 * 6. If send fails, attempt to refund credits
 */
export async function sendSMSWithCredits(
  options: SendSMSOptions
): Promise<SendSMSResult> {
  const { workspaceId, to, from, body, mediaUrls } = options

  // Calculate credits needed
  const isMMS = mediaUrls && mediaUrls.length > 0
  const segments = isMMS ? 1 : calculateSegments(body)
  const creditsNeeded = calculateSMSCredits(segments, !!isMMS)

  // Check balance
  const hasSufficient = await hasSufficientSMSCredits(workspaceId, creditsNeeded)
  if (!hasSufficient) {
    const credits = await getWorkspaceSMSCredits(workspaceId)
    return {
      success: false,
      error: `Insufficient SMS credits. You have ${credits?.balance ?? 0} credits, but need ${creditsNeeded}.`,
      errorCode: 'INSUFFICIENT_CREDITS',
    }
  }

  // Atomically deduct credits
  const deducted = await deductSMSCredits(workspaceId, creditsNeeded)
  if (!deducted) {
    return {
      success: false,
      error: 'Failed to deduct credits. Please try again.',
      errorCode: 'INSUFFICIENT_CREDITS',
    }
  }

  try {
    // Import sendSMS dynamically to avoid initialization issues
    const { sendSMS } = await import('@/lib/twilio')

    // Send the message via Twilio
    const result = await sendSMS({
      to,
      from,
      body,
      mediaUrls,
    })

    if (!result.success || !result.sid) {
      throw new Error(result.error || 'Failed to send SMS')
    }

    const message = { sid: result.sid }

    // Log usage
    await recordSMSUsage(workspaceId, message.sid, {
      direction: 'outbound',
      segments,
      credits_consumed: creditsNeeded,
      is_mms: !!isMMS,
      from_number: from,
      to_number: to,
    })

    return {
      success: true,
      messageSid: message.sid,
      creditsUsed: creditsNeeded,
    }
  } catch (error) {
    console.error('Failed to send SMS:', error)

    // Attempt to refund credits
    try {
      const { createAdminClient } = await import('@/lib/supabase-server')
      const supabase = createAdminClient()

      // Get current balance and add back the credits
      const { data: current } = await supabase
        .from('workspace_sms_credits')
        .select('balance, lifetime_used')
        .eq('workspace_id', workspaceId)
        .single()

      if (current) {
        const { error: refundError } = await supabase
          .from('workspace_sms_credits')
          .update({
            balance: current.balance + creditsNeeded,
            lifetime_used: Math.max(0, current.lifetime_used - creditsNeeded),
          })
          .eq('workspace_id', workspaceId)

        if (refundError) {
          console.error('[sms-credits] Failed to refund credits — manual reconciliation needed', {
            workspaceId, creditsNeeded, error: refundError.message,
          })
        } else {
          console.log(`Refunded ${creditsNeeded} SMS credits to workspace ${workspaceId}`)
        }
      }
    } catch (refundError) {
      console.error('Failed to refund SMS credits:', refundError)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
      errorCode: 'SEND_FAILED',
    }
  }
}

/**
 * Check if workspace can send SMS (has any credits)
 */
export async function canSendSMS(workspaceId: string): Promise<boolean> {
  const credits = await getWorkspaceSMSCredits(workspaceId)
  return (credits?.balance ?? 0) > 0
}

/**
 * Get estimated credits for a message (for UI preview)
 */
export function estimateCredits(body: string, isMMS: boolean = false): number {
  const segments = isMMS ? 1 : calculateSegments(body)
  return calculateSMSCredits(segments, isMMS)
}
