"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase"
import type { PresenceStatus } from "@/components/team/member-presence"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface PresenceState {
  [key: string]: {
    status: PresenceStatus
    lastSeen: string
    userId: string
    userName?: string
    avatar?: string
  }[]
}

interface UseTeamPresenceOptions {
  workspaceId?: string
  userId?: string
  userName?: string
  avatar?: string
}

export function useTeamPresence({
  workspaceId,
  userId,
  userName,
  avatar,
}: UseTeamPresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceStatus>>(
    new Map()
  )
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Update own status
  const setStatus = useCallback(
    async (status: PresenceStatus) => {
      if (!channelRef.current || !userId) return

      await channelRef.current.track({
        status,
        lastSeen: new Date().toISOString(),
        userId,
        userName,
        avatar,
      })
    },
    [userId, userName, avatar]
  )

  // Get status for a specific user
  const getUserStatus = useCallback(
    (targetUserId: string): PresenceStatus => {
      return onlineUsers.get(targetUserId) || "offline"
    },
    [onlineUsers]
  )

  useEffect(() => {
    if (!workspaceId || !userId) return

    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as PresenceState
        const users = new Map<string, PresenceStatus>()

        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            users.set(presence.userId, presence.status)
          })
        })

        setOnlineUsers(users)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev)
          newPresences.forEach((presence: any) => {
            next.set(presence.userId, presence.status)
          })
          return next
        })
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev)
          leftPresences.forEach((presence: any) => {
            next.delete(presence.userId)
          })
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          // Track initial presence as online
          await channel.track({
            status: "online" as PresenceStatus,
            lastSeen: new Date().toISOString(),
            userId,
            userName,
            avatar,
          })
        }
      })

    channelRef.current = channel

    // Handle visibility changes to update status
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus("away")
      } else {
        setStatus("online")
      }
    }

    // Handle before unload to mark as offline
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.untrack()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)

      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [workspaceId, userId, userName, avatar, supabase, setStatus])

  return {
    onlineUsers,
    isConnected,
    setStatus,
    getUserStatus,
    onlineCount: onlineUsers.size,
  }
}

