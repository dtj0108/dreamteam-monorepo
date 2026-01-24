import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { fireWebhooks } from "@/lib/make-webhooks"

// GET /api/leads/[id]/opportunities - List opportunities for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const { data: opportunities, error } = await supabase
      .from("lead_opportunities")
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone, title)
      `)
      .eq("lead_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching opportunities:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ opportunities: opportunities || [] })
  } catch (error) {
    console.error("Error in opportunities GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/leads/[id]/opportunities - Create an opportunity for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, value, stage, probability, expected_close_date, notes, status, value_type, contact_id } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get lead's workspace_id
    const { data: leadWithWorkspace } = await supabase
      .from("leads")
      .select("workspace_id")
      .eq("id", id)
      .single()

    const { data: opportunity, error } = await supabase
      .from("lead_opportunities")
      .insert({
        lead_id: id,
        user_id: session.id,
        workspace_id: leadWithWorkspace?.workspace_id || null,
        name,
        value: value || null,
        stage: stage || "prospect",
        probability: probability || 0,
        expected_close_date: expected_close_date || null,
        notes: notes || null,
        status: status || "active",
        value_type: value_type || "one_time",
        contact_id: contact_id || null,
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone, title)
      `)
      .single()

    if (error) {
      console.error("Error creating opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook for Make.com integrations
    if (opportunity && leadWithWorkspace?.workspace_id) {
      fireWebhooks(
        "opportunity.created",
        { ...opportunity, lead_id: id },
        leadWithWorkspace.workspace_id
      )
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error("Error in opportunities POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
