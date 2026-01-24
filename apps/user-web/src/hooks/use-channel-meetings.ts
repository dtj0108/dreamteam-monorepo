"use client"

import { useState, useEffect, useCallback } from "react"

export interface MeetingParticipant {
  profile: {
    id: string
    name: string
    avatar_url: string | null
  }
}

export interface ChannelMeeting {
  id: string
  title: string | null
  startedAt: string
  endedAt: string
  participants: MeetingParticipant[]
}

interface UseChannelMeetingsOptions {
  channelId: string
  workspaceId?: string
  enabled?: boolean
}

export function useChannelMeetings({
  channelId,
  workspaceId,
  enabled = true,
}: UseChannelMeetingsOptions) {
  const [meetings, setMeetings] = useState<ChannelMeeting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    if (!channelId || !workspaceId || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/meetings?workspaceId=${workspaceId}&channelId=${channelId}&status=ended&includeParticipants=true`
      )

      if (!response.ok) {
        throw new Error("Failed to fetch meetings")
      }

      const data = await response.json()

      // Transform API response to our format
      const transformedMeetings: ChannelMeeting[] = data.map((meeting: {
        id: string
        title: string | null
        started_at: string
        ended_at: string
        participants?: Array<{
          profile: {
            id: string
            name: string
            avatar_url: string | null
          }
        }>
      }) => ({
        id: meeting.id,
        title: meeting.title,
        startedAt: meeting.started_at,
        endedAt: meeting.ended_at,
        participants: meeting.participants || [],
      }))

      setMeetings(transformedMeetings)
    } catch (err) {
      console.error("Error fetching channel meetings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch meetings")
    } finally {
      setIsLoading(false)
    }
  }, [channelId, workspaceId, enabled])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  return {
    meetings,
    isLoading,
    error,
    refetch: fetchMeetings,
  }
}
