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
  PhoneIcon,
  ClockIcon,
  GitBranchIcon,
  PencilIcon,
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
  make_call: <PhoneIcon className="size-5" />,
  send_email: <MailIcon className="size-5" />,
  send_notification: <BellIcon className="size-5" />,
  create_task: <ListTodoIcon className="size-5" />,
  update_status: <EditIcon className="size-5" />,
  add_note: <FileTextIcon className="size-5" />,
  assign_user: <UserCheckIcon className="size-5" />,
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
    case "make_call":
      return config.record ? "With recording" : "No recording"
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
