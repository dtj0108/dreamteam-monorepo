import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/leads/[id]/contacts
 *
 * List all contacts for a specific lead.
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

    // First verify the lead belongs to this workspace
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get all contacts for this lead
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, title, notes, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching contacts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for RPC dropdown (name = first_name + last_name)
    const formattedContacts = (contacts || []).map((c: { first_name: string; last_name: string | null; [key: string]: unknown }) => ({
      ...c,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed Contact",
    }))

    return NextResponse.json({ data: formattedContacts })
  } catch (error) {
    console.error("Error in lead contacts GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
