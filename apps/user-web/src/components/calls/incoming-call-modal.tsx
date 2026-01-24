"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@dreamteam/ui/dialog"
import { Button } from "@dreamteam/ui/button"
import {
  PhoneIcon,
  PhoneOffIcon,
  PhoneIncomingIcon,
  Loader2Icon,
} from "lucide-react"
import { useCall } from "@/providers/call-provider"

export function IncomingCallModal() {
  const { incomingCall, answerIncomingCall, declineIncomingCall } = useCall()
  const [isAnswering, setIsAnswering] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  if (!incomingCall) return null

  const displayName =
    incomingCall.contactName || formatPhoneNumber(incomingCall.from)

  const handleAnswer = async () => {
    setIsAnswering(true)
    try {
      await answerIncomingCall()
    } finally {
      setIsAnswering(false)
    }
  }

  const handleDecline = async () => {
    setIsDeclining(true)
    try {
      await declineIncomingCall()
    } finally {
      setIsDeclining(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[400px] [&>button]:hidden">
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <PhoneIncomingIcon className="size-12 text-green-600 animate-pulse" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-1">Incoming Call</p>
          <h2 className="text-2xl font-semibold mb-2">{displayName}</h2>
          <p className="text-muted-foreground mb-8">
            {formatPhoneNumber(incomingCall.from)}
          </p>

          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-16 h-16"
                onClick={handleDecline}
                disabled={isDeclining || isAnswering}
              >
                {isDeclining ? (
                  <Loader2Icon className="size-6 animate-spin" />
                ) : (
                  <PhoneOffIcon className="size-6" />
                )}
              </Button>
              <span className="text-sm text-muted-foreground">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
                onClick={handleAnswer}
                disabled={isAnswering || isDeclining}
              >
                {isAnswering ? (
                  <Loader2Icon className="size-6 animate-spin" />
                ) : (
                  <PhoneIcon className="size-6" />
                )}
              </Button>
              <span className="text-sm text-muted-foreground">Answer</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatPhoneNumber(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}
