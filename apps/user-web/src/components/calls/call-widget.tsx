"use client"

import { useCall } from "@/providers/call-provider"
import { CallWidgetMinimized } from "./call-widget-minimized"
import { CallWidgetExpanded } from "./call-widget-expanded"

export function CallWidget() {
  const { activeCall, isWidgetExpanded } = useCall()

  if (!activeCall) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isWidgetExpanded ? <CallWidgetExpanded /> : <CallWidgetMinimized />}
    </div>
  )
}
