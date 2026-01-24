"use client"

import { useVideoTile } from "@/hooks/use-video-tile"
import { useMeeting } from "@/providers/meeting-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Mic, MicOff, Pin, PinOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Participant } from "@/providers/meeting-provider"

interface VideoTileProps {
  participant: Participant
  className?: string
  showName?: boolean
  isSpeaking?: boolean
  isPinned?: boolean
  isLarge?: boolean
}

export function VideoTile({
  participant,
  className,
  showName = true,
  isSpeaking = false,
  isPinned = false,
  isLarge = false,
}: VideoTileProps) {
  const videoRef = useVideoTile(participant.videoTileId ?? null)
  const { pinParticipant, layoutMode } = useMeeting()

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    pinParticipant(isPinned ? null : participant.attendeeId)
  }

  // Only show pin button in speaker mode or when there are multiple participants
  const showPinButton = layoutMode === "speaker" || layoutMode === "gallery"

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        // Background for video off state
        "bg-gradient-to-br from-zinc-800 to-zinc-900",
        // Speaking indicator with animated glow
        isSpeaking && "ring-2 ring-primary ring-offset-2 ring-offset-black",
        // Pinned indicator
        isPinned && "ring-2 ring-amber-500 ring-offset-2 ring-offset-black",
        // Hover shadow effect
        "hover:shadow-lg hover:shadow-black/30",
        isLarge ? "aspect-video" : "aspect-video",
        className
      )}
    >
      {/* Video element - render if we have a tile ID (needed for binding to activate the tile) */}
      {participant.videoTileId ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            participant.isLocal && "scale-x-[-1]", // Mirror local video
            !participant.isVideoOn && "opacity-0 absolute" // Hide but keep for binding
          )}
        />
      ) : null}

      {/* Avatar fallback when video is off or no tile */}
      {(!participant.videoTileId || !participant.isVideoOn) && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700/50 to-zinc-900/50">
          <Avatar
            className={cn(
              "shadow-xl transition-transform duration-300",
              isLarge ? "h-28 w-28" : "h-16 w-16",
              isSpeaking && "scale-105"
            )}
          >
            <AvatarImage src={participant.avatarUrl} />
            <AvatarFallback
              className={cn(
                "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold",
                isLarge ? "text-4xl" : "text-xl"
              )}
            >
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Pin button (appears on hover) */}
      {showPinButton && (
        <div
          className={cn(
            "absolute top-2 right-2 transition-opacity duration-200",
            isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isPinned ? "default" : "secondary"}
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full shadow-lg",
                    isPinned && "bg-amber-500 hover:bg-amber-600"
                  )}
                  onClick={handlePinClick}
                >
                  {isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isPinned ? "Unpin participant" : "Pin participant"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Pinned badge */}
      {isPinned && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-amber-950 text-xs font-medium shadow-lg">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
        </div>
      )}

      {/* Overlay with name and mute indicator */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          {showName && (
            <span className="text-white text-sm font-medium truncate backdrop-blur-sm">
              {participant.name || "Unknown"}
              {participant.isLocal && (
                <span className="ml-1 text-white/60">(You)</span>
              )}
            </span>
          )}

          <div className="flex items-center gap-2">
            {/* Speaking indicator dot */}
            {isSpeaking && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            )}

            {/* Mute indicator */}
            <div
              className={cn(
                "flex items-center justify-center rounded-full p-1",
                participant.isMuted
                  ? "bg-red-500/90 text-white"
                  : "bg-white/20 text-white"
              )}
            >
              {participant.isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
