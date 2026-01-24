import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// DELETE /api/agents/[id]/unhire - Unhire an agent (soft delete local record)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get the local agent record
    const { data: localAgent, error: fetchError } = await supabase
      .from("agents")
      .select("id, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !localAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", localAgent.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Soft delete by setting is_active to false
    const { error: updateError } = await supabase
      .from("agents")
      .update({ is_active: false })
      .eq("id", id)

    if (updateError) {
      console.error("Error unhiring agent:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/agents/[id]/unhire:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
