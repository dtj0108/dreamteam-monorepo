"use client"

import { useTeam } from "@/providers/team-provider"
import { FileBrowser } from "@/components/team/files"

export default function FilesPage() {
  const { workspaceId, userId } = useTeam()

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
        isAdmin={false} // TODO: Check actual admin status
      />
    </div>
  )
}
