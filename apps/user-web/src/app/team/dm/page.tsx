"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlusIcon, SearchIcon, AtSignIcon, MessageSquareIcon } from "lucide-react"
import { StartDMDialog, MemberPresence } from "@/components/team"
import { useTeam } from "@/providers/team-provider"
import { useWorkspace } from "@/providers/workspace-provider"
import { useUser } from "@/hooks/use-user"

export default function DirectMessagesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const { currentWorkspace } = useWorkspace()
  const { user } = useUser()
  const {
    directMessages,
    showStartDM,
    setShowStartDM,
    startDM,
  } = useTeam()

  const filteredDMs = directMessages.filter((dm) =>
    dm.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Direct Messages</h1>
            <p className="text-muted-foreground">
              Private conversations with team members
            </p>
          </div>
          <Button onClick={() => setShowStartDM(true)}>
            <PlusIcon className="size-4 mr-2" />
            New Message
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* DM List */}
        <div className="grid gap-4">
          {filteredDMs.map((dm) => (
            <Link key={dm.id} href={`/team/dm/${dm.id}`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarImage src={dm.participant.avatar} />
                      <AvatarFallback>{getInitials(dm.participant.name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <MemberPresence status={dm.status} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{dm.participant.name}</h3>
                      {(dm.unreadCount ?? 0) > 0 && (
                        <span className="size-5 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center">
                          {dm.unreadCount}
                        </span>
                      )}
                    </div>
                    {dm.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {dm.lastMessage}
                      </p>
                    )}
                  </div>
                  <MessageSquareIcon className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}

          {filteredDMs.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AtSignIcon className="size-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">
                  {searchQuery
                    ? "No conversations match your search"
                    : "No direct messages yet"}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start a private conversation with a team member."}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowStartDM(true)}>
                    <PlusIcon className="size-4 mr-2" />
                    Find People
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Start DM Dialog */}
        <StartDMDialog
          open={showStartDM}
          onOpenChange={setShowStartDM}
          workspaceId={currentWorkspace?.id}
          currentUserId={user?.id}
          onStartDM={startDM}
        />
      </div>
    </ScrollArea>
  )
}
