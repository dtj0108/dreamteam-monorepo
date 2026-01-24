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
    const { name, color, position, is_default, is_won, is_lost } = body

    const supabase = createAdminClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from("lead_statuses")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (is_default === true) {
      await supabase
        .from("lead_statuses")
        .update({ is_default: false })
        .eq("user_id", session.id)
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (color !== undefined) updates.color = color
    if (position !== undefined) updates.position = position
    if (is_default !== undefined) updates.is_default = is_default
    if (is_won !== undefined) updates.is_won = is_won
    if (is_lost !== undefined) updates.is_lost = is_lost

    const { data, error } = await supabase
      .from("lead_statuses")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating lead status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead statuses PATCH:", error)
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
      .from("lead_statuses")
      .select("id, is_default")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Don't allow deleting the default status
    if (existing.is_default) {
      return NextResponse.json(
        { error: "Cannot delete the default status. Set another status as default first." },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("lead_statuses")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting lead status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in lead statuses DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
