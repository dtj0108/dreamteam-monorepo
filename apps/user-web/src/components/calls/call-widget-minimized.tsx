"use client"

import { PhoneIcon } from "lucide-react"
import { useCall } from "@/providers/call-provider"
import { CallTimer } from "./call-timer"

export function CallWidgetMinimized() {
  const { activeCall, toggleWidgetExpanded } = useCall()

  if (!activeCall) return null

  const displayName = activeCall.contactName || formatPhoneNumber(activeCall.phoneNumber)

  return (
    <button
      onClick={toggleWidgetExpanded}
      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg cursor-pointer transition-colors"
    >
      <div className="relative">
        <PhoneIcon className="size-4" />
        <span className="absolute -top-1 -right-1 size-2 bg-white rounded-full animate-pulse" />
      </div>
      <span className="text-sm font-medium max-w-[120px] truncate">
        {displayName}
      </span>
      <span className="text-sm opacity-90">
        <CallTimer startTime={activeCall.startTime} />
      </span>
    </button>
  )
}

function formatPhoneNumber(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}
