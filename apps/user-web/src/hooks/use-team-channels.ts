"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase"
import type { Channel } from "@/components/team/team-sidebar"
import type { RealtimeChannel } from "@supabase/supabase-js"

// Module-level cache for instant loads when returning to Team
const channelsCache = new Map<string, Channel[]>()

interface UseTeamChannelsOptions {
  workspaceId?: string
}

interface ChannelPayload {
  id: string
  name: string
  description: string | null
  is_private: boolean
  is_archived: boolean
  created_at: string
  unread_count?: number
}

export function useTeamChannels({ workspaceId }: UseTeamChannelsOptions) {
  // Initialize with cached data if available
  const cachedChannels = workspaceId ? channelsCache.get(workspaceId) : undefined
  const [channels, setChannels] = useState<Channel[]>(cachedChannels || [])
  const [isLoading, setIsLoading] = useState(!cachedChannels) // Only loading if no cache
  const [error, setError] = useState<string | null>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const hasInitialDataRef = useRef(!!cachedChannels) // Track if we've loaded data before
  const supabase = createClient()

  // Reset state when workspaceId changes
  useEffect(() => {
    const cached = workspaceId ? channelsCache.get(workspaceId) : undefined
    setChannels(cached || [])
    setIsLoading(!cached)
    hasInitialDataRef.current = !!cached
  }, [workspaceId])

  // Transform database channel to UI format
  const transformChannel = useCallback((ch: ChannelPayload): Channel => {
    return {
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
      unreadCount: ch.unread_count || 0,
    }
  }, [])

  // Fetch channels - only shows loading on first fetch (stale-while-revalidate)
  const fetchChannels = useCallback(async () => {
    if (!workspaceId) return

    try {
      // Only show loading spinner on first load, not on revalidation
      if (!hasInitialDataRef.current) {
        setIsLoading(true)
      }
      setError(null)

      const response = await fetch(
        `/api/team/channels?workspaceId=${workspaceId}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch channels")
      }

      const transformed = data.map(transformChannel)
      setChannels(transformed)
      if (workspaceId) channelsCache.set(workspaceId, transformed) // Update cache
      hasInitialDataRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels")
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, transformChannel])

  // Create a new channel
  const createChannel = useCallback(
    async (name: string, description?: string, isPrivate = false) => {
      if (!workspaceId) {
        throw new Error("Workspace ID required")
      }

      const response = await fetch("/api/team/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name,
          description,
          isPrivate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create channel")
      }

      // Add to local state
      setChannels((prev) => [...prev, transformChannel(data)])

      return data
    },
    [workspaceId, transformChannel]
  )

  // Update a channel
  const updateChannel = useCallback(
    async (
      channelId: string,
      updates: { name?: string; description?: string; isPrivate?: boolean }
    ) => {
      const response = await fetch(`/api/team/channels/${channelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update channel")
      }

      // Update local state
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId
            ? {
                ...ch,
                name: data.name,
                isPrivate: data.is_private,
              }
            : ch
        )
      )

      return data
    },
    []
  )

  // Delete a channel
  const deleteChannel = useCallback(async (channelId: string) => {
    const response = await fetch(`/api/team/channels/${channelId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Failed to delete channel")
    }

    // Remove from local state
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId))
  }, [])

  // Set up realtime subscription
  useEffect(() => {
    if (!workspaceId) return

    fetchChannels()

    // Subscribe to channel changes
    const channel = supabase
      .channel(`workspace:${workspaceId}:channels`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channels",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newChannel = transformChannel(payload.new as ChannelPayload)
          setChannels((prev) => [...prev, newChannel])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "channels",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const updated = payload.new as ChannelPayload
          if (updated.is_archived) {
            setChannels((prev) => prev.filter((ch) => ch.id !== updated.id))
          } else {
            setChannels((prev) =>
              prev.map((ch) =>
                ch.id === updated.id ? transformChannel(updated) : ch
              )
            )
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "channels",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          setChannels((prev) =>
            prev.filter((ch) => ch.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [workspaceId, supabase, fetchChannels, transformChannel])

  return {
    channels,
    isLoading,
    error,
    createChannel,
    updateChannel,
    deleteChannel,
    refetch: fetchChannels,
  }
}

