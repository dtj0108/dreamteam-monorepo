"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AtSignIcon, BellIcon, MessageSquareIcon, Hash } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// Demo mentions data
const demoMentions = [
  {
    id: "1",
    type: "mention",
    sender: { name: "Alex Johnson", avatar: null },
    channel: "general",
    content: "Hey @you, can you review the latest changes?",
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
]

const demoReactions = [
  {
    id: "1",
    type: "reaction",
    sender: { name: "Sam Wilson", avatar: null },
    channel: "random",
    emoji: "👍",
    messagePreview: "Great work on the presentation!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
]

const demoThreads = [
  {
    id: "1",
    channel: "announcements",
    preview: "Team meeting scheduled for Friday...",
    replyCount: 5,
    lastReply: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
  },
]

export default function MentionsPage() {
  const [activeTab, setActiveTab] = useState("mentions")

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mentions & Reactions</h1>
        <p className="text-muted-foreground">
          Messages where you were mentioned or reacted to
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="mentions" className="gap-2">
            <AtSignIcon className="size-4" />
            Mentions
          </TabsTrigger>
          <TabsTrigger value="reactions" className="gap-2">
            <BellIcon className="size-4" />
            Reactions
          </TabsTrigger>
          <TabsTrigger value="threads" className="gap-2">
            <MessageSquareIcon className="size-4" />
            Threads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentions" className="mt-6">
          {demoMentions.length > 0 ? (
            <div className="space-y-4">
              {demoMentions.map((mention) => (
                <Card key={mention.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={mention.sender.avatar || undefined} />
                        <AvatarFallback>
                          {getInitials(mention.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{mention.sender.name}</span>
                          <span className="text-sm text-muted-foreground">
                            in #{mention.channel}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(mention.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{mention.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AtSignIcon className="size-8 text-muted-foreground" />
                </div>
                <CardTitle className="mb-2">No mentions yet</CardTitle>
                <CardDescription className="text-center max-w-sm">
                  When someone mentions you in a channel or direct message, it
                  will appear here.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reactions" className="mt-6">
          {demoReactions.length > 0 ? (
            <div className="space-y-4">
              {demoReactions.map((reaction) => (
                <Card key={reaction.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={reaction.sender.avatar || undefined} />
                        <AvatarFallback>
                          {getInitials(reaction.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{reaction.sender.name}</span>
                          <span className="text-lg">{reaction.emoji}</span>
                          <span className="text-sm text-muted-foreground">
                            reacted to your message
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          &quot;{reaction.messagePreview}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(reaction.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BellIcon className="size-8 text-muted-foreground" />
                </div>
                <CardTitle className="mb-2">No reactions yet</CardTitle>
                <CardDescription className="text-center max-w-sm">
                  Reactions to your messages will show up here.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="threads" className="mt-6">
          {demoThreads.length > 0 ? (
            <div className="space-y-4">
              {demoThreads.map((thread) => (
                <Card key={thread.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
                        <Hash className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">#{thread.channel}</span>
                          <span className="text-sm text-muted-foreground">
                            {thread.replyCount} replies
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {thread.preview}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last reply{" "}
                          {formatDistanceToNow(thread.lastReply, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquareIcon className="size-8 text-muted-foreground" />
                </div>
                <CardTitle className="mb-2">No threads yet</CardTitle>
                <CardDescription className="text-center max-w-sm">
                  Threads you&apos;re participating in will appear here.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
