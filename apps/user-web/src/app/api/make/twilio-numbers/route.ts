import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/twilio-numbers
 *
 * List all Twilio phone numbers owned by the API key creator.
 * Note: The twilio_numbers table uses user_id, not workspace_id.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Query by user_id (the actual column in the table)
    const { data, error } = await supabase
      .from("twilio_numbers")
      .select("id, phone_number, friendly_name, capabilities, is_primary, created_at")
      .eq("user_id", apiKey.created_by)
      .order("friendly_name", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching Twilio numbers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown
    // name should be friendly_name if set, otherwise formatted phone_number
    const formattedNumbers = (data || []).map((n: { id: string; phone_number: string; friendly_name: string | null; capabilities: unknown; is_primary: boolean; created_at: string }) => ({
      id: n.id,
      name: n.friendly_name || formatPhoneNumber(n.phone_number),
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      capabilities: n.capabilities,
      is_primary: n.is_primary,
      created_at: n.created_at,
    }))

    return NextResponse.json({ data: formattedNumbers })
  } catch (error) {
    console.error("Error in twilio-numbers GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Format a phone number for display.
 * +15551234567 -> +1 (555) 123-4567
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "")

  // Check if it's a US number (+1XXXXXXXXXX)
  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    const areaCode = cleaned.slice(2, 5)
    const prefix = cleaned.slice(5, 8)
    const lineNum = cleaned.slice(8, 12)
    return `+1 (${areaCode}) ${prefix}-${lineNum}`
  }

  // Return original if not a standard US format
  return phone
}
