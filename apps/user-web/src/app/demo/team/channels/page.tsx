"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useDemoTeam, useDemoData } from "@/providers"
import { DemoTeamLayout } from "@/components/demo/demo-team-layout"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hash, Lock, Send, Smile, Paperclip, MoreHorizontal, Loader2 } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"

function DemoChannelPageContent() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get("id") || "channel-1"
  
  const { channels, getChannelMessages } = useDemoTeam()
  const { user } = useDemoData()
  
  const channel = channels.find(c => c.id === channelId) || channels[0]
  const messages = getChannelMessages(channelId)

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) return format(date, "h:mm a")
    if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`
    return format(date, "MMM d 'at' h:mm a")
  }

  return (
    <DemoTeamLayout breadcrumbs={[{ label: "Channels", href: "/demo/team" }, { label: `#${channel.name}` }]}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Channel Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {channel.isPrivate ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Hash className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">{channel.name}</h2>
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 py-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mb-4">
                  <Hash className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg">Welcome to #{channel.name}</h3>
                <p className="text-muted-foreground max-w-md">
                  This is the start of the #{channel.name} channel. {channel.description}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === "member-1"
                
                return (
                  <div key={message.id} className="flex gap-3 group hover:bg-muted/30 px-2 py-1 -mx-2 rounded-lg">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                        {message.senderName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{message.senderName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5">{message.content}</p>
                      
                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {message.reactions.map((reaction, idx) => (
                            <button
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-sm"
                            >
                              <span>{reaction.emoji}</span>
                              <span className="text-xs text-muted-foreground">{reaction.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Actions - show on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Input 
                placeholder={`Message #${channel.name}`}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button size="icon" className="h-7 w-7 bg-orange-500 hover:bg-orange-600">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoTeamLayout>
  )
}

export default function DemoChannelPage() {
  return (
    <Suspense fallback={
      <DemoTeamLayout breadcrumbs={[{ label: "Channels", href: "/demo/team" }]}>
        <div className="flex items-center justify-center flex-1 min-h-0">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DemoTeamLayout>
    }>
      <DemoChannelPageContent />
    </Suspense>
  )
}

