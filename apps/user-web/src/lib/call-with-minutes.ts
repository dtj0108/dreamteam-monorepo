/**
 * Call Minutes Integration
 *
 * This module handles call minute checks, reservations, and deductions.
 * For calls, we use a reservation system since call duration is unknown upfront.
 */

import {
  hasSufficientCallMinutes,
  deductCallMinutes,
  recordCallUsage,
  getWorkspaceCallMinutes,
} from '@/lib/addons-queries'
import { createAdminClient } from '@/lib/supabase-server'

export interface CallReservation {
  workspaceId: string
  callSid: string
  reservedSeconds: number
  from: string
  to: string
  direction: 'inbound' | 'outbound'
}

// In-memory store for active call reservations
// In production, you'd use Redis or a database table
const activeReservations = new Map<string, CallReservation>()

// Default reservation: 5 minutes
const DEFAULT_RESERVATION_MINUTES = 5
const DEFAULT_RESERVATION_SECONDS = DEFAULT_RESERVATION_MINUTES * 60

/**
 * Reserve minutes before initiating a call
 * Returns false if insufficient minutes available
 */
export async function reserveCallMinutes(
  workspaceId: string,
  callSid: string,
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

  // Deduct reserved minutes
  const deducted = await deductCallMinutes(workspaceId, reserveSeconds)
  if (!deducted) {
    return {
      success: false,
      error: 'Failed to reserve minutes. Please try again.',
    }
  }

  // Store reservation
  activeReservations.set(callSid, {
    workspaceId,
    callSid,
    reservedSeconds: reserveSeconds,
    from,
    to,
    direction,
  })

  return { success: true }
}

/**
 * Finalize call and reconcile minutes
 * Called when call ends (from status callback)
 */
export async function finalizeCall(
  callSid: string,
  actualDurationSeconds: number,
  status: string
): Promise<void> {
  const reservation = activeReservations.get(callSid)

  if (!reservation) {
    console.warn(`No reservation found for call ${callSid}`)
    return
  }

  const { workspaceId, reservedSeconds, from, to, direction } = reservation

  // Calculate difference between reserved and actual
  const difference = reservedSeconds - actualDurationSeconds

  // If call was shorter than reserved, refund the difference
  if (difference > 0) {
    try {
      const supabase = createAdminClient()
      const { data: current } = await supabase
        .from('workspace_call_minutes')
        .select('balance_seconds, lifetime_used_seconds')
        .eq('workspace_id', workspaceId)
        .single()

      if (current) {
        await supabase
          .from('workspace_call_minutes')
          .update({
            balance_seconds: current.balance_seconds + difference,
            lifetime_used_seconds: Math.max(0, current.lifetime_used_seconds - difference),
          })
          .eq('workspace_id', workspaceId)

        console.log(
          `Refunded ${Math.ceil(difference / 60)} minutes (${difference}s) to workspace ${workspaceId}`
        )
      }
    } catch (error) {
      console.error('Failed to refund call minutes:', error)
    }
  }

  // Record the actual usage
  const actualMinutes = Math.ceil(actualDurationSeconds / 60)
  await recordCallUsage(workspaceId, callSid, {
    direction,
    duration_seconds: actualDurationSeconds,
    minutes_consumed: actualMinutes,
    from_number: from,
    to_number: to,
    status,
  })

  // Clean up reservation
  activeReservations.delete(callSid)
}

/**
 * Cancel a call reservation (if call never connected)
 */
export async function cancelReservation(callSid: string): Promise<void> {
  const reservation = activeReservations.get(callSid)

  if (!reservation) {
    return
  }

  const { workspaceId, reservedSeconds } = reservation

  // Refund all reserved minutes
  try {
    const supabase = createAdminClient()
    const { data: current } = await supabase
      .from('workspace_call_minutes')
      .select('balance_seconds, lifetime_used_seconds')
      .eq('workspace_id', workspaceId)
      .single()

    if (current) {
      await supabase
        .from('workspace_call_minutes')
        .update({
          balance_seconds: current.balance_seconds + reservedSeconds,
          lifetime_used_seconds: Math.max(0, current.lifetime_used_seconds - reservedSeconds),
        })
        .eq('workspace_id', workspaceId)

      console.log(
        `Canceled reservation: refunded ${Math.ceil(reservedSeconds / 60)} minutes to workspace ${workspaceId}`
      )
    }
  } catch (error) {
    console.error('Failed to refund canceled reservation:', error)
  }

  activeReservations.delete(callSid)
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
 * Handle call status webhook
 * This should be called from the Twilio status callback endpoint
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
    // Call didn't complete, cancel reservation
    await cancelReservation(callSid)

    // Still record the attempt for tracking
    const reservation = activeReservations.get(callSid)
    if (reservation) {
      await recordCallUsage(reservation.workspaceId, callSid, {
        direction: reservation.direction,
        duration_seconds: 0,
        minutes_consumed: 0,
        from_number: reservation.from,
        to_number: reservation.to,
        status,
      })
    }
  }
}
