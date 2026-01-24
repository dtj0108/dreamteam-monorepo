"use client"

import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  CreditCard,
  Calendar,
  Bell,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SubscriptionWithCategory } from "@/lib/types"
import {
  FREQUENCY_LABELS,
  calculateMonthlyEquivalent,
  calculateDaysUntilRenewal,
} from "@/lib/types"

interface SubscriptionCardProps {
  subscription: SubscriptionWithCategory
  onEdit: (subscription: SubscriptionWithCategory) => void
  onToggleActive: (subscription: SubscriptionWithCategory) => void
  onDelete: (subscriptionId: string) => void
  loading?: boolean
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onToggleActive,
  onDelete,
  loading,
}: SubscriptionCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount))
  }

  const daysUntilRenewal = calculateDaysUntilRenewal(subscription.next_renewal_date)
  const monthlyEquivalent = calculateMonthlyEquivalent(subscription.amount, subscription.frequency)
  const isUpcoming = daysUntilRenewal >= 0 && daysUntilRenewal <= subscription.reminder_days_before
  const isOverdue = daysUntilRenewal < 0

  return (
    <Card className={`group transition-all ${!subscription.is_active ? "opacity-60" : ""} ${isUpcoming ? "ring-2 ring-amber-400" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
              subscription.category?.color 
                ? `bg-[${subscription.category.color}]/10` 
                : "bg-primary/10"
            }`}>
              <CreditCard className={`h-5 w-5 ${
                subscription.category?.color 
                  ? `text-[${subscription.category.color}]` 
                  : "text-primary"
              }`} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{subscription.name}</h3>
                {subscription.is_auto_detected && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">
                          Auto-detected
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This subscription was automatically detected from your transactions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {!subscription.is_active && (
                  <Badge variant="secondary">Paused</Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {FREQUENCY_LABELS[subscription.frequency]}
                </span>
                {subscription.category && (
                  <span className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: subscription.category.color }}
                    />
                    {subscription.category.name}
                  </span>
                )}
              </div>

              {/* Renewal Info */}
              <div className="flex items-center gap-2 mt-2">
                {isOverdue ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue by {Math.abs(daysUntilRenewal)} days
                  </Badge>
                ) : isUpcoming ? (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs">
                    <Bell className="h-3 w-3 mr-1" />
                    Renews {daysUntilRenewal === 0 ? "today" : `in ${daysUntilRenewal} days`}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Renews {format(new Date(subscription.next_renewal_date), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Amount and Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="font-semibold text-lg">
                {formatCurrency(subscription.amount)}
              </p>
              {subscription.frequency !== "monthly" && (
                <p className="text-xs text-muted-foreground">
                  ~{formatCurrency(monthlyEquivalent)}/mo
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={loading}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(subscription)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleActive(subscription)}>
                  {subscription.is_active ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(subscription.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

