import { createAdminClient } from "@dreamteam/database/server"

// Push notification payload structure
export interface PushNotificationPayload {
  title: string
  body: string
  data?: {
    type: "message" | "dm" | "mention" | "task_assigned"
    channelId?: string
    dmId?: string
    taskId?: string
    projectId?: string
    messageId?: string
    [key: string]: string | undefined
  }
}

// Expo push message format
interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, string | undefined>
  sound?: "default" | null
  badge?: number
  channelId?: string
  priority?: "default" | "normal" | "high"
}

interface ExpoPushTicket {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send"

/**
 * Send push notification to all devices for a single user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; errors: string[] }> {
  const supabase = createAdminClient()

  // Get all push tokens for this user
  const { data: tokens, error } = await supabase
    .from("user_push_tokens")
    .select("token")
    .eq("user_id", userId)

  if (error) {
    console.error("[PushNotifications] Error fetching push tokens:", error)
    return { success: false, sent: 0, errors: [error.message] }
  }

  if (!tokens || tokens.length === 0) {
    // No tokens registered - not an error, just nothing to send
    return { success: true, sent: 0, errors: [] }
  }

  const pushTokens = tokens.map((t: { token: string }) => t.token)
  return await sendPushNotifications(pushTokens, payload)
}

/**
 * Send push notification to all devices for multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; errors: string[] }> {
  if (userIds.length === 0) {
    return { success: true, sent: 0, errors: [] }
  }

  const supabase = createAdminClient()

  // Get all push tokens for these users
  const { data: tokens, error } = await supabase
    .from("user_push_tokens")
    .select("token")
    .in("user_id", userIds)

  if (error) {
    console.error("[PushNotifications] Error fetching push tokens:", error)
    return { success: false, sent: 0, errors: [error.message] }
  }

  if (!tokens || tokens.length === 0) {
    return { success: true, sent: 0, errors: [] }
  }

  const pushTokens = tokens.map((t: { token: string }) => t.token)
  return await sendPushNotifications(pushTokens, payload)
}

/**
 * Send push notifications to a list of Expo push tokens
 */
async function sendPushNotifications(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; errors: string[] }> {
  // Filter to only valid Expo push tokens
  const validTokens = tokens.filter((token) => isValidExpoPushToken(token))

  if (validTokens.length === 0) {
    return { success: true, sent: 0, errors: [] }
  }

  // Build push messages
  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: "default",
    priority: "high",
  }))

  try {
    // Expo API accepts up to 100 messages per request
    const chunks = chunkArray(messages, 100)
    const errors: string[] = []
    let totalSent = 0

    for (const chunk of chunks) {
      const response = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      })

      if (!response.ok) {
        const errorText = await response.text()
        errors.push(`Expo API error: ${response.status} - ${errorText}`)
        continue
      }

      const result = await response.json()
      const tickets: ExpoPushTicket[] = result.data || []

      // Count successes and collect errors
      for (const ticket of tickets) {
        if (ticket.status === "ok") {
          totalSent++
        } else {
          errors.push(ticket.message || "Unknown push error")
        }
      }
    }

    return {
      success: errors.length === 0,
      sent: totalSent,
      errors,
    }
  } catch (error) {
    console.error("[PushNotifications] Error sending push notifications:", error)
    return {
      success: false,
      sent: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

/**
 * Validate that a token looks like an Expo push token
 * Expo tokens start with "ExponentPushToken[" or are UUIDs for simulator
 */
function isValidExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[") ||
    // Also accept FCM/APNs tokens that might be passed through
    token.length > 20
  )
}

/**
 * Helper to chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
