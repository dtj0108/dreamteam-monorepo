"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dreamteam/ui/tabs"
import { CustomFieldsTab } from "@/components/sales/customize/custom-fields-tab"
import { LeadStatusesTab } from "@/components/sales/customize/lead-statuses-tab"
import { PipelinesTab } from "@/components/sales/customize/pipelines-tab"

export default function CustomizePage() {
  const [activeTab, setActiveTab] = useState("custom-fields")

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Customize</h1>
        <p className="text-muted-foreground mt-1">
          Configure your sales pipeline and lead management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="lead-statuses">Lead Statuses</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
        </TabsList>

        <TabsContent value="custom-fields">
          <CustomFieldsTab />
        </TabsContent>

        <TabsContent value="lead-statuses">
          <LeadStatusesTab />
        </TabsContent>

        <TabsContent value="pipelines">
          <PipelinesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
