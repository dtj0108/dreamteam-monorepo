"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  Calendar,
  DollarSign,
  MoreHorizontal,
  Percent,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Building2,
  User,
  Repeat,
} from "lucide-react"
import type { Opportunity, OpportunityStatus } from "@/types/opportunity"
import {
  formatOpportunityValue,
  getOpportunityStatusColor,
  getProbabilityColor,
} from "@/types/opportunity"

interface OpportunityCardProps {
  opportunity: Opportunity & { expected_value?: number | null }
  onClick?: () => void
  onDelete?: () => void
  onStatusChange?: (status: OpportunityStatus) => void
  isDragging?: boolean
  className?: string
}

export function OpportunityCard({
  opportunity,
  onClick,
  onDelete,
  onStatusChange,
  isDragging,
  className,
}: OpportunityCardProps) {
  const contactName = opportunity.contact
    ? `${opportunity.contact.first_name || ""} ${opportunity.contact.last_name || ""}`.trim()
    : null

  const leadName = opportunity.lead?.name

  const isOverdue =
    opportunity.expected_close_date &&
    new Date(opportunity.expected_close_date) < new Date() &&
    opportunity.status === "active"

  const expectedValue = opportunity.expected_value ??
    (opportunity.value !== null ? opportunity.value * (opportunity.probability / 100) : null)

  return (
    <div
      className={cn(
        "relative group rounded-xl p-4",
        "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md",
        "border border-white/60 dark:border-white/10",
        "shadow-lg shadow-black/[0.03] dark:shadow-black/20",
        "hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/30",
        "hover:bg-white/95 dark:hover:bg-white/[0.12]",
        "transition-all duration-200 ease-out",
        onClick && "cursor-pointer",
        isDragging && "opacity-50 scale-[0.98] rotate-1",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        className
      )}
      onClick={onClick}
    >
      {/* Quick Actions */}
      <div
        className={cn(
          "absolute -top-2 -right-2 flex gap-1",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "translate-y-1 group-hover:translate-y-0"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-lg shadow-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {opportunity.status === "active" && onStatusChange && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange("won")}>
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  Mark as Won
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange("lost")}>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Mark as Lost
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {(opportunity.status === "won" || opportunity.status === "lost") && onStatusChange && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange("active")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reopen Opportunity
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content */}
      <div className="space-y-3">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm text-slate-900 dark:text-white truncate">
              {opportunity.name}
            </h3>
            {leadName && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{leadName}</span>
              </div>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn("shrink-0 text-xs", getOpportunityStatusColor(opportunity.status))}
          >
            {opportunity.status}
          </Badge>
        </div>

        {/* Value + Expected Value */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatOpportunityValue(opportunity.value, opportunity.value_type)}
            </span>
            {opportunity.value_type === "recurring" && (
              <Repeat className="h-3 w-3 text-blue-500" aria-label="Recurring revenue" />
            )}
          </div>
          {expectedValue !== null && (
            <span className="text-xs text-muted-foreground">
              Exp: {formatOpportunityValue(expectedValue, "one_time")}
            </span>
          )}
        </div>

        {/* Probability */}
        <div className="flex items-center gap-1.5 text-sm">
          <Percent className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("font-medium", getProbabilityColor(opportunity.probability))}>
            {opportunity.probability}%
          </span>
          <span className="text-muted-foreground">confidence</span>
        </div>

        {/* Footer: Contact + Date */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
          {contactName ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{contactName}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/50">No contact</div>
          )}

          {opportunity.expected_close_date && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {new Date(opportunity.expected_close_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
