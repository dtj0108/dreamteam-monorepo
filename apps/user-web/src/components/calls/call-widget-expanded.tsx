"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@dreamteam/ui/card"
import { Badge } from "@dreamteam/ui/badge"
import { Button } from "@dreamteam/ui/button"
import {
  MinimizeIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  UserIcon,
} from "lucide-react"
import { useCall, CallStatus } from "@/providers/call-provider"
import { CallTimer } from "./call-timer"
import { CallControls } from "./call-controls"
import { DTMFKeypad } from "./dtmf-keypad"

const STATUS_LABELS: Record<CallStatus, string> = {
  pending: "Connecting...",
  initiated: "Connecting...",
  ringing: "Ringing...",
  "in-progress": "In Call",
  "on-hold": "On Hold",
  completed: "Call Ended",
  busy: "Busy",
  "no-answer": "No Answer",
  canceled: "Canceled",
  failed: "Failed",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  initiated: "secondary",
  ringing: "secondary",
  "in-progress": "default",
  "on-hold": "outline",
  completed: "secondary",
  busy: "destructive",
  "no-answer": "destructive",
  canceled: "destructive",
  failed: "destructive",
}

export function CallWidgetExpanded() {
  const { activeCall, toggleWidgetExpanded } = useCall()
  const [showKeypad, setShowKeypad] = useState(false)

  if (!activeCall) return null

  const displayName =
    activeCall.contactName || formatPhoneNumber(activeCall.phoneNumber)
  const statusLabel = STATUS_LABELS[activeCall.status] || activeCall.status
  const statusVariant = STATUS_VARIANTS[activeCall.status] || "secondary"

  return (
    <Card className="w-72 shadow-xl border-border/50">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-sm leading-tight">{displayName}</h3>
              <p className="text-xs text-muted-foreground">
                {formatPhoneNumber(activeCall.phoneNumber)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleWidgetExpanded}
            className="size-8 -mr-2 -mt-1"
          >
            <MinimizeIcon className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="text-center py-4 border-t border-b mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {activeCall.direction === "inbound" ? (
              <PhoneIncomingIcon className="size-4 text-blue-500" />
            ) : (
              <PhoneOutgoingIcon className="size-4 text-green-500" />
            )}
            <Badge variant={statusVariant} className="text-xs">
              {statusLabel}
            </Badge>
          </div>
          <CallTimer
            startTime={activeCall.startTime}
            className="text-3xl font-light"
          />
        </div>

        <CallControls
          onToggleKeypad={() => setShowKeypad(!showKeypad)}
          showKeypad={showKeypad}
        />

        {showKeypad && <DTMFKeypad />}
      </CardContent>
    </Card>
  )
}

function formatPhoneNumber(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}
