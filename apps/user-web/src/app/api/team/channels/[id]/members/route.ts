import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/channels/[id]/members - Get all members of a channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: channelId } = await params

    const { data: members, error } = await supabase
      .from("channel_members")
      .select(`
        id,
        joined_at,
        profile:profile_id(id, name, email, avatar_url)
      `)
      .eq("channel_id", channelId)
      .order("joined_at", { ascending: true })

    if (error) {
      console.error("Error fetching channel members:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(members)
  } catch (error) {
    console.error("Error in GET /api/team/channels/[id]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/channels/[id]/members - Add a member to the channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: channelId } = await params
    const body = await request.json()
    const { profileId } = body

    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 })
    }

    // Verify the channel exists and get workspace
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("workspace_id")
      .eq("id", channelId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Verify the target user is a member of the workspace
    const { data: workspaceMember, error: wsError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", channel.workspace_id)
      .eq("profile_id", profileId)
      .single()

    if (wsError || !workspaceMember) {
      return NextResponse.json(
        { error: "User is not a member of this workspace" },
        { status: 400 }
      )
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("profile_id", profileId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "User is already a member of this channel" },
        { status: 400 }
      )
    }

    // Add member to channel
    const { data: member, error: insertError } = await supabase
      .from("channel_members")
      .insert({
        channel_id: channelId,
        profile_id: profileId,
      })
      .select(`
        id,
        joined_at,
        profile:profile_id(id, name, email, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error("Error adding channel member:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/channels/[id]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/channels/[id]/members - Remove a member from the channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: channelId } = await params
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get("profileId")

    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 })
    }

    // Users can remove themselves, or admins/owners can remove others
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("workspace_id, created_by")
      .eq("id", channelId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Check if current user has permission
    if (profileId !== session.id) {
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", channel.workspace_id)
        .eq("profile_id", session.id)
        .single()

      const canRemove =
        channel.created_by === session.id ||
        membership?.role === "admin" ||
        membership?.role === "owner"

      if (!canRemove) {
        return NextResponse.json(
          { error: "Not authorized to remove members from this channel" },
          { status: 403 }
        )
      }
    }

    const { error: deleteError } = await supabase
      .from("channel_members")
      .delete()
      .eq("channel_id", channelId)
      .eq("profile_id", profileId)

    if (deleteError) {
      console.error("Error removing channel member:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/channels/[id]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

