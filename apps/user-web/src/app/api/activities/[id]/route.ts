import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server"
import { triggerActivityCompleted } from "@/lib/workflow-trigger-service"

// GET /api/activities/[id] - Get a single activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone, company),
      deal:deals(id, name, value, status),
      assignees:activity_assignees(
        id,
        user_id,
        assigned_at,
        user:profiles(id, name, avatar_url)
      )
    `)
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 })
  }

  return NextResponse.json({ activity })
}

// PATCH /api/activities/[id] - Update an activity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    type,
    subject,
    description,
    contact_id,
    deal_id,
    due_date,
    is_completed,
    completed_at,
    assignees,
  } = body

  // Fetch previous state to detect completion transition
  const { data: previousActivity } = await supabase
    .from("activities")
    .select("is_completed, contact_id")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  const wasCompleted = previousActivity?.is_completed ?? false

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (type !== undefined) updates.type = type
  if (subject !== undefined) updates.subject = subject
  if (description !== undefined) updates.description = description
  if (contact_id !== undefined) updates.contact_id = contact_id
  if (deal_id !== undefined) updates.deal_id = deal_id
  if (due_date !== undefined) updates.due_date = due_date
  if (is_completed !== undefined) {
    updates.is_completed = is_completed
    updates.completed_at = is_completed ? (completed_at || new Date().toISOString()) : null
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email),
      deal:deals(id, name, value, status)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Handle assignees update if provided
  if (assignees !== undefined) {
    // Delete all existing assignees first
    await supabase
      .from("activity_assignees")
      .delete()
      .eq("activity_id", id)

    // Insert new assignees if any
    if (assignees.length > 0) {
      const { error: assigneesError } = await supabase
        .from("activity_assignees")
        .insert(
          assignees.map((userId: string) => ({
            activity_id: id,
            user_id: userId,
          }))
        )

      if (assigneesError) {
        console.error("Error updating assignees:", assigneesError)
      }
    }
  }

  // Re-fetch with assignees to return complete data
  const { data: completeActivity } = await supabase
    .from("activities")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email),
      deal:deals(id, name, value, status),
      assignees:activity_assignees(
        id,
        user_id,
        assigned_at,
        user:profiles(id, name, avatar_url)
      )
    `)
    .eq("id", id)
    .single()

  // Trigger activity_completed workflow if activity was just completed (non-blocking)
  if (is_completed === true && !wasCompleted) {
    const activityContactId = activity.contact_id || previousActivity?.contact_id
    if (activityContactId) {
      const adminSupabase = createAdminClient()
      const { data: contact } = await adminSupabase
        .from("contacts")
        .select("id, lead_id")
        .eq("id", activityContactId)
        .single()

      if (contact?.lead_id) {
        const { data: lead } = await adminSupabase
          .from("leads")
          .select("id, name, status, notes, user_id")
          .eq("id", contact.lead_id)
          .single()

        if (lead) {
          triggerActivityCompleted(
            {
              id: activity.id,
              type: activity.type,
              subject: activity.subject || "",
              description: activity.description,
              is_completed: activity.is_completed,
              completed_at: activity.completed_at,
            },
            lead,
            user.id
          ).catch((err) => {
            console.error("Error triggering activity_completed workflows:", err)
          })
        }
      }
    }
  }

  return NextResponse.json({ activity: completeActivity || activity })
}

// DELETE /api/activities/[id] - Delete an activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
