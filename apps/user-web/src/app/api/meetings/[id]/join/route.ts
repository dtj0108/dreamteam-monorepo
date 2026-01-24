import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { createChimeAttendee, isChimeConfigured } from "@/lib/chime"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/meetings/[id]/join - Join a meeting and get attendee token
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isChimeConfigured()) {
      return NextResponse.json(
        { error: "Video meetings not configured" },
        { status: 503 }
      )
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

    if (meeting.status !== "active") {
      return NextResponse.json({ error: "Meeting has ended" }, { status: 410 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", meeting.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: "Not authorized to join this meeting" }, { status: 403 })
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from("meeting_participants")
      .select("*")
      .eq("meeting_id", id)
      .eq("profile_id", session.id)
      .single()

    // If already a participant and not left, return existing token
    if (existingParticipant && !existingParticipant.left_at && existingParticipant.join_token) {
      return NextResponse.json({
        meeting: {
          id: meeting.id,
          channelId: meeting.channel_id,
          title: meeting.title,
        },
        chime: {
          meetingId: meeting.chime_meeting_id,
          mediaRegion: meeting.media_region,
          mediaPlacement: meeting.media_placement,
        },
        attendee: {
          attendeeId: existingParticipant.chime_attendee_id,
          joinToken: existingParticipant.join_token,
        },
        isRejoin: false,
      })
    }

    // Create a new attendee in Chime
    const attendeeResult = await createChimeAttendee({
      meetingId: meeting.chime_meeting_id,
      externalUserId: session.id,
    })

    if (!attendeeResult.success || !attendeeResult.attendee) {
      return NextResponse.json(
        { error: attendeeResult.error || "Failed to join meeting" },
        { status: 500 }
      )
    }

    // If user was a previous participant who left, update their record
    if (existingParticipant) {
      await supabase
        .from("meeting_participants")
        .update({
          chime_attendee_id: attendeeResult.attendee.attendeeId,
          external_user_id: attendeeResult.attendee.externalUserId,
          join_token: attendeeResult.attendee.joinToken,
          joined_at: new Date().toISOString(),
          left_at: null,
        })
        .eq("id", existingParticipant.id)
    } else {
      // Create new participant record
      const isHost = meeting.created_by === session.id
      await supabase.from("meeting_participants").insert({
        meeting_id: id,
        profile_id: session.id,
        chime_attendee_id: attendeeResult.attendee.attendeeId,
        external_user_id: attendeeResult.attendee.externalUserId,
        role: isHost ? "host" : "participant",
        join_token: attendeeResult.attendee.joinToken,
      })
    }

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        channelId: meeting.channel_id,
        title: meeting.title,
      },
      chime: {
        meetingId: meeting.chime_meeting_id,
        mediaRegion: meeting.media_region,
        mediaPlacement: meeting.media_placement,
      },
      attendee: {
        attendeeId: attendeeResult.attendee.attendeeId,
        joinToken: attendeeResult.attendee.joinToken,
      },
      isRejoin: !!existingParticipant,
    })
  } catch (error) {
    console.error("Error in POST /api/meetings/[id]/join:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
