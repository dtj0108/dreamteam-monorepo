import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { triggerActivityCompleted } from "@/lib/workflow-trigger-service"

// PATCH /api/leads/[id]/activities/[activityId] - Update an activity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: leadId, activityId } = await params
    const body = await request.json()
    const { subject, description, is_completed } = body

    const supabase = createAdminClient()

    // Verify lead ownership and get lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, status, notes, user_id, contacts(id)")
      .eq("id", leadId)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get the current activity state
    const { data: existingActivity, error: fetchError } = await supabase
      .from("activities")
      .select("*, contact:contacts(id, first_name, last_name)")
      .eq("id", activityId)
      .single()

    if (fetchError || !existingActivity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    // Verify the activity belongs to a contact of this lead
    const contactIds = lead.contacts?.map((c: { id: string }) => c.id) || []
    if (!contactIds.includes(existingActivity.contact_id)) {
      return NextResponse.json(
        { error: "Activity does not belong to this lead" },
        { status: 403 }
      )
    }

    const previouslyCompleted = existingActivity.is_completed

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (subject !== undefined) updateData.subject = subject
    if (description !== undefined) updateData.description = description
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed
      updateData.completed_at = is_completed ? new Date().toISOString() : null
    }

    const { data: activity, error } = await supabase
      .from("activities")
      .update(updateData)
      .eq("id", activityId)
      .select(`
        *,
        contact:contacts(id, first_name, last_name)
      `)
      .single()

    if (error) {
      console.error("Error updating activity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger workflow if activity was just completed
    if (is_completed === true && !previouslyCompleted) {
      triggerActivityCompleted(
        {
          id: activity.id,
          type: activity.type,
          subject: activity.subject || "",
          description: activity.description,
          is_completed: activity.is_completed,
          completed_at: activity.completed_at,
        },
        {
          id: lead.id,
          name: lead.name,
          status: lead.status,
          notes: lead.notes,
          user_id: lead.user_id,
        },
        session.id
      ).catch((err) => {
        console.error("Error triggering activity_completed workflows:", err)
      })
    }

    return NextResponse.json({ activity })
  } catch (error) {
    console.error("Error in activity PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/activities/[activityId] - Delete an activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: leadId, activityId } = await params
    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, contacts(id)")
      .eq("id", leadId)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Verify activity belongs to this lead's contacts
    const contactIds = lead.contacts?.map((c: { id: string }) => c.id) || []

    const { data: existingActivity } = await supabase
      .from("activities")
      .select("contact_id")
      .eq("id", activityId)
      .single()

    if (!existingActivity || !contactIds.includes(existingActivity.contact_id)) {
      return NextResponse.json(
        { error: "Activity not found or does not belong to this lead" },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId)

    if (error) {
      console.error("Error deleting activity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in activity DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
