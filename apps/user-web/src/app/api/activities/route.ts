import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// GET /api/activities - List activities, optionally filtered
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const dealId = searchParams.get("deal_id")
  const contactId = searchParams.get("contact_id")

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let query = supabase
    .from("activities")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, avatar_url),
      deal:deals(id, name, value, status)
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })

  if (dealId) {
    query = query.eq("deal_id", dealId)
  }
  if (contactId) {
    query = query.eq("contact_id", contactId)
  }

  const { data: activities, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ activities: activities || [] })
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
      contact:contacts(id, first_name, last_name, email, avatar_url),
      deal:deals(id, name, value, status)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ activity })
}
