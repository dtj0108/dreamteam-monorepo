import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/contacts
 *
 * List all contacts in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const lead_id = searchParams.get("lead_id")

    let query = supabase
      .from("contacts")
      .select("id, lead_id, first_name, last_name, email, phone, title, notes, created_at")
      .eq("workspace_id", auth.workspaceId)
      .order("first_name", { ascending: true })
      .limit(limit)

    if (lead_id) {
      query = query.eq("lead_id", lead_id)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching contacts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in contacts GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/contacts
 *
 * Create a new contact under a lead.
 * Fires contact.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { lead_id, first_name, last_name, email, phone, title, notes } = body

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 })
    }

    if (!first_name) {
      return NextResponse.json({ error: "first_name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the lead belongs to this workspace
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, workspace_id")
      .eq("id", lead_id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        lead_id,
        workspace_id: auth.workspaceId,
        first_name,
        last_name,
        email,
        phone,
        title,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook
    await fireWebhooks("contact.created", { ...data, lead_id }, auth.workspaceId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in contacts POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
