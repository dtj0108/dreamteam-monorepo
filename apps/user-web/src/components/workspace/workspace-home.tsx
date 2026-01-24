"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export interface StatItem {
  title: string
  value: string | number
  icon: LucideIcon
  href?: string
  change?: number
  changeLabel?: string
}

export interface GettingStartedItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  isComplete: boolean
}

export interface ShortcutItem {
  title: string
  description: string
  href: string
  icon: LucideIcon
  badge?: string
}

interface WorkspaceHomeProps {
  title: string
  description: string
  icon: LucideIcon
  iconColor?: "sky" | "emerald" | "amber" | "purple" | "rose"
  stats?: StatItem[]
  gettingStartedItems?: GettingStartedItem[]
  shortcuts?: ShortcutItem[]
  isLoading?: boolean
  children?: React.ReactNode
}

const colorClasses = {
  sky: { bg: "bg-sky-100", text: "text-sky-600", border: "border-sky-200", hoverBorder: "hover:border-sky-300" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200", hoverBorder: "hover:border-emerald-300" },
  amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200", hoverBorder: "hover:border-amber-300" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200", hoverBorder: "hover:border-purple-300" },
  rose: { bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200", hoverBorder: "hover:border-rose-300" },
}

export function WorkspaceHome({
  title,
  description,
  icon: Icon,
  iconColor = "sky",
  stats,
  gettingStartedItems,
  shortcuts,
  isLoading,
  children,
}: WorkspaceHomeProps) {
  const colors = colorClasses[iconColor]
  const [gettingStartedOpen, setGettingStartedOpen] = useState(true)

  const completedCount = gettingStartedItems?.filter(item => item.isComplete).length ?? 0
  const totalCount = gettingStartedItems?.length ?? 0
  const allComplete = completedCount === totalCount && totalCount > 0
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (isLoading) {
    return <WorkspaceHomeSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex items-center gap-4">
        <div className={cn("p-3 rounded-xl", colors.bg)}>
          <Icon className={cn("h-8 w-8", colors.text)} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && stats.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const StatIcon = stat.icon
            const content = (
              <Card className={stat.href ? "hover:border-muted-foreground/50 transition-colors cursor-pointer" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <StatIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.change !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {stat.change > 0 ? "+" : ""}{stat.change}% {stat.changeLabel || "vs last period"}
                    </p>
                  )}
                </CardContent>
              </Card>
            )

            return stat.href ? (
              <Link key={stat.title} href={stat.href}>{content}</Link>
            ) : (
              <div key={stat.title}>{content}</div>
            )
          })}
        </div>
      )}

      {/* Getting Started Section */}
      {gettingStartedItems && gettingStartedItems.length > 0 && !allComplete && (
        <Collapsible open={gettingStartedOpen} onOpenChange={setGettingStartedOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Getting Started</CardTitle>
                    <CardDescription>
                      Complete these steps to get the most out of {title}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {completedCount}/{totalCount} complete
                    </div>
                    {gettingStartedOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <Progress value={progressPercent} className="h-2 mt-3" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {gettingStartedItems.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          item.isComplete
                            ? "bg-muted/50 text-muted-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        {item.isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <ItemIcon className="h-4 w-4 shrink-0" />
                        <span className={item.isComplete ? "line-through" : ""}>
                          {item.label}
                        </span>
                        {!item.isComplete && (
                          <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Shortcuts Grid */}
      {shortcuts && shortcuts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((shortcut) => {
              const ShortcutIcon = shortcut.icon
              return (
                <Link key={shortcut.href} href={shortcut.href}>
                  <Card className="h-full hover:border-muted-foreground/50 hover:shadow-sm transition-all cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <ShortcutIcon className={cn("h-5 w-5", colors.text)} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {shortcut.title}
                            {shortcut.badge && (
                              <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded-full">
                                {shortcut.badge}
                              </span>
                            )}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{shortcut.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom content slot */}
      {children}
    </div>
  )
}

function WorkspaceHomeSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shortcuts skeleton */}
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
