"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMeeting } from "@/providers/meeting-provider"
import { MeetingRoom, PreJoinScreen } from "@/components/meetings"
import { Loader2 } from "lucide-react"

interface MeetingData {
  id: string
  workspaceId: string
  channelId?: string
  channel?: { id: string; name: string }
  title?: string
  status: string
  createdBy: { id: string; name: string; avatar_url?: string }
}

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string

  const { activeMeeting, meetingState, joinMeeting } = useMeeting()
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPreJoin, setShowPreJoin] = useState(true)
  const [isJoining, setIsJoining] = useState(false)

  // Fetch meeting details
  useEffect(() => {
    async function fetchMeeting() {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Meeting not found")
        }

        setMeetingData(data)

        // If meeting has ended, show error
        if (data.status === "ended") {
          setError("This meeting has ended")
        }
      } catch (err) {
        console.error("Failed to fetch meeting:", err)
        setError(err instanceof Error ? err.message : "Failed to load meeting")
      } finally {
        setIsLoading(false)
      }
    }

    if (meetingId) {
      fetchMeeting()
    }
  }, [meetingId])

  // Handle joining the meeting
  const handleJoin = async () => {
    setIsJoining(true)
    try {
      const success = await joinMeeting(meetingId)
      if (success) {
        setShowPreJoin(false)
      }
    } catch (err) {
      console.error("Failed to join meeting:", err)
    } finally {
      setIsJoining(false)
    }
  }

  // Handle leaving the meeting
  const handleLeave = () => {
    // Navigate back to the channel or team page
    if (meetingData?.channelId) {
      router.push(`/team/channels/${meetingData.channelId}`)
    } else {
      router.push("/team")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error || !meetingData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-xl font-semibold mb-2">Unable to Load Meeting</h1>
        <p className="text-muted-foreground mb-4">{error || "Meeting not found"}</p>
        <button
          onClick={() => router.push("/team")}
          className="text-primary hover:underline"
        >
          Return to Team
        </button>
      </div>
    )
  }

  // Pre-join screen
  if (showPreJoin && meetingState !== "connected") {
    return (
      <PreJoinScreen
        meetingTitle={meetingData.title || `Meeting in #${meetingData.channel?.name || "team"}`}
        onJoin={handleJoin}
        isJoining={isJoining}
      />
    )
  }

  // Active meeting room
  return <MeetingRoom onLeave={handleLeave} className="h-screen" />
}
