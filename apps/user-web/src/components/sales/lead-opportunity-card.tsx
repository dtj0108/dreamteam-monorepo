"use client"

import * as React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Pencil } from "lucide-react"
import type { ValueDisplayType } from "./opportunities-filter-bar"

export interface OpportunityData {
  id: string
  name: string
  value: number | null
  probability: number
  status: string
  value_type: string
  expected_close_date: string | null
  contact_id: string | null
  user_id: string | null
  contact: { id: string; first_name: string | null; last_name: string | null } | null
  user: { id: string; full_name: string | null; email: string | null } | null
}

interface LeadData {
  id: string
  name: string
  website: string | null
  industry: string | null
  opportunities: OpportunityData[]
}

interface LeadOpportunityCardProps {
  lead: LeadData
  valueDisplay: ValueDisplayType
  isDragging?: boolean
  className?: string
  onEditOpportunity?: (leadId: string, opportunity: OpportunityData) => void
}

function formatCompactValue(value: number | null, valueType: string): string {
  if (value === null) return "-"

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(valueType === "recurring" ? value * 12 : value)

  return valueType === "recurring" ? `${formatted}/yr` : formatted
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getLeadIcon(name: string): string {
  const icons: Record<string, string> = {
    A: "🏢", B: "🏗️", C: "🏭", D: "🏠", E: "🏪",
    F: "🌿", G: "🔧", H: "🏥", I: "💼", J: "🎯",
    K: "🔑", L: "💡", M: "🎵", N: "📱", O: "🎨",
    P: "📦", Q: "🔬", R: "🚀", S: "⭐", T: "🌳",
    U: "🔮", V: "🎮", W: "🌐", X: "✨", Y: "🎪", Z: "⚡",
  }
  const firstLetter = name.charAt(0).toUpperCase()
  return icons[firstLetter] || "🏢"
}

export function LeadOpportunityCard({
  lead,
  valueDisplay,
  isDragging,
  className,
  onEditOpportunity,
}: LeadOpportunityCardProps) {
  // Filter to only show active opportunities
  const activeOpportunities = lead.opportunities.filter(
    (opp) => opp.status === "active" || !opp.status
  )

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-white dark:bg-slate-800",
        "border border-slate-200 dark:border-slate-700",
        "shadow-sm hover:shadow-md transition-shadow",
        isDragging && "opacity-60 scale-[0.98] rotate-1",
        className
      )}
    >
      {/* Lead Header */}
      <Link
        href={`/sales/leads/${lead.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
      >
        <span className="text-lg">{getLeadIcon(lead.name)}</span>
        <span className="font-semibold text-sky-600 dark:text-sky-400 hover:underline truncate text-sm">
          {lead.name}
        </span>
      </Link>

      {/* Opportunities List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {activeOpportunities.length === 0 ? (
          <div className="px-4 py-5 text-sm text-muted-foreground text-center">
            No active opportunities
          </div>
        ) : (
          activeOpportunities.map((opp) => {
            // Get owner name (user who created the opportunity)
            const ownerName = opp.user?.full_name || opp.user?.email?.split("@")[0] || null

            return (
              <div
                key={opp.id}
                className="group flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
              >
                {/* Owner Avatar */}
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                    {ownerName ? getInitials(ownerName) : "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Opportunity Details */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name + Edit button */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {opp.name}
                    </span>
                    {onEditOpportunity && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onEditOpportunity(lead.id, opp)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>

                  {/* Row 2: Value · Probability · Date */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatCompactValue(opp.value, opp.value_type)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{opp.probability}%</span>
                    {opp.expected_close_date && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span>{formatShortDate(opp.expected_close_date)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// Sortable version for drag-and-drop
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SortableLeadCardProps extends LeadOpportunityCardProps {
  id: string
}

export function SortableLeadCard({
  id,
  lead,
  valueDisplay,
  className,
  onEditOpportunity,
}: SortableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadOpportunityCard
        lead={lead}
        valueDisplay={valueDisplay}
        isDragging={isDragging}
        onEditOpportunity={onEditOpportunity}
        className={cn(className, "cursor-grab active:cursor-grabbing")}
      />
    </div>
  )
}
