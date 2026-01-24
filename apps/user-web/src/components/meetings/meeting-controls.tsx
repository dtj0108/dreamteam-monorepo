"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Phone,
  ChevronUp,
  Users,
  LayoutGrid,
  Presentation,
} from "lucide-react"
import { useMeeting } from "@/providers/meeting-provider"
import { useMeetingControls } from "@/hooks/use-meeting-controls"
import { useMeetingDevices } from "@/hooks/use-meeting-devices"
import { useMeetingRoster } from "@/hooks/use-meeting-roster"
import { cn } from "@/lib/utils"

interface MeetingControlsProps {
  onLeave?: () => void
  onShowParticipants?: () => void
  className?: string
}

export function MeetingControls({
  onLeave,
  onShowParticipants,
  className,
}: MeetingControlsProps) {
  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveMeeting,
  } = useMeetingControls()

  const { layoutMode, setLayoutMode } = useMeeting()

  const {
    audioInputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedVideoInput,
    selectAudioInput,
    selectVideoInput,
  } = useMeetingDevices()

  const { participantCount } = useMeetingRoster()

  const handleLeave = async () => {
    await leaveMeeting()
    onLeave?.()
  }

  const toggleLayout = () => {
    setLayoutMode(layoutMode === "gallery" ? "speaker" : "gallery")
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center py-6 -mt-16 relative z-10",
        className
      )}
    >
      {/* Floating pill container */}
      <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-zinc-900/95 backdrop-blur-xl shadow-2xl border border-white/10">
        {/* Media controls group */}
        <div className="flex items-center gap-1">
          {/* Microphone with device selector */}
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-11 w-11 rounded-full transition-all duration-200 hover:scale-105",
                      isAudioEnabled
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-red-500 text-white hover:bg-red-600"
                    )}
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? (
                      <Mic className="h-5 w-5" />
                    ) : (
                      <MicOff className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAudioEnabled ? "Mute (M)" : "Unmute (M)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-white/60 hover:text-white hover:bg-white/10 -ml-2"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>Select Microphone</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {audioInputDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={() => selectAudioInput(device.deviceId)}
                    className={cn(
                      selectedAudioInput === device.deviceId && "bg-accent"
                    )}
                  >
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Camera with device selector */}
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-11 w-11 rounded-full transition-all duration-200 hover:scale-105",
                      isVideoEnabled
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-red-500 text-white hover:bg-red-600"
                    )}
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <VideoOff className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isVideoEnabled ? "Stop video (V)" : "Start video (V)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-white/60 hover:text-white hover:bg-white/10 -ml-2"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>Select Camera</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {videoInputDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={() => selectVideoInput(device.deviceId)}
                    className={cn(
                      selectedVideoInput === device.deviceId && "bg-accent"
                    )}
                  >
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Screen share */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-11 w-11 rounded-full transition-all duration-200 hover:scale-105",
                    isScreenSharing
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                  onClick={toggleScreenShare}
                >
                  {isScreenSharing ? (
                    <MonitorOff className="h-5 w-5" />
                  ) : (
                    <Monitor className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isScreenSharing ? "Stop sharing" : "Share screen"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20 mx-2" />

        {/* View controls group */}
        <div className="flex items-center gap-1">
          {/* Layout toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-11 w-11 rounded-full transition-all duration-200 hover:scale-105",
                    "bg-white/10 text-white hover:bg-white/20"
                  )}
                  onClick={toggleLayout}
                >
                  {layoutMode === "gallery" ? (
                    <Presentation className="h-5 w-5" />
                  ) : (
                    <LayoutGrid className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {layoutMode === "gallery" ? "Speaker view" : "Gallery view"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Participants button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-11 px-4 rounded-full transition-all duration-200 hover:scale-105",
                    "bg-white/10 text-white hover:bg-white/20 gap-2"
                  )}
                  onClick={onShowParticipants}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-sm font-medium">{participantCount}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Participants</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20 mx-2" />

        {/* Leave button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200 hover:scale-105"
                onClick={handleLeave}
              >
                <Phone className="h-5 w-5 rotate-[135deg]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave meeting</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
