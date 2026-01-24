"use client"

import { useState, useEffect, useCallback, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageList, MessageInput, ChannelHeader, ChannelMembersDialog } from "@/components/team"
import { useUser } from "@/hooks/use-user"
import { useTeamMessages } from "@/hooks/use-team-messages"
import { useChannelMeetings } from "@/hooks/use-channel-meetings"
import { useTeam } from "@/providers/team-provider"
import { useMeeting } from "@/providers/meeting-provider"
import { Hash } from "lucide-react"
import { type UploadedFile } from "@/types/files"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dreamteam/ui/alert-dialog"

interface ChannelMember {
  profile_id: string
  joined_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    email: string
  }
}

interface ChannelData {
  id: string
  name: string
  description: string | null
  is_private: boolean
  is_archived: boolean
  workspace_id: string
  created_by: string
  channel_members: ChannelMember[]
}

interface ActiveMeetingData {
  id: string
  participantCount: number
}

export default function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: channelId } = use(params)
  const router = useRouter()
  const { user } = useUser()
  const { getChannelById } = useTeam()
  const { createMeeting } = useMeeting()
  const workspaceId = user?.workspaceId

  // Get cached channel data from sidebar for instant display
  const cachedChannel = getChannelById(channelId)

  const [channel, setChannel] = useState<ChannelData | null>(null)
  const [isStarred, setIsStarred] = useState(false)
  const [showMembersDialog, setShowMembersDialog] = useState(false)
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingData | null>(null)
  const [isStartingCall, setIsStartingCall] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Use the real-time messages hook
  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
    deleteMessage,
    reactToMessage,
    loadMore,
    hasMore,
    typingUsers,
    setTyping,
  } = useTeamMessages({
    channelId,
    workspaceId: workspaceId || undefined,
    currentUserId: user?.id,
    currentUserName: user?.name,
  })

  // Fetch ended meetings for timeline display
  const { meetings } = useChannelMeetings({
    channelId,
    workspaceId: workspaceId || undefined,
  })

  // Fetch full channel info (members, etc.) - non-blocking
  const fetchChannel = useCallback(async () => {
    if (!channelId) return

    try {
      const response = await fetch(`/api/team/channels/${channelId}`)
      const data = await response.json()

      if (response.ok) {
        setChannel(data)
      }
    } catch (error) {
      console.error("Failed to fetch channel data:", error)
    }
  }, [channelId])

  // Fetch user's role in the workspace
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

  // Fetch active meeting in channel
  const fetchActiveMeeting = useCallback(async () => {
    if (!channelId || !workspaceId) return

    try {
      const response = await fetch(
        `/api/meetings?workspaceId=${workspaceId}&channelId=${channelId}&status=active`
      )
      const data = await response.json()

      if (response.ok && data.length > 0) {
        setActiveMeeting({
          id: data[0].id,
          participantCount: data[0].participantCount || 1,
        })
      } else {
        setActiveMeeting(null)
      }
    } catch (error) {
      console.error("Failed to fetch active meeting:", error)
    }
  }, [channelId, workspaceId])

  // Mark channel as read when viewing
  const markAsRead = useCallback(async () => {
    if (!channelId) return

    try {
      await fetch(`/api/team/channels/${channelId}/read`, {
        method: "PATCH",
      })
    } catch (error) {
      console.error("Failed to mark channel as read:", error)
    }
  }, [channelId])

  // Fetch channel data, user role, and mark as read on mount
  useEffect(() => {
    fetchChannel()
    fetchUserRole()
    markAsRead()
  }, [fetchChannel, fetchUserRole, markAsRead])

  // Poll for active meeting status every 10 seconds
  // This ensures the UI reflects the current meeting state (e.g., when a meeting ends)
  useEffect(() => {
    if (!channelId || !workspaceId) return

    // Initial fetch
    fetchActiveMeeting()

    // Poll every 10 seconds
    const interval = setInterval(fetchActiveMeeting, 10000)

    return () => clearInterval(interval)
  }, [channelId, workspaceId, fetchActiveMeeting])

  const handleSendMessage = async (content: string, attachments?: UploadedFile[]) => {
    try {
      await sendMessage(content, attachments)
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await reactToMessage(messageId, emoji)
    } catch (error) {
      console.error("Failed to react:", error)
    }
  }

  const handleEdit = async (messageId: string) => {
    // TODO: Implement edit UI
    console.log("Edit message:", messageId)
  }

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId)
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  const handleToggleStar = () => {
    setIsStarred(!isStarred)
    // TODO: Persist star state
  }

  const handleOpenMembers = () => {
    setShowMembersDialog(true)
  }

  const handleDeleteChannel = async () => {
    if (!channelId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/team/channels/${channelId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Redirect to team page after deletion
        router.push("/team")
      } else {
        const data = await response.json()
        console.error("Failed to delete channel:", data.error)
      }
    } catch (error) {
      console.error("Failed to delete channel:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSearch = () => {
    // TODO: Implement search
    console.log("Search in channel")
  }

  const handleStartCall = async () => {
    if (!workspaceId) return

    setIsStartingCall(true)
    try {
      const meetingId = await createMeeting(
        workspaceId,
        channelId,
        `Call in #${displayName}`
      )
      if (meetingId) {
        router.push(`/team/meetings/${meetingId}`)
      }
    } catch (error) {
      console.error("Failed to start call:", error)
    } finally {
      setIsStartingCall(false)
    }
  }

  const handleJoinCall = () => {
    if (activeMeeting) {
      router.push(`/team/meetings/${activeMeeting.id}`)
    }
  }

  const memberCount = channel?.channel_members?.length || 0
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Use cached channel name for instant display, fallback to full channel data
  const displayName = channel?.name || cachedChannel?.name || "Channel"
  const displayDescription = channel?.description || undefined
  const displayPrivate = channel?.is_private ?? cachedChannel?.isPrivate

  // Check if user can delete the channel (admin, owner, or channel creator)
  const canDelete =
    channel?.created_by === user?.id ||
    userRole === "admin" ||
    userRole === "owner"

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Channel Header */}
      <ChannelHeader
        name={displayName}
        description={displayDescription}
        memberCount={memberCount}
        isPrivate={displayPrivate}
        isStarred={isStarred}
        activeMeeting={activeMeeting}
        isStartingCall={isStartingCall}
        canDelete={canDelete}
        onToggleStar={handleToggleStar}
        onOpenMembers={handleOpenMembers}
        onSearch={handleSearch}
        onStartCall={handleStartCall}
        onJoinCall={handleJoinCall}
        onDelete={() => setShowDeleteDialog(true)}
      />

      {/* Messages - scrollable area */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 && !messagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="size-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Hash className="size-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Welcome to #{displayName}
            </h2>
            <p className="text-muted-foreground max-w-md mb-4">
              {displayDescription || "This is the beginning of this channel. Send a message to start the conversation!"}
            </p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            meetings={meetings}
            currentUserId={user?.id}
            isLoading={messagesLoading}
            hasMore={hasMore}
            typingUsers={typingUsers}
            scrollContainerRef={messagesContainerRef}
            onLoadMore={loadMore}
            onReact={handleReact}
            onReply={() => {}}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        placeholder={`Message #${displayName}`}
        onSend={handleSendMessage}
        onTyping={setTyping}
        workspaceId={workspaceId || ""}
        channelId={channelId}
      />

      {/* Members Dialog */}
      <ChannelMembersDialog
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
        channelId={channelId}
        channelName={displayName}
        workspaceId={workspaceId || undefined}
        currentUserId={user?.id}
        onMembersChange={fetchChannel}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete #{displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this channel and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Channel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
