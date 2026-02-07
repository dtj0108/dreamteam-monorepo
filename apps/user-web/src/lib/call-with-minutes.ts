/**
 * Call Minutes Integration
 *
 * This module handles call minute checks, reservations, and deductions.
 * For calls, we use a reservation system since call duration is unknown upfront.
 *
 * Reservations are stored in the call_usage_log table with status='reserved'
 * so they persist across serverless invocations.
 */

import {
  hasSufficientCallMinutes,
  deductCallMinutes,
  getWorkspaceCallMinutes,
} from '@/lib/addons-queries'
import { createAdminClient } from '@/lib/supabase-server'

// Default reservation: 5 minutes
const DEFAULT_RESERVATION_MINUTES = 5

/**
 * Reserve minutes before initiating a call.
 *
 * @param reservationId - A temporary identifier (e.g. communication record ID).
 *   Call updateReservationCallSid() once the real Twilio SID is known.
 */
export async function reserveCallMinutes(
  workspaceId: string,
  reservationId: string,
  from: string,
  to: string,
  direction: 'inbound' | 'outbound' = 'outbound',
  reserveMinutes: number = DEFAULT_RESERVATION_MINUTES
): Promise<{ success: boolean; error?: string }> {
  const reserveSeconds = reserveMinutes * 60

  // Check if workspace has sufficient minutes
  const hasSufficient = await hasSufficientCallMinutes(workspaceId, reserveSeconds)
  if (!hasSufficient) {
    const minutes = await getWorkspaceCallMinutes(workspaceId)
    return {
      success: false,
      error: `Insufficient call minutes. You have ${minutes?.balance_minutes ?? 0} minutes, but need at least ${reserveMinutes}.`,
    }
  }

  // Atomically deduct reserved minutes
  const deducted = await deductCallMinutes(workspaceId, reserveSeconds)
  if (!deducted) {
    return {
      success: false,
      error: 'Failed to reserve minutes. Please try again.',
    }
  }

  // Store reservation in call_usage_log with status='reserved'
  // duration_seconds holds the reserved amount until finalization
  const supabase = createAdminClient()
  const { error: insertError } = await supabase.from('call_usage_log').insert({
    workspace_id: workspaceId,
    call_sid: reservationId,
    direction,
    duration_seconds: reserveSeconds,
    minutes_consumed: reserveMinutes,
    from_number: from,
    to_number: to,
    status: 'reserved',
  })

  if (insertError) {
    // Reservation log failed — refund the already-deducted minutes
    console.error('[call-minutes] Failed to insert reservation log, refunding minutes', {
      workspaceId, reservationId, reserveMinutes, error: insertError.message,
    })
    const { data: current } = await supabase
      .from('workspace_call_minutes')
      .select('balance_seconds, lifetime_used_seconds')
      .eq('workspace_id', workspaceId)
      .single()
    if (current) {
      await supabase.from('workspace_call_minutes').update({
        balance_seconds: current.balance_seconds + reserveSeconds,
        lifetime_used_seconds: Math.max(0, current.lifetime_used_seconds - reserveSeconds),
      }).eq('workspace_id', workspaceId)
    }
    return { success: false, error: 'Failed to create reservation record.' }
  }

  return { success: true }
}

/**
 * Update the reservation's call_sid once the real Twilio SID is known.
 */
export async function updateReservationCallSid(
  oldId: string,
  newCallSid: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('call_usage_log')
    .update({ call_sid: newCallSid })
    .eq('call_sid', oldId)
    .eq('status', 'reserved')

  if (error) {
    console.warn('[call-minutes] Failed to update reservation SID', {
      oldId, newCallSid, error: error.message,
    })
  }
}

/**
 * Finalize call and reconcile minutes.
 * Called when a call ends successfully (from status callback).
 */
