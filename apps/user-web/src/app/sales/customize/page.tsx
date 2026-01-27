"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomFieldsTab } from "@/components/sales/customize/custom-fields-tab"
import { LeadStatusesTab } from "@/components/sales/customize/lead-statuses-tab"
import { LeadTagsTab } from "@/components/sales/customize/lead-tags-tab"
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
        <TabsList className="mb-6 inline-flex h-auto gap-1 rounded-lg bg-muted/50 p-1">
          <TabsTrigger
            value="custom-fields"
            className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            Custom Fields
          </TabsTrigger>
          <TabsTrigger
            value="lead-statuses"
            className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            Lead Statuses
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            Tags
          </TabsTrigger>
          <TabsTrigger
            value="pipelines"
            className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            Pipelines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custom-fields">
          <CustomFieldsTab />
        </TabsContent>

        <TabsContent value="lead-statuses">
          <LeadStatusesTab />
        </TabsContent>

        <TabsContent value="tags">
          <LeadTagsTab />
        </TabsContent>

        <TabsContent value="pipelines">
          <PipelinesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
