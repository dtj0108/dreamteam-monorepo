"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlusIcon, SearchIcon, AtSignIcon, UserIcon, MessageSquare } from "lucide-react"
import { MemberPresence } from "@/components/team"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTeamPresence } from "@/hooks/use-team-presence"

const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001"

// Demo team members
const demoMembers = [
  { id: "1", name: "Alex Johnson", email: "alex@example.com", avatar: null },
  { id: "2", name: "Sam Wilson", email: "sam@example.com", avatar: null },
  { id: "3", name: "Jordan Lee", email: "jordan@example.com", avatar: null },
]

export default function DirectMessagesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewDM, setShowNewDM] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")

  const { getUserStatus } = useTeamPresence({
    workspaceId: DEMO_WORKSPACE_ID,
  })

  const filteredMembers = demoMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direct Messages</h1>
          <p className="text-muted-foreground">
            Private conversations with team members
          </p>
        </div>
        <Button onClick={() => setShowNewDM(true)}>
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

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <AtSignIcon className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">No direct messages yet</CardTitle>
          <CardDescription className="text-center max-w-sm mb-4">
            Start a private conversation with a team member.
          </CardDescription>
          <Button onClick={() => setShowNewDM(true)}>
            <UserIcon className="size-4 mr-2" />
            Find People
          </Button>
        </CardContent>
      </Card>

      {/* New DM Dialog */}
      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Direct Message</DialogTitle>
            <DialogDescription>
              Select a team member to start a conversation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    // In production, this would start a DM
                    setShowNewDM(false)
                  }}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <MemberPresence status={getUserStatus(member.id)} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <MessageSquare className="size-4 text-muted-foreground" />
                </button>
              ))}

              {filteredMembers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No members found
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
