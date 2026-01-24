import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/members - Get all workspace members
// Query params:
//   - workspaceId (required): Workspace to get members for
//   - includeAgents (optional): Set to "true" to include AI agents in the response
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const includeAgents = searchParams.get("includeAgents") === "true"

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get all members (excluding placeholder profiles from Slack imports)
    // Include is_agent flag to identify agent profiles
    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(`
        id,
        role,
        display_name,
        status,
        status_text,
        joined_at,
        allowed_products,
        profile:profile_id!inner(id, name, avatar_url, email, is_placeholder, is_agent, linked_agent_id)
      `)
      .eq("workspace_id", workspaceId)
      .eq("profile.is_placeholder", false)
      .order("joined_at", { ascending: true })

    if (error) {
      console.error("Error fetching members:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter out agents if not requested
    const filteredMembers = includeAgents
      ? members
      : members?.filter((m: { profile: { is_agent?: boolean } }) => !m.profile?.is_agent)

    return NextResponse.json(filteredMembers)
  } catch (error) {
    console.error("Error in GET /api/team/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/members - Invite a member to workspace
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const supabase = createAdminClient()

    const body = await request.json()
    const { workspaceId, email, role = "member" } = body

    if (!workspaceId || !email) {
      return NextResponse.json(
        { error: "Workspace ID and email required" },
        { status: 400 }
      )
    }

    // Verify user has permission to invite
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can invite members" },
        { status: 403 }
      )
    }

    // Find the user by email
    const { data: invitee, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single()

    if (userError || !invitee) {
      return NextResponse.json(
        { error: "User not found with that email" },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", invitee.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      )
    }

    // Add member
    const { data: newMember, error: insertError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        profile_id: invitee.id,
        role,
      })
      .select(`
        id,
        role,
        joined_at,
        profile:profile_id(id, name, avatar_url, email)
      `)
      .single()

    if (insertError) {
      console.error("Error adding member:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

