"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  PhoneIcon,
} from "lucide-react"
import {
  A2PCampaignWithBrand,
  STATUS_LABELS,
  STATUS_COLORS,
  CAMPAIGN_USE_CASE_LABELS,
} from "@/types/a2p"
import { format } from "date-fns"

interface CampaignListProps {
  campaigns: A2PCampaignWithBrand[]
  onEdit: (campaign: A2PCampaignWithBrand) => void
  onDelete: (campaignId: string) => void
  onManageNumbers: (campaignId: string) => void
  isLoading?: boolean
  phoneNumberCounts?: Record<string, number>
}

export function CampaignList({
  campaigns,
  onEdit,
  onDelete,
  onManageNumbers,
  isLoading,
  phoneNumberCounts = {},
}: CampaignListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground mb-2">No campaigns created yet</p>
        <p className="text-sm text-muted-foreground">
          Create a campaign to configure your messaging use case
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => {
        const canEdit = ["draft", "rejected"].includes(campaign.status)
        const canDelete = ["draft", "rejected"].includes(campaign.status)
        const phoneCount = phoneNumberCounts[campaign.id] || 0

        return (
          <Card key={campaign.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{campaign.campaign_name}</h3>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[campaign.status]}
                    >
                      {STATUS_LABELS[campaign.status]}
                    </Badge>
                    {phoneCount > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <PhoneIcon className="size-3" />
                        {phoneCount} {phoneCount === 1 ? "number" : "numbers"}
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Brand:</span> {campaign.brand.brand_name}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Use Case:</span>{" "}
                      {CAMPAIGN_USE_CASE_LABELS[campaign.use_case]}
                    </div>
                    <div>
                      <span className="font-medium">Expected Volume:</span>{" "}
                      {campaign.expected_monthly_volume.toLocaleString()}/month
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(campaign.created_at), "MMM d, yyyy")}
                    {campaign.approved_at && (
                      <> • Approved {format(new Date(campaign.approved_at), "MMM d, yyyy")}</>
                    )}
                  </div>

                  {campaign.rejected_reason && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Rejection Reason:</span>{" "}
                        {campaign.rejected_reason}
                      </p>
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onManageNumbers(campaign.id)}>
                      <PhoneIcon className="mr-2 size-4" />
                      Manage Numbers
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(campaign)}>
                        <PencilIcon className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(campaign.id)}
                        className="text-red-600"
                      >
                        <Trash2Icon className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                    {!canEdit && !canDelete && campaign.status !== "approved" && (
                      <DropdownMenuItem disabled>
                        No edit actions available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
