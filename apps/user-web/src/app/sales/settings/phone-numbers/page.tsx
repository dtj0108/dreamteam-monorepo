"use client"

import { PhoneNumberManager } from "@/components/settings/phone-number-manager"

export default function SalesPhoneNumbersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Phone Numbers</h1>
        <p className="text-muted-foreground">
          Manage your phone numbers for SMS and voice calls.
        </p>
      </div>

      <PhoneNumberManager />
    </div>
  )
}
