"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hash, PlusIcon, SendIcon, SmileIcon, PaperclipIcon } from "lucide-react"

const defaultChannels = [
  { id: "general", name: "general", unread: 0 },
  { id: "announcements", name: "announcements", unread: 0 },
  { id: "random", name: "random", unread: 0 },
]

export default function MessagingPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Channels Sidebar */}
      <div className="w-64 border-r bg-muted/30 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Channels</h2>
          <Button variant="ghost" size="icon" className="size-6">
            <PlusIcon className="size-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {defaultChannels.map((channel) => (
              <button
                key={channel.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left"
              >
                <Hash className="size-4 text-muted-foreground" />
                <span>{channel.name}</span>
                {channel.unread > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {channel.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 border-b px-4 flex items-center">
          <Hash className="size-5 text-muted-foreground mr-2" />
          <h1 className="font-semibold">general</h1>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="size-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Hash className="size-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to #general</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              This is the beginning of the #general channel. Use this space for team-wide
              communication and announcements.
            </p>
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <PlusIcon className="size-5" />
            </Button>
            <div className="relative flex-1">
              <Input
                placeholder="Message #general"
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7">
                  <PaperclipIcon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7">
                  <SmileIcon className="size-4" />
                </Button>
              </div>
            </div>
            <Button size="icon" className="shrink-0">
              <SendIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

