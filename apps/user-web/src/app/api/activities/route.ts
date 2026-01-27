import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// GET /api/activities - List activities, optionally filtered
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get("deal_id")
    const contactId = searchParams.get("contact_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Activities API GET auth error:', authError?.message || 'No user found')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let query = supabase
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
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })

    if (dealId) {
      query = query.eq("deal_id", dealId)
    }
    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    // Filter by date range (for calendar view)
    if (startDate) {
      query = query.gte("due_date", startDate)
    }
    if (endDate) {
      query = query.lte("due_date", endDate)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Activities API query error:', error.message, error.code, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Activities API GET: returning', activities?.length || 0, 'activities for user', user.id)
    if (activities && activities.length > 0) {
      console.log('Sample activity:', JSON.stringify(activities[0], null, 2))
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (err) {
    console.error('Activities API uncaught error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

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
    assignees,
  } = body

  if (!type) {
    return NextResponse.json({ error: "Activity type is required" }, { status: 400 })
  }

  const validTypes = ["call", "email", "meeting", "note", "task"]
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 })
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      profile_id: user.id,
      type,
      subject: subject || null,
      description: description || null,
      contact_id: contact_id || null,
      deal_id: deal_id || null,
      due_date: due_date || null,
      is_completed: is_completed || false,
      completed_at: is_completed ? new Date().toISOString() : null,
    })
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email),
      deal:deals(id, name, value, status)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Insert assignees if provided
  if (assignees && assignees.length > 0 && activity) {
    const { error: assigneesError } = await supabase
      .from("activity_assignees")
      .insert(
        assignees.map((userId: string) => ({
          activity_id: activity.id,
          user_id: userId,
        }))
      )

    if (assigneesError) {
      console.error("Error inserting assignees:", assigneesError)
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
    .eq("id", activity.id)
    .single()

  return NextResponse.json({ activity: completeActivity || activity })
}
