import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/channels - Get all channels for the workspace
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

    // Get all channels in the workspace with user's membership info
    const { data: channels, error } = await supabase
      .from("channels")
      .select(`
        *,
        channel_members!inner(last_read_at, profile_id)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_archived", false)
      .eq("channel_members.profile_id", session.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching channels:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate unread count for each channel
    const channelsWithUnread = await Promise.all(
      (channels || []).map(async (channel: { id: string; channel_members?: { last_read_at: string }[] } & Record<string, unknown>) => {
        const lastReadAt = channel.channel_members?.[0]?.last_read_at

        // Count messages after last_read_at
        let unreadCount = 0
        if (lastReadAt) {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("channel_id", channel.id)
            .eq("is_deleted", false)
            .gt("created_at", lastReadAt)
            .neq("sender_id", session.id) // Don't count own messages

          unreadCount = count || 0
        } else {
          // If never read, count all messages (except own)
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("channel_id", channel.id)
            .eq("is_deleted", false)
            .neq("sender_id", session.id)

          unreadCount = count || 0
        }

        // Remove the nested channel_members from response
        const { channel_members, ...channelData } = channel
        return {
          ...channelData,
          unread_count: unreadCount,
        }
      })
    )

    return NextResponse.json(channelsWithUnread)
  } catch (error) {
    console.error("Error in GET /api/team/channels:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/channels - Create a new channel
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, name, description, isPrivate = false } = body

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: "Workspace ID and name required" },
        { status: 400 }
      )
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .insert({
        workspace_id: workspaceId,
        name: name.toLowerCase().replace(/\s+/g, "-"),
        description,
        is_private: isPrivate,
        created_by: session.id,
      })
      .select()
      .single()

    if (channelError) {
      console.error("Error creating channel:", channelError)
      // Check for duplicate name error
      if (channelError.code === "23505" || channelError.message.includes("duplicate key")) {
        return NextResponse.json(
          { error: "A channel with this name already exists" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: channelError.message }, { status: 500 })
    }

    // Add the creator as a channel member
    await supabase.from("channel_members").insert({
      channel_id: channel.id,
      profile_id: session.id,
    })

    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/channels:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
