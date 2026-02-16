"use client"

import { useState, useCallback, useEffect } from "react"
import { useTeam } from "@/providers/team-provider"
import { useUser } from "@/hooks/use-user"
import { FileBrowser } from "@/components/team/files"

export default function FilesPage() {
  const { workspaceId, userId } = useTeam()
  const { user } = useUser()
  const [userRole, setUserRole] = useState<string | null>(null)

  const fetchUserRole = useCallback(async () => {
    if (!workspaceId || !user?.id) return

    try {
      const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        const currentMember = data.find(
          (m: { profile: { id: string } }) => m.profile?.id === user.id
        )
        if (currentMember) {
          setUserRole(currentMember.role)
        }
      }
    } catch (error) {
      console.error("Failed to fetch user role:", error)
    }
  }, [workspaceId, user?.id])

  useEffect(() => {
    fetchUserRole()
  }, [fetchUserRole])

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 shrink-0 flex items-center px-4 border-b bg-background">
        <h1 className="text-lg font-semibold">Files</h1>
      </div>

      {/* File browser */}
      <FileBrowser
        workspaceId={workspaceId}
        currentUserId={userId}
        isAdmin={userRole === "admin" || userRole === "owner"}
      />
    </div>
  )
}
