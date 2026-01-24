"use client"

import { CallWidget } from "./call-widget"
import { IncomingCallModal } from "./incoming-call-modal"

export function CallOverlay() {
  return (
    <>
      <CallWidget />
      <IncomingCallModal />
    </>
  )
}
