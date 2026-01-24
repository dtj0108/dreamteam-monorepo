"use client"

import { Brain, FileText, Check, X } from "lucide-react"
import { ToolResultCard } from "./tool-result-card"
import type { MemoryResult as MemoryResultType } from "@/lib/agent"

interface MemoryResultProps {
  result: MemoryResultType
}

export function MemoryResult({ result }: MemoryResultProps) {
  const { success, message, path, content, files } = result || {}

  return (
    <ToolResultCard
      icon={<Brain className="size-4" />}
      title={message || "Memory operation"}
      status={success ? "success" : "error"}
    >
      <div className="space-y-1.5">
        {path && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="size-3" />
            <span className="font-mono">{path}</span>
          </div>
        )}

        {content && (
          <div className="text-xs bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono">{content.slice(0, 500)}{content.length > 500 ? "..." : ""}</pre>
          </div>
        )}

        {files && files.length > 0 && (
          <div className="space-y-1">
            {files.slice(0, 5).map((file) => (
              <div key={file.path} className="flex items-center gap-1.5 text-xs">
                <FileText className="size-3 text-muted-foreground" />
                <span className="font-mono truncate">{file.path}</span>
              </div>
            ))}
            {files.length > 5 && (
              <p className="text-xs text-muted-foreground">+ {files.length - 5} more</p>
            )}
          </div>
        )}
      </div>
    </ToolResultCard>
  )
}
