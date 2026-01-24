"use client"

import { isToday, isYesterday, format } from "date-fns"

interface DateSeparatorProps {
  date: Date
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const getDateLabel = () => {
    if (isToday(date)) return "Today"
    if (isYesterday(date)) return "Yesterday"
    return format(date, "EEEE, MMMM d")
  }

  return (
    <div className="relative flex items-center my-4 px-4">
      <div className="flex-1 border-t border-border" />
      <span className="px-4 text-xs text-muted-foreground font-medium bg-background">
        {getDateLabel()}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
