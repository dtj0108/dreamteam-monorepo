"use client"

import { ChevronDownIcon } from "lucide-react"
import { ReactNode } from "react"

interface FlowConnectorProps {
  children?: ReactNode
  showArrow?: boolean
}

export function FlowConnector({ children, showArrow = true }: FlowConnectorProps) {
  return (
    <div className="flex flex-col items-center py-2">
      {/* Top line segment */}
      <div className="w-px h-4 bg-gray-300" />

      {/* Arrow */}
      {showArrow && (
        <ChevronDownIcon className="size-4 text-gray-400 -my-1" />
      )}

      {/* Inline content (e.g., "+ Add Step" button) */}
      {children && (
        <>
          <div className="w-px h-2 bg-gray-300" />
          <div className="my-1">
            {children}
          </div>
          <div className="w-px h-2 bg-gray-300" />
          {showArrow && (
            <ChevronDownIcon className="size-4 text-gray-400 -my-1" />
          )}
        </>
      )}

      {/* Bottom line segment */}
      <div className="w-px h-4 bg-gray-300" />
    </div>
  )
}
