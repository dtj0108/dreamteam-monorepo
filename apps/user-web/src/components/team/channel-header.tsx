"use client"

import { Button } from "@/components/ui/button"
import { Hash, Lock, Users, Star, Search, Video, Loader2, Trash2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ActiveMeetingInfo {
  id: string
  participantCount: number
}

interface ChannelHeaderProps {
  name: string
  description?: string
  memberCount?: number
  isPrivate?: boolean
  isStarred?: boolean
  activeMeeting?: ActiveMeetingInfo | null
  isStartingCall?: boolean
  canDelete?: boolean
  onToggleStar?: () => void
  onOpenMembers?: () => void
  onSearch?: () => void
  onStartCall?: () => void
  onJoinCall?: () => void
  onDelete?: () => void
}

export function ChannelHeader({
  name,
  description,
  memberCount = 0,
  isPrivate = false,
  isStarred = false,
  activeMeeting,
  isStartingCall = false,
  canDelete = false,
  onToggleStar,
  onOpenMembers,
  onSearch,
  onStartCall,
  onJoinCall,
  onDelete,
}: ChannelHeaderProps) {
  const Icon = isPrivate ? Lock : Hash

  return (
    <div className="h-14 shrink-0 border-b px-4 flex items-center justify-between bg-background">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="size-5 text-muted-foreground shrink-0" />
          <h1 className="font-semibold truncate">{name}</h1>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={onToggleStar}
              >
                <Star
                  className={`size-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isStarred ? "Remove from starred" : "Add to starred"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {description && (
          <>
            <span className="text-muted-foreground">|</span>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {/* Video call button */}
        {activeMeeting ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={onJoinCall}
                >
                  <Video className="size-4" />
                  <span>Join ({activeMeeting.participantCount})</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Join active call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={onStartCall}
                  disabled={isStartingCall}
                >
                  {isStartingCall ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Video className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start a call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={onOpenMembers}
              >
                <Users className="size-4" />
                <span>{memberCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View members</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={onSearch}>
                <Search className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search in channel</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {canDelete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete channel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

