import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/communications
 *
 * List communications (SMS and calls) for the API key owner.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // 'sms' or 'call'
    const direction = searchParams.get("direction") // 'inbound' or 'outbound'
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    const supabase = createAdminClient()

    // Get the API key owner
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    if (!apiKey?.created_by) {
      return NextResponse.json({ error: "API key has no associated user" }, { status: 400 })
    }

    let query = supabase
      .from("communications")
      .select(`
        id, type, direction, twilio_sid, twilio_status,
        from_number, to_number, body, duration_seconds,
        recording_url, error_code, error_message,
        lead_id, contact_id, created_at, updated_at
      `)
      .eq("user_id", apiKey.created_by)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq("type", type)
    }

    if (direction) {
      query = query.eq("direction", direction)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching communications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in communications GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
