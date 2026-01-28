"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrandManager } from "@/components/a2p/brand-manager"
import { CampaignManager } from "@/components/a2p/campaign-manager"

export default function MessagingSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Messaging Compliance
        </h1>
        <p className="text-muted-foreground mt-1">
          Register your business and campaigns for A2P 10DLC messaging compliance.
          Required for SMS messaging in the United States.
        </p>
      </div>

      <Tabs defaultValue="brands" className="space-y-6">
        <TabsList>
          <TabsTrigger value="brands">Brand Registration</TabsTrigger>
          <TabsTrigger value="campaigns">Messaging Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="space-y-4">
          <BrandManager />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
