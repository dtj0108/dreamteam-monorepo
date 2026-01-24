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
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Send, Smile, Paperclip, MoreHorizontal, Circle, Loader2 } from "lucide-react"
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns"

function DemoDMPageContent() {
  const searchParams = useSearchParams()
  const dmId = searchParams.get("id")
  
  const { dmConversations, dmMessages, members } = useDemoTeam()
  const { user } = useDemoData()

  // If no DM selected, show the DM list
  if (!dmId) {
    return (
      <DemoTeamLayout breadcrumbs={[{ label: "Direct Messages" }]} title="Direct Messages">
        <div className="grid gap-3">
          {dmConversations.map((dm) => (
            <Link 
              key={dm.id}
              href={`/demo/team/dm?id=${dm.id}`}
              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-orange-100 text-orange-600">
                    {dm.participantName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {dm.participantStatus === "online" && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{dm.participantName}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(dm.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {dm.lastMessage}
                </p>
              </div>
              {dm.unreadCount > 0 && (
                <Badge className="shrink-0 bg-orange-500">{dm.unreadCount}</Badge>
              )}
            </Link>
          ))}
        </div>
      </DemoTeamLayout>
    )
  }

  const dm = dmConversations.find(d => d.id === dmId)
  const messages = dmMessages[dmId] || []
  const participant = members.find(m => m.id === dm?.participantId)

  if (!dm || !participant) {
    return (
      <DemoTeamLayout breadcrumbs={[{ label: "Direct Messages" }]}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Conversation not found</p>
        </div>
      </DemoTeamLayout>
    )
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) return format(date, "h:mm a")
    if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`
    return format(date, "MMM d 'at' h:mm a")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-emerald-500"
      case "away": return "bg-amber-500"
      default: return "bg-gray-400"
    }
  }

  return (
    <DemoTeamLayout breadcrumbs={[{ label: "Direct Messages", href: "/demo/team/dm" }, { label: participant.name }]}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* DM Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-orange-100 text-orange-600">
                  {participant.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${getStatusColor(participant.status)}`} />
            </div>
            <div>
              <h2 className="font-semibold">{participant.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{participant.status}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 py-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === "member-1"
              
              return (
                <div key={message.id} className="flex gap-3 group hover:bg-muted/30 px-2 py-1 -mx-2 rounded-lg">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={isOwnMessage ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}>
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
                  </div>
                  
                  {/* Message Actions */}
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
            })}
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
                placeholder={`Message ${participant.name}`}
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

export default function DemoDMPage() {
  return (
    <Suspense fallback={
      <DemoTeamLayout breadcrumbs={[{ label: "Direct Messages" }]}>
        <div className="flex items-center justify-center flex-1 min-h-0">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DemoTeamLayout>
    }>
      <DemoDMPageContent />
    </Suspense>
  )
}

