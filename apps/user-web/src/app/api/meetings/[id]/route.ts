import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { endChimeMeeting, getChimeMeeting } from "@/lib/chime"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/meetings/[id] - Get meeting details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get the meeting with related data
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select(`
        *,
        created_by_profile:profiles!meetings_created_by_fkey(id, name, avatar_url),
        channel:channels(id, name),
        participants:meeting_participants(
          id,
          profile_id,
          chime_attendee_id,
          role,
          joined_at,
          left_at,
          profile:profiles(id, name, avatar_url)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", meeting.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not authorized to view this meeting" }, { status: 403 })
    }

    // If meeting is active, verify it still exists in Chime
    let chimeStatus = null
    if (meeting.status === "active" && meeting.chime_meeting_id) {
      const chimeResult = await getChimeMeeting(meeting.chime_meeting_id)
      chimeStatus = chimeResult.success ? "active" : "ended"

      // If Chime says meeting is ended but our DB says active, sync the status
      if (!chimeResult.success && meeting.status === "active") {
        await supabase
          .from("meetings")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", id)
        meeting.status = "ended"
      }
    }

    return NextResponse.json({
      id: meeting.id,
      workspaceId: meeting.workspace_id,
      channelId: meeting.channel_id,
      channel: meeting.channel,
      title: meeting.title,
      status: meeting.status,
      mediaRegion: meeting.media_region,
      createdBy: meeting.created_by_profile,
      createdAt: meeting.created_at,
      startedAt: meeting.started_at,
      endedAt: meeting.ended_at,
      participants: meeting.participants?.map((p: {
        id: string
        profile_id: string
        chime_attendee_id: string
        role: string
        joined_at: string
        left_at: string | null
        profile: { id: string; name: string; avatar_url: string | null }
      }) => ({
        id: p.id,
        profileId: p.profile_id,
        profile: p.profile,
        role: p.role,
        joinedAt: p.joined_at,
        leftAt: p.left_at,
        isActive: !p.left_at,
      })),
      chimeStatus,
    })
  } catch (error) {
    console.error("Error in GET /api/meetings/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/meetings/[id] - End a meeting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get the meeting
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Check if user is the host or workspace admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", meeting.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isHost = meeting.created_by === session.id
    const isAdmin = membership?.role === "owner" || membership?.role === "admin"

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Only the host or workspace admin can end the meeting" },
        { status: 403 }
      )
    }

    // End the Chime meeting (kicks all participants)
    if (meeting.chime_meeting_id) {
      const chimeResult = await endChimeMeeting(meeting.chime_meeting_id)
      if (!chimeResult.success) {
        console.error("Failed to end Chime meeting:", chimeResult.error)
        // Continue anyway - the meeting might already be ended
      }
    }

    // Update meeting status in database
    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating meeting status:", updateError)
      return NextResponse.json({ error: "Failed to end meeting" }, { status: 500 })
    }

    // Mark all participants as left
    await supabase
      .from("meeting_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("meeting_id", id)
      .is("left_at", null)

    return NextResponse.json({ success: true, message: "Meeting ended" })
  } catch (error) {
    console.error("Error in DELETE /api/meetings/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
