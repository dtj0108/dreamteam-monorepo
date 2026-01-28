"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface StreamingTextProps {
  text: string
  speed?: number // ms per character (default 25)
  onComplete?: () => void
  className?: string
  showCursor?: boolean
}

export function StreamingText({
  text,
  speed = 25,
  onComplete,
  className,
  showCursor = true
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  const displayedIndexRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const previousTextRef = useRef("")
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    // Handle incremental text updates from SSE streaming
    // The text prop grows as new chunks arrive - we animate to catch up
    
    const targetText = text
    
    // If text shrunk (new message), reset
    if (targetText.length < previousTextRef.current.length) {
      displayedIndexRef.current = 0
      setDisplayedText("")
      setIsComplete(false)
    }
    previousTextRef.current = targetText
    
    // Already showing all available text
    if (displayedIndexRef.current >= targetText.length) {
      return
    }
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Animate displaying new characters
    timerRef.current = setInterval(() => {
      if (displayedIndexRef.current < targetText.length) {
        displayedIndexRef.current++
        setDisplayedText(targetText.slice(0, displayedIndexRef.current))
      } else {
        // Caught up to current text - pause timer but stay ready for more
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }, speed)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [text, speed])

  // When streaming stops and we're caught up, trigger onComplete
  useEffect(() => {
    if (displayedIndexRef.current >= text.length && text.length > 0 && !isComplete) {
      // Small delay to ensure we've displayed everything
      const timeout = setTimeout(() => {
        if (displayedIndexRef.current >= text.length) {
          setIsComplete(true)
          onCompleteRef.current?.()
        }
      }, speed * 2)
      return () => clearTimeout(timeout)
    }
  }, [text.length, displayedText.length, speed, isComplete])

  return (
    <span className={cn(className)}>
      {displayedText}
      {showCursor && !isComplete && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground/70 animate-pulse" />
      )}
    </span>
  )
}
