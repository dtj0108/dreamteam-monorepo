"use client"

import { BookOpen, FileText, Clock } from "lucide-react"
import { ToolResultCard } from "./tool-result-card"
import type { KnowledgeResult as KnowledgeResultType } from "@/lib/agent"

interface KnowledgeResultProps {
  result: KnowledgeResultType & {
    message?: string
    page?: KnowledgeResultType["pages"][number]
  }
}

export function KnowledgeResult({ result }: KnowledgeResultProps) {
  // Handle both array format and single page format
  const pages = result?.pages || (result?.page ? [result.page] : [])
  const summary = result?.summary || { count: pages.length }

  // Determine action message
  const actionMessage = result?.message
    ? String(result.message)
    : pages.length === 1
      ? "Page Created"
      : `${summary.count} Pages Found`

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <ToolResultCard
      icon={<BookOpen className="size-4" />}
      title={actionMessage}
      status="success"
    >
      <div className="space-y-2">
        {pages.slice(0, 5).map((page: KnowledgeResultType["pages"][number]) => (
          <div
            key={page.id}
            className="p-2 rounded-md border bg-card/50 space-y-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{page.icon || "📄"}</span>
              <span className="font-medium text-sm flex-1 truncate">
                {page.title}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-2.5" />
                {formatRelativeTime(page.updatedAt)}
              </div>
            </div>

            {page.excerpt && (
              <p className="text-xs text-muted-foreground line-clamp-2 pl-7">
                {page.excerpt}
              </p>
            )}
          </div>
        ))}

        {pages.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            + {pages.length - 5} more pages
          </p>
        )}

        {pages.length === 0 && (
          <p className="text-xs text-muted-foreground">No pages found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
