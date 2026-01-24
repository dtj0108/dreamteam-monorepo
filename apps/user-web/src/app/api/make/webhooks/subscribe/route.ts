import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { WEBHOOK_EVENTS } from "@/lib/make-webhooks"

/**
 * POST /api/make/webhooks/subscribe
 *
 * Subscribe to webhook events. Make.com calls this when a user
 * adds an instant trigger to their scenario.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { url, event, filter } = body

    if (!url) {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 })
    }

    if (!event) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 })
    }

    // Validate event type
    if (!(event in WEBHOOK_EVENTS)) {
      return NextResponse.json(
        { error: `Invalid event type. Valid events: ${Object.keys(WEBHOOK_EVENTS).join(", ")}` },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get the user ID associated with this API key
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    if (!apiKey?.created_by) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Create the webhook subscription
    const { data, error } = await supabase
      .from("make_webhooks")
      .insert({
        workspace_id: auth.workspaceId,
        user_id: apiKey.created_by,
        url,
        event,
        filter: filter || null,
        is_active: true,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating webhook:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (error) {
    console.error("Error in webhook subscribe:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
