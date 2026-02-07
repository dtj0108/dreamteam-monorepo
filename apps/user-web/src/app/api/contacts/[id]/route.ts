import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getJoinedField } from "@/lib/supabase-utils"

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

    const { data, error } = await supabase
      .from("contacts")
      .select(`
        *,
        lead:leads!inner(id, name, user_id)
      `)
      .eq("id", id)
      .eq("lead.user_id", session.id)
      .single()

    if (error) {
      console.error("Error fetching contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in contact GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
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
    const { first_name, last_name, email, phone, title, notes } = body

    const supabase = createAdminClient()

    // First verify ownership through lead
    const { data: contact } = await supabase
      .from("contacts")
      .select(`lead:leads!inner(user_id)`)
      .eq("id", id)
      .single()

    if (!contact || getJoinedField<string>(contact.lead, 'user_id') !== session.id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("contacts")
      .update({
        first_name,
        last_name,
        email,
        phone,
        title,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in contact PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
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

    // First verify ownership through lead
    const { data: contact } = await supabase
      .from("contacts")
      .select(`lead:leads!inner(user_id)`)
      .eq("id", id)
      .single()

    if (!contact || getJoinedField<string>(contact.lead, 'user_id') !== session.id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in contact DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

