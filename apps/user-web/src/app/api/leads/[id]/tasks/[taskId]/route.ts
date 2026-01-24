import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

// PATCH /api/leads/[id]/tasks/[taskId] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params
    const body = await request.json()
    const { title, description, due_date, is_completed } = body

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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (due_date !== undefined) updateData.due_date = due_date
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed
      updateData.completed_at = is_completed ? new Date().toISOString() : null
    }

    const { data: task, error } = await supabase
      .from("lead_tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("lead_id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Error in task PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/tasks/[taskId] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, taskId } = await params
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

    const { error } = await supabase
      .from("lead_tasks")
      .delete()
      .eq("id", taskId)
      .eq("lead_id", id)

    if (error) {
      console.error("Error deleting task:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in task DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
