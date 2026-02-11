import { createAdminClient } from "@/lib/supabase-server"

interface WebhookFilter {
  [key: string]: string | number | boolean | null | undefined
}

interface MakeWebhook {
  id: string
  workspace_id: string
  url: string
  event: string
  filter: WebhookFilter | null
  is_active: boolean
}

/**
 * Fire webhooks for a specific event to all registered Make.com webhook URLs.
 * This is non-blocking - webhook delivery happens asynchronously.
 *
 * @param event - The event type (e.g., "lead.created", "task.completed")
 * @param payload - The data to send to the webhook
 * @param workspaceId - The workspace ID to scope webhook lookup
 */
export async function fireWebhooks(
  event: string,
  payload: Record<string, unknown>,
  workspaceId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Query active webhooks for this event and workspace
  const { data: webhooks, error } = await supabase
    .from("make_webhooks")
    .select("id, workspace_id, url, event, filter, is_active")
    .eq("workspace_id", workspaceId)
    .eq("event", event)
    .eq("is_active", true)

  if (error) {
    console.error(`Error querying webhooks for event ${event}:`, error)
    return
  }

  if (!webhooks?.length) {
    return
  }

  // Fire webhooks in parallel (non-blocking)
  const promises = webhooks.map(async (webhook: MakeWebhook) => {
    // Check filter conditions if present
    if (webhook.filter && !matchesFilter(payload, webhook.filter)) {
      return
    }

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    })

    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })

        if (response.ok) {
          break // Success, no need to retry
        }

        console.error(
          `Webhook ${webhook.id} returned ${response.status}: ${response.statusText} (attempt ${attempt + 1}/${maxRetries})`
        )

        // Auto-deactivate webhooks that return 410 (Gone) or 404 (Not Found) — don't retry
        if (response.status === 410 || response.status === 404) {
          await supabase
            .from("make_webhooks")
            .update({ is_active: false })
            .eq("id", webhook.id)
          console.log(`Deactivated stale webhook ${webhook.id}`)
          break
        }

        // Don't retry 4xx client errors (except 408 Request Timeout, 429 Too Many Requests)
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          break
        }

        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        }
      } catch (err) {
        console.error(`Failed to fire webhook ${webhook.id} (attempt ${attempt + 1}/${maxRetries}):`, err)

        // Wait before retrying on network errors
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        }
      }
    }
  })

  // Fire all webhooks and wait for completion
  await Promise.all(promises)
}

/**
 * Check if a payload matches the webhook's filter criteria.
 * All filter conditions must match for the webhook to fire.
 *
 * @param payload - The event payload
 * @param filter - The filter criteria
 * @returns true if the payload matches all filter criteria
 */
function matchesFilter(
  payload: Record<string, unknown>,
  filter: WebhookFilter
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    // Skip null/undefined filter values (treat as "any")
    if (value === null || value === undefined) {
      continue
    }

    // Get nested property value (supports "field.subfield" notation)
    const payloadValue = getNestedValue(payload, key)

    // If values don't match, filter doesn't pass
    if (payloadValue !== value) {
      return false
    }
  }
  return true
}

/**
 * Get a nested property value from an object using dot notation.
 *
 * @param obj - The object to get the value from
 * @param path - The property path (e.g., "status" or "lead.status")
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Supported webhook events and their descriptions.
 * Used for documentation and validation.
 */
export const WEBHOOK_EVENTS = {
  // CRM - Leads
  "lead.created": "Triggered when a new lead is created",
  "lead.status_changed": "Triggered when a lead's status changes",
  "lead.stage_changed": "Triggered when a lead moves to a different pipeline stage",

  // CRM - Contacts
  "contact.created": "Triggered when a new contact is created",

  // CRM - Opportunities
  "opportunity.created": "Triggered when a new opportunity is created",
  "opportunity.stage_changed": "Triggered when an opportunity's stage changes",
  "opportunity.won": "Triggered when an opportunity is marked as won",

  // Projects
  "project.created": "Triggered when a new project is created",

  // Tasks
  "task.created": "Triggered when a new task is created",
  "task.completed": "Triggered when a task is marked as done",
  "task.assigned": "Triggered when a task's assignee changes",
  "task.overdue": "Triggered when a task becomes overdue",

  // Messaging
  "message.created": "Triggered when a new message is sent",

  // Finance
  "transaction.created": "Triggered when a new transaction is created",
  "budget.alert": "Triggered when spending exceeds a budget threshold",

  // Communications (SMS/Calls)
  "sms.received": "Triggered when an SMS is received",
  "sms.sent": "Triggered when an SMS is sent",
  "sms.delivery_failed": "Triggered when SMS delivery fails",
  "call.received": "Triggered when a call is received",
  "call.started": "Triggered when an outbound call starts",
  "call.ended": "Triggered when a call ends",
  "call.recording_ready": "Triggered when a call recording is ready",
} as const

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS
