"use client"

import { ConnectedEmailAccounts } from "@/components/nylas"

export default function EmailSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email & Calendar</h1>
        <p className="text-muted-foreground">
          Manage your connected email and calendar accounts.
        </p>
      </div>
      <ConnectedEmailAccounts />
    </div>
  )
}
