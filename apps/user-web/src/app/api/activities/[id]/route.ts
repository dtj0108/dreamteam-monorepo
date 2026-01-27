import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

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
