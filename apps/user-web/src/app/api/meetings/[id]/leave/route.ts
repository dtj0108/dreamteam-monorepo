import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { removeChimeAttendee, endChimeMeeting } from "@/lib/chime"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/meetings/[id]/leave - Leave a meeting
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Get user's participant record
    const { data: participant, error: participantError } = await supabase
      .from("meeting_participants")
      .select("*")
      .eq("meeting_id", id)
      .eq("profile_id", session.id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json({ error: "Not a participant in this meeting" }, { status: 404 })
    }

    // If already left, just return success
    if (participant.left_at) {
      return NextResponse.json({ success: true, message: "Already left meeting" })
    }

    // Remove attendee from Chime (if meeting is still active)
    if (meeting.status === "active" && meeting.chime_meeting_id && participant.chime_attendee_id) {
      const removeResult = await removeChimeAttendee(
        meeting.chime_meeting_id,
        participant.chime_attendee_id
      )

      if (!removeResult.success) {
        console.error("Failed to remove attendee from Chime:", removeResult.error)
        // Continue anyway - user may have already disconnected
      }
    }

    // Update participant record
    const { error: updateError } = await supabase
      .from("meeting_participants")
      .update({
        left_at: new Date().toISOString(),
        join_token: null, // Clear the token for security
      })
      .eq("id", participant.id)

    if (updateError) {
      console.error("Error updating participant:", updateError)
      return NextResponse.json({ error: "Failed to leave meeting" }, { status: 500 })
    }

    // Check if any participants remain in the meeting
    const { data: remainingParticipants } = await supabase
      .from("meeting_participants")
      .select("id")
      .eq("meeting_id", id)
      .is("left_at", null)

    // If no one is left, auto-end the meeting
    if (!remainingParticipants || remainingParticipants.length === 0) {
      // End the Chime meeting
      if (meeting.chime_meeting_id) {
        const endResult = await endChimeMeeting(meeting.chime_meeting_id)
        if (!endResult.success) {
          console.error("Failed to end Chime meeting:", endResult.error)
          // Continue anyway - meeting may have already been cleaned up by Chime
        }
      }

      // Update database status
      const { error: endError } = await supabase
        .from("meetings")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (endError) {
        console.error("Error ending meeting in database:", endError)
      }

      return NextResponse.json({ success: true, message: "Left meeting (meeting ended)" })
    }

    return NextResponse.json({ success: true, message: "Left meeting" })
  } catch (error) {
    console.error("Error in POST /api/meetings/[id]/leave:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
