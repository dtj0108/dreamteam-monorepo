import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

const normalizeEmail = (value: string) => value.trim().toLowerCase()
const isExpired = (expiresAt?: string | null) =>
  !!expiresAt && new Date(expiresAt) <= new Date()

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

// POST /api/team/invites - Create a new invite
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, role = "member", email } = body
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : ""

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      )
    }

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email is required" },
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

    // If this email already has a profile and active membership, do not create another invite.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existingProfile?.id) {
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("profile_id", existingProfile.id)
        .maybeSingle()

      if (existingMember) {
        return NextResponse.json({ error: "User is already a member of this workspace" }, { status: 400 })
      }
    }

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const baseInviteQuery = `
      id,
      email,
      role,
      created_at,
      expires_at,
      invited_by,
      inviter:invited_by(id, name)
    `

    // Reuse existing invite row for this workspace/email to avoid unique-key collisions
    // from previously accepted/expired invites.
    const { data: existingInvite, error: existingInviteError } = await supabase
      .from("pending_invites")
      .select("id, accepted_at, expires_at")
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingInviteError) {
      console.error("Error checking existing invite:", existingInviteError)
      return NextResponse.json({ error: existingInviteError.message }, { status: 500 })
    }

    let inviteStatus = 201
    let invite: {
      id: string
      email: string
      role: "admin" | "member"
      created_at: string
      expires_at?: string | null
      invited_by: string
      inviter?: { id: string; name: string } | null
    } | null = null

    if (existingInvite) {
      const { data: updatedInvite, error: updateError } = await supabase
        .from("pending_invites")
        .update({
          role,
          expires_at: expiresAt.toISOString(),
          invited_by: session.id,
          accepted_at: null,
        })
        .eq("id", existingInvite.id)
        .select(baseInviteQuery)
        .single()

      if (updateError) {
        console.error("Error refreshing invite:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      invite = updatedInvite

      // This was already a valid pending invite; treat as resend/refresh.
      if (!existingInvite.accepted_at && !isExpired(existingInvite.expires_at)) {
        inviteStatus = 200
      }
    } else {
      const { data: insertedInvite, error: insertError } = await supabase
        .from("pending_invites")
        .insert({
          workspace_id: workspaceId,
          role,
          expires_at: expiresAt.toISOString(),
          invited_by: session.id,
          email: normalizedEmail,
        })
        .select(baseInviteQuery)
        .single()

      if (insertError) {
        console.error("Error creating invite:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      invite = insertedInvite
    }

    // Send invitation email
    if (invite) {
      try {
        // Look up workspace name and inviter name
        const [workspaceResult, profileResult] = await Promise.all([
          supabase
            .from("workspaces")
            .select("name")
            .eq("id", workspaceId)
            .single(),
          supabase
            .from("profiles")
            .select("name")
            .eq("id", session.id)
            .single(),
        ])

        const workspaceName = workspaceResult.data?.name || "a workspace"
        const inviterName = profileResult.data?.name || "A teammate"

        const { sendWorkspaceInviteEmail } = await import("@/emails")
        await sendWorkspaceInviteEmail(normalizedEmail, {
          inviterName,
          workspaceName,
          role,
          inviteId: invite.id,
        })
      } catch (emailError) {
        // Log but don't block — the invite was already created
        console.error("Failed to send invite email:", emailError)
      }
    }

    return NextResponse.json(invite, { status: inviteStatus })
  } catch (error) {
    console.error("Error in POST /api/team/invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
