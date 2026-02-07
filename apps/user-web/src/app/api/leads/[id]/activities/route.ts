import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { triggerActivityLogged, triggerLeadContacted } from "@/lib/workflow-trigger-service"

// GET /api/leads/[id]/activities - List activities for a lead
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

    // Verify lead ownership and get contacts
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, contacts(id)")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get activities for all contacts in this lead
    const contactIds = lead.contacts?.map((c: { id: string }) => c.id) || []

    if (contactIds.length === 0) {
      return NextResponse.json({ activities: [] })
    }

    const { data: activities, error } = await supabase
      .from("activities")
      .select(`
        *,
        contact:contacts(id, first_name, last_name)
      `)
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (error) {
    console.error("Error fetching lead activities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/leads/[id]/activities - Create an activity for a lead
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
    const { type, subject, description, contact_id } = body

    if (!type) {
      return NextResponse.json({ error: "Activity type is required" }, { status: 400 })
    }

    const validTypes = ["call", "email", "meeting", "note", "task"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify lead ownership and get contacts with lead details for workflow trigger
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, status, notes, user_id, contacts(id)")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Use provided contact_id or default to first contact
    let targetContactId = contact_id
    if (!targetContactId && lead.contacts && lead.contacts.length > 0) {
      targetContactId = lead.contacts[0].id
    }

    if (!targetContactId) {
      return NextResponse.json(
        { error: "No contact associated with this lead" },
        { status: 400 }
      )
    }

    // Verify the contact belongs to this lead
    const contactBelongsToLead = lead.contacts?.some(
      (c: { id: string }) => c.id === targetContactId
    )
    if (!contactBelongsToLead) {
      return NextResponse.json(
        { error: "Contact does not belong to this lead" },
        { status: 400 }
      )
    }

    // Create the activity
    const { data: activity, error } = await supabase
      .from("activities")
      .insert({
        profile_id: session.id,
        type,
        subject: subject || null,
        description: description || null,
        contact_id: targetContactId,
        is_completed: type === "note", // Notes are always "completed"
        completed_at: type === "note" ? new Date().toISOString() : null,
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name)
      `)
      .single()

    if (error) {
      console.error("Error creating activity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger activity_logged workflow (fire and forget)
    const leadContext = {
      id: lead.id,
      name: lead.name,
      status: lead.status,
      notes: lead.notes,
      user_id: lead.user_id,
    }

    triggerActivityLogged(
      {
        id: activity.id,
        type: activity.type,
        subject: activity.subject || "",
        description: activity.description,
        is_completed: activity.is_completed,
        completed_at: activity.completed_at,
      },
      leadContext,
      session.id
    ).catch((err) => {
      console.error("Error triggering activity_logged workflows:", err)
    })

    // Trigger lead_contacted workflow for outreach activities (non-blocking)
    if (type === "call" || type === "email" || type === "meeting") {
      triggerLeadContacted(leadContext).catch((err) => {
        console.error("Error triggering lead_contacted workflows:", err)
      })
    }

    return NextResponse.json({ activity })
  } catch (error) {
    console.error("Error creating lead activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
