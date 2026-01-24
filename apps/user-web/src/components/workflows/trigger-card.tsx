"use client"

import {
  UserPlusIcon,
  RefreshCwIcon,
  PhoneIcon,
  DollarSignIcon,
  ArrowRightIcon,
  TrophyIcon,
  XCircleIcon,
  ActivityIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@dreamteam/ui/badge"
import type { TriggerType } from "@/types/workflow"
import { getTriggerDefinition } from "@/types/workflow"

const triggerIcons: Record<TriggerType, React.ReactNode> = {
  lead_created: <UserPlusIcon className="size-5" />,
  lead_status_changed: <RefreshCwIcon className="size-5" />,
  lead_stage_changed: <ArrowRightIcon className="size-5" />,
  lead_contacted: <PhoneIcon className="size-5" />,
  deal_created: <DollarSignIcon className="size-5" />,
  deal_stage_changed: <ArrowRightIcon className="size-5" />,
  deal_won: <TrophyIcon className="size-5" />,
  deal_lost: <XCircleIcon className="size-5" />,
  activity_logged: <ActivityIcon className="size-5" />,
  activity_completed: <CheckCircleIcon className="size-5" />,
  task_completed: <CheckSquareIcon className="size-5" />,
}

// Get category badge text
function getTriggerBadge(type: TriggerType): string {
  if (type.startsWith("lead_")) return "LEAD"
  if (type.startsWith("deal_")) return "DEAL"
  if (type.startsWith("activity_") || type.startsWith("task_")) return "ACTIVITY"
  return "EVENT"
}

interface TriggerCardProps {
  triggerType: TriggerType
  triggerConfig?: Record<string, unknown>
}

export function TriggerCard({ triggerType }: TriggerCardProps) {
  const trigger = getTriggerDefinition(triggerType)
  const icon = triggerIcons[triggerType] || <ZapIcon className="size-5" />
  const badgeText = getTriggerBadge(triggerType)

  return (
    <div className="bg-background border border-border rounded-xl shadow-sm p-4 max-w-md mx-auto">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">Trigger</span>
            <Badge variant="secondary" className="text-xs font-normal bg-muted">
              {badgeText}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {trigger?.description || "When this event occurs"}
          </p>
        </div>
      </div>
    </div>
  )
}
