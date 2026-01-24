"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Bell,
  CreditCard,
  CalendarClock,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { SubscriptionWithCategory } from "@/lib/types"
import { calculateDaysUntilRenewal } from "@/lib/types"

interface UpcomingRenewalsProps {
  /** Number of days ahead to show renewals for */
  daysAhead?: number
  /** Maximum number of renewals to display */
  maxItems?: number
  /** Whether to show a compact version */
  compact?: boolean
  /** Title for the widget */
  title?: string
  /** Show "View All" link */
  showViewAll?: boolean
}

export function UpcomingRenewals({
  daysAhead = 7,
  maxItems = 5,
  compact = false,
  title = "Upcoming Renewals",
  showViewAll = true,
}: UpcomingRenewalsProps) {
  const [renewals, setRenewals] = useState<SubscriptionWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount))
  }

  useEffect(() => {
    const fetchRenewals = async () => {
      try {
        const response = await fetch(`/api/subscriptions/upcoming?days=${daysAhead}`)
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        setRenewals(data.slice(0, maxItems))
      } catch (error) {
        console.error("Failed to fetch upcoming renewals:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRenewals()
  }, [daysAhead, maxItems])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (renewals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming renewals in the next {daysAhead} days
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={renewals.length > 0 ? "border-amber-400/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            {title}
            {renewals.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {renewals.length}
              </Badge>
            )}
          </CardTitle>
          {showViewAll && (
            <Link href="/subscriptions">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {renewals.map((subscription) => {
            const days = calculateDaysUntilRenewal(subscription.next_renewal_date)

            return (
              <div
                key={subscription.id}
                className={`flex items-center justify-between ${
                  compact ? "py-1" : "py-2"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`${
                      compact ? "h-8 w-8" : "h-10 w-10"
                    } rounded-lg flex items-center justify-center shrink-0 bg-primary/10`}
                  >
                    <CreditCard
                      className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-primary`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate text-sm">
                      {subscription.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {days === 0
                        ? "Today"
                        : days === 1
                        ? "Tomorrow"
                        : `In ${days} days`}
                      {!compact &&
                        ` • ${format(
                          new Date(subscription.next_renewal_date),
                          "MMM d"
                        )}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${compact ? "text-sm" : ""}`}>
                    {formatCurrency(subscription.amount)}
                  </p>
                  {days <= 1 && (
                    <Badge
                      variant="outline"
                      className="text-xs border-amber-400 text-amber-600"
                    >
                      Soon
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Simple inline list of upcoming renewals for use in notifications
 */
export function UpcomingRenewalsList({
  daysAhead = 14,
}: {
  daysAhead?: number
}) {
  const [renewals, setRenewals] = useState<SubscriptionWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount))
  }

  useEffect(() => {
    const fetchRenewals = async () => {
      try {
        const response = await fetch(`/api/subscriptions/upcoming?days=${daysAhead}`)
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        setRenewals(data)
      } catch (error) {
        console.error("Failed to fetch upcoming renewals:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRenewals()
  }, [daysAhead])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (renewals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CalendarClock className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="font-medium">No upcoming renewals</p>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any subscription renewals in the next {daysAhead} days
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {renewals.map((subscription) => {
        const days = calculateDaysUntilRenewal(subscription.next_renewal_date)
        const isUrgent = days <= 3

        return (
          <Link
            key={subscription.id}
            href={`/subscriptions/${subscription.id}`}
            className="block"
          >
            <div
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                isUrgent
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                  : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{subscription.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Renews{" "}
                    {format(new Date(subscription.next_renewal_date), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(subscription.amount)}</p>
                <Badge
                  variant={isUrgent ? "default" : "secondary"}
                  className={isUrgent ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  {days === 0
                    ? "Today"
                    : days === 1
                    ? "Tomorrow"
                    : `In ${days} days`}
                </Badge>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

