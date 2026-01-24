"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlusIcon, SearchIcon, HashIcon, LockIcon, UsersIcon } from "lucide-react"
import { CreateChannelDialog } from "@/components/team"
import { useTeam } from "@/providers/team-provider"

export default function ChannelsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const {
    channels,
    createChannel,
    showCreateChannel,
    setShowCreateChannel,
  } = useTeam()

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateChannel = async (
    name: string,
    description: string,
    isPrivate: boolean
  ) => {
    await createChannel(name, description, isPrivate)
  }

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Channels</h1>
          <p className="text-muted-foreground">
            Browse and manage channels in your workspace
          </p>
        </div>
        <Button onClick={() => setShowCreateChannel(true)}>
          <PlusIcon className="size-4 mr-2" />
          Create Channel
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Channels List - renders immediately, no spinner */}
      <div className="grid gap-4">
        {filteredChannels.map((channel) => {
          const Icon = channel.isPrivate ? LockIcon : HashIcon
          return (
            <Link key={channel.id} href={`/team/channels/${channel.id}`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Icon className="size-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">#{channel.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      No description
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersIcon className="size-4" />
                    <span>View channel</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {filteredChannels.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HashIcon className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No channels match your search"
                  : "No channels yet. Create one to get started!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

        {/* Create Channel Dialog */}
        <CreateChannelDialog
          open={showCreateChannel}
          onOpenChange={setShowCreateChannel}
          onCreateChannel={handleCreateChannel}
        />
      </div>
    </ScrollArea>
  )
}
