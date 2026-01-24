import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/contacts/by-phone
 *
 * Find contacts by phone number.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Normalize phone number (remove non-digits for comparison)
    const normalizedPhone = phone.replace(/\D/g, "")

    const { data, error } = await supabase
      .from("contacts")
      .select(`
        id, first_name, last_name, email, phone, title, lead_id, created_at,
        lead:leads(id, name, status)
      `)
      .eq("workspace_id", auth.workspaceId)
      .or(`phone.ilike.%${phone}%,phone.ilike.%${normalizedPhone}%`)

    if (error) {
      console.error("Error finding contacts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add computed name field
    const contactsWithName = (data || []).map((c: { first_name: string; last_name: string | null; [key: string]: unknown }) => ({
      ...c,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed Contact",
    }))

    return NextResponse.json({ data: contactsWithName })
  } catch (error) {
    console.error("Error in contacts by-phone:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
