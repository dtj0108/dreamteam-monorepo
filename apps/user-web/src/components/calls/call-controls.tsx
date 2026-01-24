"use client"

import { Button } from "@dreamteam/ui/button"
import {
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PlayIcon,
  PhoneOffIcon,
  GridIcon,
  Loader2Icon,
} from "lucide-react"
import { useCall } from "@/providers/call-provider"
import { useState } from "react"

interface CallControlsProps {
  onToggleKeypad?: () => void
  showKeypad?: boolean
}

export function CallControls({ onToggleKeypad, showKeypad }: CallControlsProps) {
  const { activeCall, toggleMute, toggleHold, endCall } = useCall()
  const [isEndingCall, setIsEndingCall] = useState(false)
  const [isMuting, setIsMuting] = useState(false)
  const [isHolding, setIsHolding] = useState(false)

  if (!activeCall) return null

  const handleMute = async () => {
    setIsMuting(true)
    try {
      await toggleMute()
    } finally {
      setIsMuting(false)
    }
  }

  const handleHold = async () => {
    setIsHolding(true)
    try {
      await toggleHold()
    } finally {
      setIsHolding(false)
    }
  }

  const handleEndCall = async () => {
    setIsEndingCall(true)
    try {
      await endCall()
    } finally {
      setIsEndingCall(false)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      <Button
        variant={activeCall.isMuted ? "secondary" : "outline"}
        size="icon"
        onClick={handleMute}
        disabled={isMuting}
        title={activeCall.isMuted ? "Unmute" : "Mute"}
        className="h-12 w-full"
      >
        {isMuting ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : activeCall.isMuted ? (
          <MicOffIcon className="size-5 text-red-500" />
        ) : (
          <MicIcon className="size-5" />
        )}
      </Button>

      <Button
        variant={activeCall.isOnHold ? "secondary" : "outline"}
        size="icon"
        onClick={handleHold}
        disabled={isHolding}
        title={activeCall.isOnHold ? "Resume" : "Hold"}
        className="h-12 w-full"
      >
        {isHolding ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : activeCall.isOnHold ? (
          <PlayIcon className="size-5 text-amber-500" />
        ) : (
          <PauseIcon className="size-5" />
        )}
      </Button>

      <Button
        variant={showKeypad ? "secondary" : "outline"}
        size="icon"
        onClick={onToggleKeypad}
        title="Keypad"
        className="h-12 w-full"
      >
        <GridIcon className="size-5" />
      </Button>

      <Button
        variant="destructive"
        size="icon"
        onClick={handleEndCall}
        disabled={isEndingCall}
        title="End Call"
        className="h-12 w-full"
      >
        {isEndingCall ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : (
          <PhoneOffIcon className="size-5" />
        )}
      </Button>
    </div>
  )
}
