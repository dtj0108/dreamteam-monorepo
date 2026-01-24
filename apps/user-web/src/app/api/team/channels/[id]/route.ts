import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/channels/[id] - Get a specific channel
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
    const { id } = await params

    const { data: channel, error } = await supabase
      .from("channels")
      .select(`
        *,
        channel_members(
          profile_id,
          joined_at,
          profiles:profile_id(id, name, avatar_url, email)
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching channel:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    return NextResponse.json(channel)
  } catch (error) {
    console.error("Error in GET /api/team/channels/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/team/channels/[id] - Update a channel
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { name, description, isPrivate, isArchived } = body

    // Check if user has permission (channel creator or admin)
    const { data: channel, error: fetchError } = await supabase
      .from("channels")
      .select("created_by, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Check if user is admin or creator
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", channel.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isAdminOrCreator =
      channel.created_by === session.id ||
      membership?.role === "admin" ||
      membership?.role === "owner"

    if (!isAdminOrCreator) {
      return NextResponse.json(
        { error: "Not authorized to update this channel" },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.toLowerCase().replace(/\s+/g, "-")
    if (description !== undefined) updateData.description = description
    if (isPrivate !== undefined) updateData.is_private = isPrivate
    if (isArchived !== undefined) updateData.is_archived = isArchived

    const { data: updated, error: updateError } = await supabase
      .from("channels")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating channel:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error in PUT /api/team/channels/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/channels/[id] - Delete a channel
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
    const { id } = await params

    // Check if user has permission
    const { data: channel, error: fetchError } = await supabase
      .from("channels")
      .select("created_by, workspace_id")
      .eq("id", id)
      .single()

    if (fetchError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Check if user is admin or creator
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", channel.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isAdminOrCreator =
      channel.created_by === session.id ||
      membership?.role === "admin" ||
      membership?.role === "owner"

    if (!isAdminOrCreator) {
      return NextResponse.json(
        { error: "Not authorized to delete this channel" },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from("channels")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting channel:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/channels/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
