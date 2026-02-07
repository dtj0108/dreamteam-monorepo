"use client"

import {
  MessageSquareIcon,
  MailIcon,
  BellIcon,
  ListTodoIcon,
  EditIcon,
  FileTextIcon,
  UserCheckIcon,
  PlayIcon,
  AlertTriangleIcon,
  ClockIcon,
  GitBranchIcon,
  PencilIcon,
  TagIcon,
  TagsIcon,
  BriefcaseIcon,
  PenSquareIcon,
  ArrowRightCircleIcon,
  CheckCircle2Icon,
  MoveRightIcon,
  ActivityIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@dreamteam/ui/tooltip"
import type { ActionType, WorkflowAction, ConditionActionConfig } from "@/types/workflow"
import { getActionDefinition, getOperatorDefinition } from "@/types/workflow"

const actionIcons: Record<ActionType, React.ReactNode> = {
  send_sms: <MessageSquareIcon className="size-5" />,
  send_email: <MailIcon className="size-5" />,
  send_notification: <BellIcon className="size-5" />,
  create_task: <ListTodoIcon className="size-5" />,
  update_status: <EditIcon className="size-5" />,
  add_note: <FileTextIcon className="size-5" />,
  assign_user: <UserCheckIcon className="size-5" />,
  add_tag: <TagIcon className="size-5" />,
  remove_tag: <TagsIcon className="size-5" />,
  move_lead_stage: <MoveRightIcon className="size-5" />,
  log_activity: <ActivityIcon className="size-5" />,
  create_deal: <BriefcaseIcon className="size-5" />,
  update_deal: <PenSquareIcon className="size-5" />,
  move_deal_stage: <ArrowRightCircleIcon className="size-5" />,
  close_deal: <CheckCircle2Icon className="size-5" />,
  wait: <ClockIcon className="size-5" />,
  condition: <GitBranchIcon className="size-5" />,
}

interface ActionCardProps {
  action: WorkflowAction
  selected?: boolean
  onClick?: () => void
}

function getActionSummary(action: WorkflowAction): string | null {
  const config = action.config

  switch (action.type) {
    case "send_email":
      return config.subject ? `${config.subject}` : null
    case "send_sms":
      return config.message ? `${String(config.message).slice(0, 40)}...` : null
    case "create_task":
      return config.title ? `${config.title}` : null
    case "update_status":
      return config.status ? `To: ${config.status}` : null
    case "add_note":
      return config.note ? `${String(config.note).slice(0, 40)}...` : null
    case "send_notification":
      return config.title ? `${config.title}` : null
    case "assign_user":
      return config.user_name ? `To: ${config.user_name}` : null
    case "add_tag": {
      const addTags = config.tags as Array<{ id: string; name: string; color: string }> | undefined
      if (addTags?.length) {
        return `Add: ${addTags.map(t => t.name).join(", ")}`
      }
      return "Add tags (not configured)"
    }
    case "remove_tag": {
      if (config.remove_all) return "Remove all tags"
      const removeTags = config.tags as Array<{ id: string; name: string; color: string }> | undefined
      if (removeTags?.length) {
        return `Remove: ${removeTags.map(t => t.name).join(", ")}`
      }
      return "Remove tags (not configured)"
    }
    case "wait":
      if (config.wait_duration && config.wait_unit) {
        return `Wait ${config.wait_duration} ${config.wait_unit}`
      }
      return null
    case "condition": {
      const condConfig = config as unknown as ConditionActionConfig
      if (condConfig.condition?.field_path && condConfig.condition?.operator) {
        const operatorDef = getOperatorDefinition(condConfig.condition.operator)
        const fieldName = condConfig.condition.field_path.split(".").pop() || condConfig.condition.field_path
        const operatorLabel = operatorDef?.label.toLowerCase() || condConfig.condition.operator
        if (operatorDef?.requiresValue && condConfig.condition.value) {
          return `If ${fieldName} ${operatorLabel} "${condConfig.condition.value}"`
        }
        return `If ${fieldName} ${operatorLabel}`
      }
      return "Conditional branch"
    }
    case "create_deal": {
      const name = config.name as string | undefined
      const value = config.value as number | undefined
      if (name && value) {
        return `${name} ($${value.toLocaleString()})`
      }
      if (name) {
        return name
      }
      return "Create new opportunity"
    }
    case "update_deal": {
      const fields: string[] = []
      if (config.value !== undefined) fields.push("value")
      if (config.probability !== undefined) fields.push("probability")
      if (config.expected_close_date_offset !== undefined) fields.push("close date")
      if (config.notes) fields.push("notes")
      if (fields.length > 0) {
        return `Update ${fields.join(", ")}`
      }
      const source = config.deal_source as string | undefined
      return source === "trigger" ? "Update trigger opportunity" : "Update most recent opportunity"
    }
    case "move_lead_stage": {
      if (config.stage_id && config.stage_name) {
        return `Move to ${config.stage_name}`
      }
      if (config.stage_id) {
        return "Move to stage"
      }
      return "Move lead stage (not configured)"
    }
    case "move_deal_stage": {
      if (config.stage_id) {
        return "Move to stage"
      }
      return "Move to stage (not configured)"
    }
    case "close_deal": {
      const outcome = config.outcome as "won" | "lost" | undefined
      if (outcome === "won") return "Mark as Won"
      if (outcome === "lost") return "Mark as Lost"
      return "Close opportunity"
    }
    case "log_activity": {
      const actType = config.activity_type as string | undefined
      const actSubject = config.activity_subject as string | undefined
      if (actType && actSubject) {
        return `Log ${actType}: ${actSubject.slice(0, 30)}${actSubject.length > 30 ? "..." : ""}`
      }
      if (actType) {
        return `Log ${actType}`
      }
      return "Log activity (not configured)"
    }
    default:
      return null
  }
}

export function ActionCard({ action, selected, onClick }: ActionCardProps) {
  const definition = getActionDefinition(action.type)
  const icon = actionIcons[action.type] || <PlayIcon className="size-5" />
  const summary = getActionSummary(action)
  const isConfigured = Object.keys(action.config).length > 0
  const label = definition?.label || action.type

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${label} action. ${isConfigured ? summary || "Configured" : "Not configured"}. Click to edit.`}
          aria-selected={selected}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          className={`
            bg-background border rounded-xl shadow-sm p-4 max-w-md mx-auto cursor-pointer
            transition-all duration-150 outline-none
            focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
            ${selected
              ? "border-sky-400 border-2 bg-sky-50/30"
              : "border-border hover:border-sky-300 hover:bg-sky-50/20"
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {!isConfigured && (
                  <span className="text-muted-foreground">•</span>
                )}
                <span className="text-sm text-muted-foreground truncate">
                  {summary || (isConfigured ? "" : "Select template")}
                </span>
              </div>
            </div>

            {/* Status indicator */}
            {!isConfigured ? (
              <div className="size-6 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangleIcon className="size-5" />
              </div>
            ) : selected ? (
              <div className="size-6 flex items-center justify-center text-sky-500 shrink-0">
                <PencilIcon className="size-4" />
              </div>
            ) : null}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        Click to edit
      </TooltipContent>
    </Tooltip>
  )
}
