import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"

// POST /api/team/invites/check - Check if an email has pending invites
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    console.log("[InviteCheck] Checking for email:", email)

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Step 1: Check for invite (simple query without join)
    const { data: invite, error: inviteError } = await supabase
      .from("pending_invites")
      .select("id, role, workspace_id")
      .eq("email", email.toLowerCase())
      .limit(1)
      .single()

    console.log("[InviteCheck] Query result:", { invite, inviteError })

    if (inviteError) {
      console.error("[InviteCheck] Error checking pending invite:", inviteError)
    }

    if (inviteError || !invite) {
      console.log("[InviteCheck] No invite found for:", email.toLowerCase())
      return NextResponse.json({
        hasInvite: false,
      })
    }

    // Step 2: Get workspace name separately
    let workspaceName = "a team"
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", invite.workspace_id)
      .single()

    if (wsError) {
      console.error("Error fetching workspace for invite:", wsError)
    }

    if (workspace?.name) {
      workspaceName = workspace.name
    }

    return NextResponse.json({
      hasInvite: true,
      workspaceName,
      role: invite.role,
    })
  } catch (error) {
    console.error("Error checking invite:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

