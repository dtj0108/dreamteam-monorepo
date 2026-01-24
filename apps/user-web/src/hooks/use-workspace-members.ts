"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

interface Profile {
  id: string
  name: string
  avatar_url: string | null
  email: string
}

interface WorkspaceMember {
  id: string
  role: string
  display_name: string | null
  status: string | null
  status_text: string | null
  profile: Profile | null
}

export interface MemberForMention {
  id: string
  profileId: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  email: string
  status: string | null
}

interface UseWorkspaceMembersReturn {
  members: MemberForMention[]
  isLoading: boolean
  error: string | null
  filterByQuery: (query: string) => MemberForMention[]
}

export function useWorkspaceMembers(workspaceId: string): UseWorkspaceMembersReturn {
  const [members, setMembers] = useState<MemberForMention[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) {
      setMembers([])
      setIsLoading(false)
      return
    }

    const fetchMembers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch members")
        }

        const data: WorkspaceMember[] = await response.json()

        // Transform to MemberForMention format
        const transformed: MemberForMention[] = data
          .filter((m) => m.profile !== null)
          .map((m) => ({
            id: m.id,
            profileId: m.profile!.id,
            name: m.profile!.name,
            displayName: m.display_name,
            avatarUrl: m.profile!.avatar_url,
            email: m.profile!.email,
            status: m.status,
          }))

        setMembers(transformed)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [workspaceId])

  // Filter members by query (case-insensitive search on name and display name)
  const filterByQuery = useCallback(
    (query: string): MemberForMention[] => {
      if (!query) return members

      const lowerQuery = query.toLowerCase()
      return members.filter(
        (m) =>
          m.name.toLowerCase().includes(lowerQuery) ||
          (m.displayName && m.displayName.toLowerCase().includes(lowerQuery)) ||
          m.email.toLowerCase().includes(lowerQuery)
      )
    },
    [members]
  )

  return {
    members,
    isLoading,
    error,
    filterByQuery,
  }
}
