"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CallTimerProps {
  startTime: Date
  className?: string
}

export function CallTimer({ startTime, className }: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    // Calculate initial elapsed time
    const initialElapsed = Math.floor(
      (Date.now() - startTime.getTime()) / 1000
    )
    setElapsed(initialElapsed)

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const formattedTime =
    hours > 0
      ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      : `${minutes}:${seconds.toString().padStart(2, "0")}`

  return (
    <span className={cn("tabular-nums font-mono", className)}>
      {formattedTime}
    </span>
  )
}
