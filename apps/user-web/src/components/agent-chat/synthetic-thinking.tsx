"use client"

import { motion } from "motion/react"
import { Loader2 } from "lucide-react"

interface SyntheticThinkingProps {
  status: "streaming" | "connecting" | "idle"
  label?: string
  description?: string
}

export function SyntheticThinking({
  status,
  label = "Thinking",
  description = "Working on your request",
}: SyntheticThinkingProps) {
  const isActive = status === "streaming" || status === "connecting"

  if (!isActive) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="not-prose max-w-2xl"
    >
      <motion.div
        animate={{ opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/50 px-4 py-3"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="size-4 text-primary" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{label}...</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </motion.div>
    </motion.div>
  )
}
