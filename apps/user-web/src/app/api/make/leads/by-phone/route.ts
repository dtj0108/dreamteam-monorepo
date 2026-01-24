import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/leads/by-phone
 *
 * Find leads that have a contact with the given phone number.
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

    // Find contacts with this phone (checking both with and without formatting)
    const { data: contacts, error: contactError } = await supabase
      .from("contacts")
      .select("lead_id")
      .eq("workspace_id", auth.workspaceId)
      .or(`phone.ilike.%${phone}%,phone.ilike.%${normalizedPhone}%`)

    if (contactError) {
      console.error("Error finding contacts:", contactError)
      return NextResponse.json({ error: contactError.message }, { status: 500 })
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get the leads for these contacts
    const leadIds = [...new Set(contacts.map((c: { lead_id: string }) => c.lead_id))]

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, website, industry, status, created_at")
      .eq("workspace_id", auth.workspaceId)
      .in("id", leadIds)

    if (leadsError) {
      console.error("Error fetching leads:", leadsError)
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    return NextResponse.json({ data: leads || [] })
  } catch (error) {
    console.error("Error in leads by-phone:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
