/**
 * Channel Subscription Utilities
 *
 * Functions for subscribing to real-time channel updates
 * using Supabase Realtime. Used to wait for specialist
 * agent responses during delegation.
 */

import { createAdminClient } from "./supabase.js"

/**
 * Message payload from Supabase Realtime
 */
interface MessagePayload {
  agent_request_id?: string
  is_agent_request?: boolean
  content?: string
}

/**
 * Wait for an agent's response to a delegation request
 *
 * Subscribes to the channel and waits for a message with the
 * matching request ID that is NOT a request (i.e., it's a response).
 *
 * @param channelId - The channel to subscribe to
 * @param requestId - The request ID to wait for
 * @param timeoutMs - Maximum time to wait (default: 60s)
 * @returns The response content and status
 * @throws Error if timeout is reached
 */
export async function waitForAgentResponse(
  channelId: string,
  requestId: string,
  timeoutMs: number = 60000
): Promise<{ content: string; status: string }> {
  const supabase = createAdminClient()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      reject(new Error("Agent response timeout"))
    }, timeoutMs)

    const subscription = supabase
      .channel(`response-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const msg = payload.new as MessagePayload
          // Response = same request_id but NOT a request (it's a response)
          if (msg.agent_request_id === requestId && !msg.is_agent_request) {
            clearTimeout(timeout)
            subscription.unsubscribe()
            resolve({ content: msg.content || "", status: "completed" })
          }
        }
      )
      .subscribe()
  })
}
