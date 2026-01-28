"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { ChevronRight, Check, Loader2, Bot, FileText, Search, Lightbulb, Brain, Pencil, Zap, type LucideIcon } from "lucide-react"
import { useState } from "react"

export interface ReasoningStep {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  status: "pending" | "loading" | "completed"
  subSteps?: string[]
}

interface ReasoningTimelineProps {
  steps: ReasoningStep[]
  title?: string
  isComplete?: boolean
}

export function ReasoningTimeline({ 
  steps, 
  title = "Thinking process",
  isComplete = false 
}: ReasoningTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const completedCount = steps.filter(s => s.status === "completed").length

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="relative">
          {isComplete ? (
            <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-4" />
            </div>
          ) : (
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative flex size-7 items-center justify-center rounded-full bg-primary/10">
                <Brain className="size-4 text-primary" />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">
            {isComplete ? "Thought process complete" : title}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {completedCount} of {steps.length}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-2">
        {steps.map((step, index) => (
          <TimelineStep
            key={step.id}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
            isExpanded={expandedSteps.has(step.id)}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface TimelineStepProps {
  step: ReasoningStep
  index: number
  isLast: boolean
  isExpanded: boolean
  onToggle: () => void
}

function TimelineStep({ step, index, isLast, isExpanded, onToggle }: TimelineStepProps) {
  const Icon = step.icon
  const hasSubSteps = step.subSteps && step.subSteps.length > 0

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[18px] top-8 bottom-[-8px] w-px bg-border" />
      )}

      {/* Step card */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={cn(
          "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
          step.status === "loading" 
            ? "bg-primary/5 border-primary/20" 
            : step.status === "completed"
            ? "bg-muted/30 border-transparent hover:bg-muted/50"
            : "bg-muted/20 border-transparent"
        )}
        onClick={onToggle}
      >
        {/* Status icon */}
        <div className="relative flex-shrink-0 mt-0.5">
          {step.status === "loading" ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Loader2 className="size-3.5 animate-spin" />
            </div>
          ) : step.status === "completed" ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-3.5" />
            </div>
          ) : (
            <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "text-sm font-medium",
              step.status === "loading" ? "text-foreground" : "text-foreground/80"
            )}>
              {step.label}
            </span>
            <ChevronRight 
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )} 
            />
          </div>

          {/* Description */}
          {step.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {step.description}
            </p>
          )}

          {/* Sub-steps */}
          <AnimatePresence>
            {isExpanded && hasSubSteps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                  {step.subSteps?.map((subStep, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                    >
                      <div className="size-1.5 rounded-full bg-muted-foreground/40" />
                      <span>{subStep}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Shimmer effect for loading */}
        {step.status === "loading" && (
          <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            animate={{ translateX: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>
    </div>
  )
}

// Helper function to convert synthetic stages to reasoning steps
export function createReasoningSteps(
  currentStage: number,
  status: "streaming" | "connecting" | "idle"
): ReasoningStep[] {
  const stages = [
    { id: "understand", label: "Understanding request", icon: Lightbulb },
    { id: "search", label: "Searching knowledge base", icon: Search },
    { id: "analyze", label: "Analyzing context", icon: Brain },
    { id: "formulate", label: "Formulating response", icon: Pencil },
  ]

  return stages.map((stage, index) => ({
    ...stage,
    status: index < currentStage 
      ? "completed" 
      : index === currentStage && status !== "idle"
      ? "loading" 
      : "pending",
    description: index === currentStage && status !== "idle" 
      ? "In progress..." 
      : undefined,
  }))
}

// Export icons for use in other components
export { Bot, FileText, Search, Lightbulb, Brain, Pencil, Zap }
