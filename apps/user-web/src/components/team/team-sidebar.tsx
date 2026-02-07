"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MemberPresence, PresenceStatus } from "./member-presence"
import { cn } from "@/lib/utils"
import {
  Hash,
  Lock,
  Plus,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Settings,
  FileIcon,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface Channel {
  id: string
  name: string
  isPrivate?: boolean
  unreadCount?: number
  isMuted?: boolean
}

export interface DirectMessage {
  id: string
  participant: {
    id: string
    name: string
    avatar?: string
    is_agent?: boolean
  }
  status: PresenceStatus
  unreadCount?: number
  lastMessage?: string
}

interface TeamSidebarProps {
  channels: Channel[]
  directMessages: DirectMessage[]
  activeChannelId?: string
  activeDmId?: string
  workspaceId?: string
  onCreateChannel?: () => void
  onStartDM?: () => void
}

export function TeamSidebar({
  channels,
  directMessages,
  activeChannelId,
  activeDmId,
  workspaceId,
  onCreateChannel,
  onStartDM,
}: TeamSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useLocalStorage("team-channels-open", true)
  const [dmsOpen, setDmsOpen] = useLocalStorage("team-dms-open", true)
  const pathname = usePathname()

  return (
    <div className="w-64 h-full shrink-0 border-r bg-muted/30 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {/* Channels Section */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen} suppressHydrationWarning>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {channelsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Channels
                </button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={onCreateChannel}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            
            <CollapsibleContent>
              <div className="space-y-0.5">
                {channels.map((channel) => {
                  const Icon = channel.isPrivate ? Lock : Hash
                  const isActive = activeChannelId === channel.id
                  
                  return (
                    <Link
                      key={channel.id}
                      href={`/team/channels/${channel.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground",
                        channel.isMuted && "opacity-50"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate flex-1">{channel.name}</span>
                      {(channel.unreadCount ?? 0) > 0 && (
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {channel.unreadCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
                
                {channels.length === 0 && (
                  <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No channels yet
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Direct Messages Section */}
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen} className="mt-4" suppressHydrationWarning>
            <div className="flex items-center justify-between px-2 py-1.5">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {dmsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Direct Messages
                </button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={onStartDM}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            
            <CollapsibleContent>
              <div className="space-y-0.5">
                {directMessages.map((dm) => {
                  const isActive = activeDmId === dm.id
                  const initials = dm.participant.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <Link
                      key={dm.id}
                      href={`/team/dm/${dm.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="size-6">
                          <AvatarImage src={dm.participant.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <MemberPresence status={dm.status} />
                        </div>
                      </div>
                      <span className="truncate flex-1">{dm.participant.name}</span>
                      {(dm.unreadCount ?? 0) > 0 && (
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {dm.unreadCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
                
                {directMessages.length === 0 && (
                  <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No conversations yet
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Files Link */}
          <div className="mt-4">
            <Link
              href="/team/files"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                pathname === "/team/files"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <FileIcon className="size-4" />
              <span>Files</span>
            </Link>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="border-t">
        <div className="p-2">
          <Link
            href="/account?tab=team"
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <UserPlus className="size-4" />
            <span>Invite Team Members</span>
          </Link>
          <Link
            href="/account?tab=team"
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="size-4" />
            <span>Team Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
