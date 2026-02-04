"use client"

import { Fragment, useState, useEffect } from "react"
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import { cn } from "@/lib/utils"
import { Copy, RotateCcw, Lightbulb, Brain, Loader2, Check, AlertCircle, Sparkles, ChevronRight, ChevronDown } from "lucide-react"
import type { AcknowledgmentPart, ReasoningPart, ToolCallPart, TextPart } from "@/hooks/use-agent-chat"
import { motion, AnimatePresence } from "motion/react"

function formatToolName(toolName: string): string {
  return toolName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface AssistantMessageProps {
  messageId: string
  ackPart?: AcknowledgmentPart
  reasoningParts: ReasoningPart[]
  toolParts: ToolCallPart[]
  textParts: TextPart[]
  isStreaming: boolean
  isLastMessage: boolean
  status: "streaming" | "connecting" | "idle" | "error"
  handleRetry: () => void
}

export function AssistantMessage({
  messageId,
  ackPart,
  reasoningParts,
  toolParts,
  textParts,
  isStreaming,
  isLastMessage,
  status,
  handleRetry,
}: AssistantMessageProps) {
  const [showDetails, setShowDetails] = useState(false)
  const hasIncompleteWork = toolParts.some((t) => t.state !== "completed" && t.state !== "error") || isStreaming
  const hasThinkingSteps = ackPart || reasoningParts.length > 0 || toolParts.length > 0
  const totalSteps = (ackPart ? 1 : 0) + reasoningParts.length + toolParts.length
  const completedSteps = (ackPart ? 1 : 0) + reasoningParts.length + toolParts.filter((t) => t.state === "completed").length
  const isComplete = !hasIncompleteWork && hasThinkingSteps
  const detailsId = `work-details-${messageId}`

  const isStreamingText = status === "streaming" && isLastMessage
  const isNotStreaming = !isStreamingText
  const shouldShowTypingIndicator = isStreaming && textParts.length === 0

  // Collect all thinking steps into a unified timeline
  const thinkingSteps = [
    ...(ackPart ? [{ type: "ack" as const, data: ackPart }] : []),
    ...reasoningParts.map((part, i) => ({ type: "reasoning" as const, data: part, index: i })),
    ...toolParts.map((part) => ({ type: "tool" as const, data: part })),
  ]

  return (
    <Fragment>
      {/* Chain of Thought Timeline */}
      {hasThinkingSteps && (
        <div className="not-prose max-w-2xl">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
            aria-controls={detailsId}
            className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isComplete ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
              </span>
              Work details
              <span className="text-xs font-normal text-muted-foreground">
                {completedSteps} of {totalSteps}
              </span>
            </span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showDetails && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                id={detailsId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="mt-3"
              >
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
                          <Sparkles className="size-4 text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {isComplete ? "Thought process complete" : "Thinking"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {completedSteps} of {totalSteps}
                    </span>
                  </div>
                </div>

                {/* Timeline Steps */}
                <div className="relative space-y-1">
                  {thinkingSteps.map((step, index) => {
                    const isLast = index === thinkingSteps.length - 1
                    if (step.type === "ack") {
                      return (
                        <TimelineStep
                          key="ack"
                          icon={Lightbulb}
                          label="Understanding request"
                          description={step.data.content}
                          status="completed"
                          isLast={isLast}
                          hasSubSteps={false}
                        />
                      )
                    }
                    if (step.type === "reasoning") {
                      const isActive = isStreaming && step.index === reasoningParts.length - 1 && toolParts.length === 0 && textParts.length === 0
                      return (
                        <TimelineStep
                          key={`reasoning-${step.index}`}
                          icon={Brain}
                          label="Reasoning"
                          description={step.data.reasoning}
                          status={isActive ? "loading" : "completed"}
                          isLast={isLast}
                          hasSubSteps={true}
                        />
                      )
                    }
                    return (
                      <ToolTimelineStep
                        key={step.data.toolCallId}
                        part={step.data}
                        isLast={isLast}
                      />
                    )
                  })}
                  
                  {/* Still working indicator - shows when thinking is done but no text yet */}
                  {hasThinkingSteps && textParts.length === 0 && isStreaming && (
                    <StillWorkingCard />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {shouldShowTypingIndicator && (
        <Message from="assistant">
          <MessageContent>
            <MessageResponse mode="streaming">
              Generating response…
            </MessageResponse>
          </MessageContent>
        </Message>
      )}

      {/* Final text response */}
      <AnimatePresence mode="wait">
        {textParts.map((part, i) => (
          <motion.div
            key={`${messageId}-text-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Message from="assistant">
              <MessageContent>
                <MessageResponse mode={isStreamingText ? "streaming" : "static"}>
                  {part.text}
                </MessageResponse>
              </MessageContent>
            </Message>
            {isNotStreaming && (
              <MessageActions>
                <MessageAction onClick={() => navigator.clipboard.writeText(part.text)} label="Copy">
                  <Copy className="size-3" />
                </MessageAction>
                <MessageAction onClick={handleRetry} label="Retry">
                  <RotateCcw className="size-3" />
                </MessageAction>
              </MessageActions>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </Fragment>
  )
}

interface TimelineStepProps {
  icon: typeof Lightbulb
  label: string
  description?: string
  status: "pending" | "loading" | "completed"
  isLast: boolean
  hasSubSteps?: boolean
}

function TimelineStep({ icon: Icon, label, description, status, isLast, hasSubSteps = true }: TimelineStepProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isLoading = status === "loading"
  const isCompleted = status === "completed"

  // Split description into lines for sub-steps
  const subSteps = hasSubSteps && description 
    ? description.split('\n').filter(line => line.trim()).slice(0, 3)
    : []

  return (
    <div className="relative">
      {/* Vertical connector */}
      {!isLast && <div className="absolute left-[18px] top-8 bottom-[-4px] w-px bg-border" />}

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
          isLoading ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent hover:bg-muted/50"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status icon */}
        <div className="relative flex-shrink-0 mt-0.5">
          {isLoading ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Loader2 className="size-3.5 animate-spin" />
            </div>
          ) : isCompleted ? (
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
            <span className={cn("text-sm font-medium", isLoading ? "text-foreground" : "text-foreground/80")}>
              {label}
            </span>
            <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
          </div>

          {/* Sub-steps */}
          <AnimatePresence>
            {isExpanded && subSteps.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                  {subSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground py-0.5">
                      <div className="size-1.5 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                      <span className="line-clamp-2">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Shimmer for loading */}
        {isLoading && (
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

interface ToolTimelineStepProps {
  part: ToolCallPart
  isLast: boolean
}

function ToolTimelineStep({ part, isLast }: ToolTimelineStepProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isActive = part.state !== "completed" && part.state !== "error"
  const isError = part.state === "error"
  const isCompleted = part.state === "completed"
  const statusLabel =
    part.state === "pending" ? "Pending" :
    part.state === "running" ? "Running" :
    part.state === "completed" ? "Completed" : "Error"

  return (
    <div className="relative">
      {/* Vertical connector */}
      {!isLast && <div className="absolute left-[18px] top-8 bottom-[-4px] w-px bg-border" />}

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
          isActive ? "bg-primary/5 border-primary/20" : isError ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-transparent hover:bg-muted/50"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status icon */}
        <div className="relative flex-shrink-0 mt-0.5">
          {isActive ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Loader2 className="size-3.5 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <AlertCircle className="size-3.5" />
            </div>
          ) : (
            <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-3.5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-sm font-medium", isActive ? "text-foreground" : isError ? "text-destructive" : "text-foreground/80")}>
              {formatToolName(part.toolName)}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                isActive ? "border-primary/20 text-primary" :
                isError ? "border-destructive/30 text-destructive" :
                "border-emerald-200 text-emerald-600"
              )}>
                {statusLabel}
              </span>
              <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
            </div>
          </div>

          {/* Result preview */}
          <AnimatePresence>
            {isExpanded && part.result !== undefined && part.result !== null && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pl-2 border-l-2 border-muted">
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {String(part.result).slice(0, 200) || "Completed"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Shimmer for loading */}
        {isActive && (
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

// Messages that cycle while waiting for the final response
const STILL_WORKING_MESSAGES = [
  { label: "Processing", description: "Analyzing all the information..." },
  { label: "Connecting dots", description: "Building the complete picture..." },
  { label: "Refining", description: "Polishing the response..." },
  { label: "Almost there", description: "Putting it all together..." },
]

function StillWorkingCard() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STILL_WORKING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const message = STILL_WORKING_MESSAGES[messageIndex]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="relative"
    >
      {/* Vertical connector */}
      <div className="absolute left-[18px] top-[-4px] bottom-0 w-px bg-border" />

      <div className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20 relative">
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
              key={messageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-sm font-medium text-foreground">
                {message.label}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {message.description}
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
      </div>

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
  )
}
