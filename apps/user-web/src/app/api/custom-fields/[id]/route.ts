import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

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
    const { name, field_type, options, is_required, position } = body

    const supabase = createAdminClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from("custom_fields")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (field_type !== undefined) updates.field_type = field_type
    if (options !== undefined) updates.options = options
    if (is_required !== undefined) updates.is_required = is_required
    if (position !== undefined) updates.position = position

    const { data, error } = await supabase
      .from("custom_fields")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating custom field:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in custom fields PATCH:", error)
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

    // Verify ownership
    const { data: existing } = await supabase
      .from("custom_fields")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("custom_fields")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting custom field:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in custom fields DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
