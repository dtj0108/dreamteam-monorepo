import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { createChimeMeeting, createChimeAttendee, getChimeMeeting, isChimeConfigured } from "@/lib/chime"
import { nanoid } from "nanoid"

// GET /api/meetings - List meetings for workspace or channel
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const channelId = searchParams.get("channelId")
    const status = searchParams.get("status") || "active"
    const includeParticipants = searchParams.get("includeParticipants") === "true"

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    // Build query - conditionally include participants with profiles
    const selectQuery = includeParticipants
      ? `
        *,
        created_by_profile:profiles!meetings_created_by_fkey(id, name, avatar_url),
        channel:channels(id, name),
        participant_count:meeting_participants(count),
        participants:meeting_participants(
          profile:profiles(id, name, avatar_url)
        )
      `
      : `
        *,
        created_by_profile:profiles!meetings_created_by_fkey(id, name, avatar_url),
        channel:channels(id, name),
        participant_count:meeting_participants(count)
      `

    let query = supabase
      .from("meetings")
      .select(selectQuery)
      .eq("workspace_id", workspaceId)
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (channelId) {
      query = query.eq("channel_id", channelId)
    }

    const { data: meetings, error } = await query

    if (error) {
      console.error("Error fetching meetings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For active meetings, verify they still exist in Chime
    // This handles edge cases where Chime auto-cleaned up the meeting
    const verifiedMeetings = []
    for (const meeting of meetings || []) {
      if (meeting.status === "active" && meeting.chime_meeting_id) {
        const chimeResult = await getChimeMeeting(meeting.chime_meeting_id)
        if (!chimeResult.success) {
          // Chime meeting is gone, mark as ended in our database
          console.log(`Meeting ${meeting.id} no longer exists in Chime, marking as ended`)
          await supabase
            .from("meetings")
            .update({ status: "ended", ended_at: new Date().toISOString() })
            .eq("id", meeting.id)
          // Don't include this meeting in results
          continue
        }
      }
      verifiedMeetings.push(meeting)
    }

    // Transform the response
    const transformedMeetings = verifiedMeetings.map((meeting: Record<string, unknown> & {
      created_by_profile?: unknown
      participant_count?: { count: number }[]
      participants?: Array<{ profile: { id: string; name: string; avatar_url: string | null } }>
    }) => ({
      ...meeting,
      createdBy: meeting.created_by_profile,
      participantCount: meeting.participant_count?.[0]?.count || 0,
      participants: meeting.participants || undefined,
      created_by_profile: undefined,
      participant_count: undefined,
    }))

    return NextResponse.json(transformedMeetings)
  } catch (error) {
    console.error("Error in GET /api/meetings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isChimeConfigured()) {
      return NextResponse.json(
        { error: "Video meetings not configured. AWS credentials required." },
        { status: 503 }
      )
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, channelId, title } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    // Check if there's already an active meeting in this channel
    if (channelId) {
      const { data: existingMeeting } = await supabase
        .from("meetings")
        .select("id")
        .eq("channel_id", channelId)
        .eq("status", "active")
        .single()

      if (existingMeeting) {
        return NextResponse.json(
          { error: "A meeting is already active in this channel", existingMeetingId: existingMeeting.id },
          { status: 409 }
        )
      }
    }

    // Generate a unique external meeting ID
    const externalMeetingId = `${workspaceId}-${nanoid(10)}`

    // Create the Chime meeting
    const chimeResult = await createChimeMeeting({
      externalMeetingId,
      tags: {
        WorkspaceId: workspaceId,
        ChannelId: channelId || "none",
        CreatedBy: session.id,
      },
    })

    if (!chimeResult.success || !chimeResult.meeting) {
      return NextResponse.json(
        { error: chimeResult.error || "Failed to create video meeting" },
        { status: 500 }
      )
    }

    // Create the meeting record in our database
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        workspace_id: workspaceId,
        channel_id: channelId || null,
        chime_meeting_id: chimeResult.meeting.meetingId,
        external_meeting_id: externalMeetingId,
        media_region: chimeResult.meeting.mediaRegion,
        media_placement: chimeResult.meeting.mediaPlacement,
        title: title || null,
        status: "active",
        created_by: session.id,
      })
      .select()
      .single()

    if (meetingError) {
      console.error("Error creating meeting record:", meetingError)
      return NextResponse.json({ error: meetingError.message }, { status: 500 })
    }

    // Automatically create attendee for the meeting creator (host)
    const attendeeResult = await createChimeAttendee({
      meetingId: chimeResult.meeting.meetingId,
      externalUserId: session.id,
    })

    if (!attendeeResult.success || !attendeeResult.attendee) {
      // Meeting was created but attendee failed - clean up
      console.error("Failed to create host attendee:", attendeeResult.error)
      return NextResponse.json({ error: "Failed to join meeting" }, { status: 500 })
    }

    // Add the creator as a participant (host)
    await supabase.from("meeting_participants").insert({
      meeting_id: meeting.id,
      profile_id: session.id,
      chime_attendee_id: attendeeResult.attendee.attendeeId,
      external_user_id: attendeeResult.attendee.externalUserId,
      role: "host",
      join_token: attendeeResult.attendee.joinToken,
    })

    return NextResponse.json(
      {
        meeting: {
          id: meeting.id,
          channelId: meeting.channel_id,
          title: meeting.title,
          status: meeting.status,
          createdAt: meeting.created_at,
        },
        // Include Chime data needed for client SDK
        chime: {
          meetingId: chimeResult.meeting.meetingId,
          mediaRegion: chimeResult.meeting.mediaRegion,
          mediaPlacement: chimeResult.meeting.mediaPlacement,
        },
        attendee: {
          attendeeId: attendeeResult.attendee.attendeeId,
          joinToken: attendeeResult.attendee.joinToken,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in POST /api/meetings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
