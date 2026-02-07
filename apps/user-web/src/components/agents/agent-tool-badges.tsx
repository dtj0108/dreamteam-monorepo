"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AgentTool } from "@/lib/types/agents"

interface AgentToolBadgesProps {
  tools: AgentTool[]
  maxVisible?: number
}

export function AgentToolBadges({ tools, maxVisible = 3 }: AgentToolBadgesProps) {
  const enabledTools = tools.filter((t) => t.is_enabled)
  if (enabledTools.length === 0) return null

  const visible = enabledTools.slice(0, maxVisible)
  const overflow = enabledTools.length - maxVisible

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-1">
        {visible.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5 cursor-default font-normal"
              >
                {tool.name}
              </Badge>
            </TooltipTrigger>
            {tool.description && (
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tool.description}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 cursor-default font-normal"
              >
                +{overflow} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <div className="space-y-1">
                {enabledTools.slice(maxVisible).map((tool) => (
                  <div key={tool.id}>
                    <span className="font-medium">{tool.name}</span>
                    {tool.description && (
                      <span className="text-muted-foreground"> - {tool.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
