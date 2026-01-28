"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { ChevronRight, Check, Loader2, Lightbulb, Search, Brain, Pencil, Sparkles, type LucideIcon } from "lucide-react"
import { useState, useEffect } from "react"

interface SyntheticStage {
  label: string
  description: string
  icon: LucideIcon
  delay: number
}

const SYNTHETIC_STAGES: SyntheticStage[] = [
  {
    label: "Understanding request",
    description: "Parsing intent and extracting key details",
    icon: Lightbulb,
    delay: 0,
  },
  {
    label: "Searching knowledge base",
    description: "Finding relevant context and information",
    icon: Search,
    delay: 800,
  },
  {
    label: "Analyzing context",
    description: "Evaluating conversation history and patterns",
    icon: Brain,
    delay: 1800,
  },
  {
    label: "Formulating response",
    description: "Crafting a helpful and accurate answer",
    icon: Pencil,
    delay: 3000,
  },
]

interface SyntheticThinkingProps {
  status: "streaming" | "connecting" | "idle"
  stage: number
  variant?: "default" | "compact"
}

// Additional "still working" messages that cycle after all stages complete
const STILL_WORKING_MESSAGES = [
  { label: "Processing data", description: "Analyzing information..." },
  { label: "Connecting dots", description: "Building relationships..." },
  { label: "Refining output", description: "Polishing the response..." },
  { label: "Almost there", description: "Finalizing details..." },
  { label: "Working hard", description: "This is taking a moment..." },
]

export function SyntheticThinking({
  status,
  stage,
  variant = "default",
}: SyntheticThinkingProps) {
  const isActive = status === "streaming" || status === "connecting"
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set())
  const [workingMessageIndex, setWorkingMessageIndex] = useState(0)

  if (!isActive) {
    return null
  }

  // Cycle through "still working" messages after all stages complete
  useEffect(() => {
    if (stage >= SYNTHETIC_STAGES.length - 1) {
      const interval = setInterval(() => {
        setWorkingMessageIndex((prev) => (prev + 1) % STILL_WORKING_MESSAGES.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [stage])

  const toggleStage = (index: number) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const allStagesComplete = stage >= SYNTHETIC_STAGES.length - 1
  const workingMessage = STILL_WORKING_MESSAGES[workingMessageIndex]

  if (variant === "compact") {
    const currentStage = allStagesComplete 
      ? { label: workingMessage.label, description: workingMessage.description }
      : SYNTHETIC_STAGES[stage] || SYNTHETIC_STAGES[SYNTHETIC_STAGES.length - 1]
    
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="size-4 text-primary" />
          </motion.div>
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p 
              key={currentStage.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm font-medium truncate"
            >
              {currentStage.label}...
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-muted-foreground truncate">
            {currentStage.description}
          </p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {allStagesComplete ? "●●●" : `${stage + 1}/${SYNTHETIC_STAGES.length}`}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="not-prose max-w-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex size-7 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-4 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">Thinking</span>
          <span className="text-xs text-muted-foreground ml-2">
            {allStagesComplete ? "●●●" : `${stage + 1} of ${SYNTHETIC_STAGES.length}`}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-1">
        {SYNTHETIC_STAGES.slice(0, stage + 1).map((s, i) => {
          const isCurrent = i === stage && !allStagesComplete
          const isCompleted = i < stage || allStagesComplete
          const isExpanded = expandedStages.has(i)
          const StageIcon = s.icon

          return (
            <div key={s.label} className="relative">
              {/* Vertical connector */}
              {i < stage && (
                <div className="absolute left-[18px] top-8 bottom-[-4px] w-px bg-border" />
              )}

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={cn(
                  "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isCurrent
                    ? "bg-primary/5 border-primary/20"
                    : isCompleted
                    ? "bg-muted/30 border-transparent hover:bg-muted/50"
                    : "bg-muted/20 border-transparent"
                )}
                onClick={() => toggleStage(i)}
              >
                {/* Status icon */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {isCurrent ? (
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                    </div>
                  ) : isCompleted ? (
                    <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="size-3.5" />
                    </div>
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <StageIcon className="size-3.5" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-foreground" : "text-foreground/70"
                    )}>
                      {s.label}
                    </span>
                    <ChevronRight 
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90"
                      )} 
                    />
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Shimmer for current */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                    animate={{ translateX: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </motion.div>
            </div>
          )
        })}

        {/* Still working card - shows after all stages complete */}
        <AnimatePresence>
          {allStagesComplete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <motion.div
                className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20"
              >
                {/* Animated loader */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                  </div>
                </div>

                {/* Cycling message */}
                <div className="flex-1 min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={workingMessageIndex}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {workingMessage.label}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {workingMessage.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Continuous shimmer */}
                <motion.div
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                  animate={{ translateX: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>

              {/* Animated dots */}
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="size-1.5 rounded-full bg-primary"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export { SYNTHETIC_STAGES }
export type { SyntheticStage }