export async function finalizeCall(
  callSid: string,
  actualDurationSeconds: number,
  status: string
): Promise<void> {
  const supabase = createAdminClient()

  // Look up reservation from database
  const { data: reservation } = await supabase
    .from('call_usage_log')
    .select('*')
    .eq('call_sid', callSid)
    .eq('status', 'reserved')
    .single()

  if (!reservation) {
    console.warn(`No reservation found for call ${callSid}`)
    return
  }

  const reservedSeconds = reservation.duration_seconds
  const difference = reservedSeconds - actualDurationSeconds

  // If call was shorter than reserved, refund the difference
  if (difference > 0) {
    try {
      const { data: current } = await supabase
        .from('workspace_call_minutes')
        .select('balance_seconds, lifetime_used_seconds')
        .eq('workspace_id', reservation.workspace_id)
        .single()

      if (current) {
        const { error: refundError } = await supabase
          .from('workspace_call_minutes')
          .update({
            balance_seconds: current.balance_seconds + difference,
            lifetime_used_seconds: Math.max(0, current.lifetime_used_seconds - difference),
          })
          .eq('workspace_id', reservation.workspace_id)

        if (refundError) {
          console.error('[call-minutes] Failed to refund difference — manual reconciliation needed', {
            workspaceId: reservation.workspace_id, callSid, differenceSeconds: difference, error: refundError.message,
          })
        } else {
          console.log(
            `Refunded ${Math.ceil(difference / 60)} minutes (${difference}s) to workspace ${reservation.workspace_id}`
          )
        }
      }
    } catch (error) {
      console.error('Failed to refund call minutes:', error)
    }
  }

  // Update the reservation record with actual values
  const actualMinutes = Math.ceil(actualDurationSeconds / 60)
  const { error: finalizeError } = await supabase
    .from('call_usage_log')
    .update({
      duration_seconds: actualDurationSeconds,
      minutes_consumed: actualMinutes,
      status,
    })
    .eq('call_sid', callSid)
    .eq('status', 'reserved')

  if (finalizeError) {
    console.warn('[call-minutes] Failed to finalize usage log', {
      callSid, actualDurationSeconds, status, error: finalizeError.message,
    })
  }
}

/**
 * Cancel a call reservation (if call never connected).
 * Refunds all reserved minutes back to the workspace.
 */
export async function cancelReservation(callSid: string): Promise<void> {
  const supabase = createAdminClient()

  // Look up reservation from database
  const { data: reservation } = await supabase
    .from('call_usage_log')
    .select('*')
    .eq('call_sid', callSid)
    .eq('status', 'reserved')
    .single()

  if (!reservation) {
    return
  }

  const reservedSeconds = reservation.duration_seconds

  // Refund all reserved minutes
  try {
    const { data: current } = await supabase
      .from('workspace_call_minutes')
      .select('balance_seconds, lifetime_used_seconds')
      .eq('workspace_id', reservation.workspace_id)
      .single()

    if (current) {
      const { error: refundError } = await supabase
        .from('workspace_call_minutes')
        .update({
          balance_seconds: current.balance_seconds + reservedSeconds,
          lifetime_used_seconds: Math.max(0, current.lifetime_used_seconds - reservedSeconds),
        })
        .eq('workspace_id', reservation.workspace_id)

      if (refundError) {
        console.error('[call-minutes] Failed to refund canceled reservation — manual reconciliation needed', {
          workspaceId: reservation.workspace_id, callSid, reservedSeconds, error: refundError.message,
        })
      } else {
        console.log(
          `Canceled reservation: refunded ${Math.ceil(reservedSeconds / 60)} minutes to workspace ${reservation.workspace_id}`
        )
      }
    }
  } catch (error) {
    console.error('Failed to refund canceled reservation:', error)
  }

  // Mark the reservation record as canceled
  const { error: cancelError } = await supabase
    .from('call_usage_log')
    .update({
      duration_seconds: 0,
      minutes_consumed: 0,
      status: 'canceled',
    })
    .eq('call_sid', callSid)
    .eq('status', 'reserved')

  if (cancelError) {
    console.warn('[call-minutes] Failed to mark reservation as canceled', {
      callSid, error: cancelError.message,
    })
  }
}

/**
 * Check if workspace can make calls (has any minutes)
 */
export async function canMakeCalls(workspaceId: string): Promise<boolean> {
  const minutes = await getWorkspaceCallMinutes(workspaceId)
  // Require at least 1 minute to make a call
  return (minutes?.balance_seconds ?? 0) >= 60
}

/**
 * Get current call minutes balance
 */
export async function getCallMinutesBalance(
  workspaceId: string
): Promise<{ minutes: number; seconds: number }> {
  const data = await getWorkspaceCallMinutes(workspaceId)
  const seconds = data?.balance_seconds ?? 0
  return {
    minutes: Math.floor(seconds / 60),
    seconds: seconds % 60,
  }
}

/**
 * Handle call status webhook.
 * This should be called from the Twilio status callback endpoint.
 */
export async function handleCallStatusUpdate(
  callSid: string,
  status: string,
  durationSeconds?: number
): Promise<void> {
  // Terminal statuses that end the call
  const terminalStatuses = ['completed', 'busy', 'no-answer', 'failed', 'canceled']

  if (!terminalStatuses.includes(status)) {
    return
  }

  if (status === 'completed' && durationSeconds !== undefined) {
    // Call completed successfully, finalize with actual duration
    await finalizeCall(callSid, durationSeconds, status)
  } else {
    // Call didn't complete, cancel reservation and refund all minutes
    await cancelReservation(callSid)
  }
}
