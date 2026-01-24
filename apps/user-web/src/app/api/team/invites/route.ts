import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// Generate readable invite code like "K4M-X7N-P2Q"
function generateInviteCode(): string {
  // Exclude confusing characters: 0, O, I, 1, L
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const segments: string[] = []
  for (let i = 0; i < 3; i++) {
    let segment = ""
    for (let j = 0; j < 3; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)]
    }
    segments.push(segment)
  }
  return segments.join("-")
}

// GET /api/team/invites - List pending invites for workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is admin/owner of workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can view invites" }, { status: 403 })
    }

    // Get pending invites (only those not yet accepted)
    const { data: invites, error } = await supabase
      .from("pending_invites")
      .select(`
        id,
        email,
        role,
        invite_code,
        created_at,
        accepted_at,
        expires_at,
        invited_by,
        inviter:invited_by(id, name)
      `)
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invites:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(invites)
  } catch (error) {
    console.error("Error in GET /api/team/invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/invites - Generate a new invite code
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, role = "member" } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      )
    }

    // Validate role
    if (!["member", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Verify user is admin/owner of workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 })
    }

    // Generate a unique invite code (retry if collision)
    let inviteCode: string
    let attempts = 0
    const maxAttempts = 5

    do {
      inviteCode = generateInviteCode()
      const { data: existing } = await supabase
        .from("pending_invites")
        .select("id")
        .eq("invite_code", inviteCode)
        .single()

      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique invite code" },
        { status: 500 }
      )
    }

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create the invite with generated code
    const { data: invite, error: insertError } = await supabase
      .from("pending_invites")
      .insert({
        workspace_id: workspaceId,
        role,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        invited_by: session.id,
      })
      .select(`
        id,
        role,
        invite_code,
        created_at,
        expires_at,
        invited_by,
        inviter:invited_by(id, name)
      `)
      .single()

    if (insertError) {
      console.error("Error creating invite:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
