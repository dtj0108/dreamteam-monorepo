"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolResultCardProps {
  icon: React.ReactNode
  title: string
  status: "loading" | "success" | "error"
  children?: React.ReactNode
  className?: string
}

export function ToolResultCard({
  icon,
  title,
  status,
  children,
  className,
}: ToolResultCardProps) {
  return (
    <Card className={cn("my-2 border-border/50", className)}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center gap-2 text-sm">
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-muted-foreground">{icon}</span>
          )}
          <span className="font-medium">{title}</span>
          {status === "loading" && (
            <span className="text-xs text-muted-foreground">Processing...</span>
          )}
        </div>
      </CardHeader>
      {status !== "loading" && children && (
        <CardContent className="pt-0 pb-3 px-3">{children}</CardContent>
      )}
    </Card>
  )
}
