import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/communications/[id]
 *
 * Get a single communication record by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

    const { data, error } = await supabase
      .from("communications")
      .select(`
        id, type, direction, twilio_sid, twilio_status,
        from_number, to_number, body, media_urls,
        duration_seconds, recording_url, recording_sid,
        error_code, error_message, lead_id, contact_id,
        triggered_by, created_at, updated_at
      `)
      .eq("id", id)
      .eq("user_id", apiKey.created_by)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Communication not found" }, { status: 404 })
      }
      console.error("Error fetching communication:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in communications/[id] GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
