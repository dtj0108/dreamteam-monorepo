"use client"

import { useState, useEffect, useCallback, use, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageList, MessageInput } from "@/components/team"
import { useUser } from "@/hooks/use-user"
import { useTeamMessages } from "@/hooks/use-team-messages"
import { useTeam } from "@/providers/team-provider"
import { MessageSquare, Paperclip } from "lucide-react"
import { type UploadedFile } from "@/types/files"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileBrowser } from "@/components/team/files"

interface DMParticipant {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  is_agent?: boolean
}

export default function DMPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: dmId } = use(params)
  const { user } = useUser()
  const { getDMById, refreshDMs } = useTeam()
  const workspaceId = user?.workspaceId

  // Get cached DM data from sidebar for instant display
  const cachedDM = getDMById(dmId)

  const [otherParticipant, setOtherParticipant] = useState<DMParticipant | null>(null)
  const [activeTab, setActiveTab] = useState<"messages" | "files">("messages")

  // Use the real-time messages hook
  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    loadMore,
    hasMore,
    typingUsers,
    setTyping,
  } = useTeamMessages({
    dmConversationId: dmId,
    workspaceId: workspaceId || undefined,
    currentUserId: user?.id,
    currentUserName: user?.name,
  })

  // Fetch full participant info (email, etc.) - non-blocking
  const fetchParticipant = useCallback(async () => {
    if (!workspaceId || !dmId) return

    try {
      // Fetch DM list to get full participant info
      const dmsResponse = await fetch(`/api/team/dm?workspaceId=${workspaceId}`)
      const dmsData = await dmsResponse.json()

      if (dmsResponse.ok && Array.isArray(dmsData)) {
        const dm = dmsData.find((d: { id: string }) => d.id === dmId)
        if (dm && dm.otherParticipants?.[0]) {
          setOtherParticipant(dm.otherParticipants[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch participant data:", error)
    }
  }, [workspaceId, dmId])

  useEffect(() => {
    fetchParticipant()
  }, [fetchParticipant])

  // Mark DM as read when page loads and when messages update
  useEffect(() => {
    const markAsRead = async () => {
      if (!dmId) return

      try {
        await fetch(`/api/team/dm/${dmId}/read`, { method: "PATCH" })
        // Refresh the DM list to update sidebar badge
        refreshDMs()
      } catch (error) {
        console.error("Failed to mark DM as read:", error)
      }
    }

    // Mark as read on initial load
    markAsRead()
  }, [dmId, refreshDMs])

  // Also mark as read when new messages arrive (user is actively viewing)
  useEffect(() => {
    if (messages.length === 0) return

    const markAsRead = async () => {
      try {
        await fetch(`/api/team/dm/${dmId}/read`, { method: "PATCH" })
        refreshDMs()
      } catch (error) {
        // Silent failure - not critical
      }
    }

    markAsRead()
  }, [dmId, messages.length, refreshDMs])

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

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent)
    } catch (error) {
      console.error("Failed to edit message:", error)
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId)
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  // Use cached data for instant display, fallback to fetched data
  const displayName = otherParticipant?.name || cachedDM?.participant?.name || "Conversation"
  const displayAvatar = otherParticipant?.avatar_url || cachedDM?.participant?.avatar
  const displayEmail = otherParticipant?.email

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* DM Header */}
      <div className="h-14 shrink-0 flex items-center gap-3 px-4 border-b bg-background">
        <Avatar className="size-10">
          <AvatarImage src={displayAvatar || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{displayName}</h2>
          {displayEmail && (
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "messages" | "files")}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="border-b px-4">
          <TabsList variant="line">
            <TabsTrigger value="messages">
              <MessageSquare className="size-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="files">
              <Paperclip className="size-4" />
              Files
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 mt-0">
          {/* Messages - scrollable area */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto">
            {messages.length === 0 && !messagesLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="size-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                  <MessageSquare className="size-10 text-orange-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Start the conversation
                </h2>
                <p className="text-muted-foreground max-w-md mb-4">
                  This is the beginning of your conversation with {displayName}.
                </p>
              </div>
            ) : (
              <MessageList
                messages={messages}
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
            placeholder={`Message ${displayName}`}
            onSend={handleSendMessage}
            onTyping={setTyping}
            workspaceId={workspaceId || ""}
            dmConversationId={dmId}
          />
        </TabsContent>

        <TabsContent value="files" className="flex-1 min-h-0 mt-0">
          <FileBrowser
            workspaceId={workspaceId || ""}
            dmConversationId={dmId}
            currentUserId={user?.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
