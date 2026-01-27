"use client"

import { Label } from "@dreamteam/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@dreamteam/ui/tooltip"
import { InfoIcon } from "lucide-react"
import type { TriggerType } from "@/types/workflow"

export type DealSource = "trigger" | "most_recent"

interface DealSourceSelectorProps {
  value: DealSource
  onChange: (value: DealSource) => void
  triggerType: TriggerType
}

// Deal triggers where "trigger" option makes sense
const DEAL_TRIGGERS: TriggerType[] = [
  "deal_created",
  "deal_stage_changed",
  "deal_won",
  "deal_lost",
]

export function DealSourceSelector({
  value,
  onChange,
  triggerType,
}: DealSourceSelectorProps) {
  const isDealTrigger = DEAL_TRIGGERS.includes(triggerType)
  const triggerDisabled = !isDealTrigger

  // Auto-switch to most_recent if trigger is disabled
  if (triggerDisabled && value === "trigger") {
    onChange("most_recent")
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Which opportunity to update</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="size-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">
              {isDealTrigger
                ? "Choose the opportunity that triggered this workflow, or the contact's most recent opportunity."
                : "Since this workflow isn't triggered by an opportunity event, only 'Most recent opportunity' is available."}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-2">
        {/* Trigger opportunity option */}
        <label
          className={`
            flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors
            ${triggerDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"}
            ${value === "trigger" && !triggerDisabled ? "border-sky-400 bg-sky-50/30" : "border-border"}
          `}
        >
          <input
            type="radio"
            name="deal_source"
            value="trigger"
            checked={value === "trigger"}
            onChange={() => onChange("trigger")}
            disabled={triggerDisabled}
            className="mt-0.5"
          />
          <div className="flex-1">
            <p className="font-medium text-sm">Opportunity from trigger</p>
            <p className="text-xs text-muted-foreground">
              {isDealTrigger
                ? "The opportunity that triggered this workflow"
                : "Not available - workflow isn't triggered by an opportunity event"}
            </p>
          </div>
        </label>

        {/* Most recent opportunity option */}
        <label
          className={`
            flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50
            ${value === "most_recent" ? "border-sky-400 bg-sky-50/30" : "border-border"}
          `}
        >
          <input
            type="radio"
            name="deal_source"
            value="most_recent"
            checked={value === "most_recent"}
            onChange={() => onChange("most_recent")}
            className="mt-0.5"
          />
          <div className="flex-1">
            <p className="font-medium text-sm">Most recent opportunity</p>
            <p className="text-xs text-muted-foreground">
              The most recently updated opportunity for this contact
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}
