"use client"

import { DemoProvider } from "@/providers"
import { DemoBanner } from "./demo-banner"

export function DemoWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <DemoBanner />
      {children}
    </DemoProvider>
  )
}
