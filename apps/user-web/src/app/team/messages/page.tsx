"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hash, PlusIcon, Users } from "lucide-react"
import {
  ChannelHeader,
  MessageList,
  MessageInput,
  ThreadPanel,
  type Message,
} from "@/components/team"
import { useTeamMessages } from "@/hooks/use-team-messages"
import { useTeamPresence } from "@/hooks/use-team-presence"
import { useUser } from "@/hooks/use-user"
import { useTeam } from "@/providers/team-provider"

export default function TeamMessagesPage() {
  const { user } = useUser()
  const { channels, setShowCreateChannel, workspaceId } = useTeam()

  const [activeChannelId, setActiveChannelId] = useState<string>("general")
  const [selectedThread, setSelectedThread] = useState<Message | null>(null)

  const {
    messages,
    isLoading: messagesLoading,
    hasMore,
    sendMessage,
    deleteMessage,
    reactToMessage,
    loadMore,
    typingUsers,
    setTyping,
  } = useTeamMessages({
    channelId: activeChannelId,
    workspaceId,
    currentUserId: user?.id,
    currentUserName: user?.name,
    currentUserAvatar: undefined,
  })

  const { onlineUsers } = useTeamPresence({
    workspaceId,
    userId: user?.id,
    userName: user?.name,
  })

  // Get active channel info
  const activeChannel = channels.find((c) => c.id === activeChannelId)

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content)
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

  const handleOpenThread = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setSelectedThread(message)
    }
  }

  return (
    <>
      {activeChannel ? (
        <div className="flex-1 flex flex-col">
          {/* Channel Header */}
          <ChannelHeader
            name={activeChannel.name}
            isPrivate={activeChannel.isPrivate}
            memberCount={onlineUsers.size}
          />

          {/* Messages Area - renders immediately, no spinner */}
          {messages.length === 0 ? (
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="size-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                  <Hash className="size-10 text-orange-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Welcome to #{activeChannel.name}
                </h2>
                <p className="text-muted-foreground max-w-md mb-4">
                  This is the beginning of the #{activeChannel.name} channel.
                  Start a conversation with your team!
                </p>
              </div>
            </ScrollArea>
          ) : (
            <MessageList
              messages={messages}
              currentUserId={user?.id}
              isLoading={messagesLoading}
              hasMore={hasMore}
              typingUsers={typingUsers}
              onLoadMore={loadMore}
              onReact={handleReact}
              onReply={handleOpenThread}
              onEdit={(messageId: string) => { /* TODO: implement edit UI */ }}
              onDelete={deleteMessage}
            />
          )}

          {/* Message Input */}
          <MessageInput
            placeholder={`Message #${activeChannel.name}`}
            onSend={handleSendMessage}
            onTyping={setTyping}
            currentUser={user ? { name: user.name } : undefined}
            workspaceId={workspaceId || ""}
            channelId={activeChannelId}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center text-center py-8">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Team</h2>
              <p className="text-muted-foreground mb-4">
                Select a channel or start a conversation to get started.
              </p>
              <Button onClick={() => setShowCreateChannel(true)}>
                <PlusIcon className="size-4 mr-2" />
                Create Channel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Thread Panel */}
      {selectedThread && (
        <ThreadPanel
          parentMessage={selectedThread}
          replies={[]}
          currentUserId={user?.id}
          workspaceId={workspaceId || ""}
          channelId={activeChannelId}
          onClose={() => setSelectedThread(null)}
          onSendReply={async (content) => {
            console.log("Reply to thread:", content)
          }}
          onReact={handleReact}
        />
      )}
    </>
  )
}
