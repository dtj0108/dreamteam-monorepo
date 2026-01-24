import { useRef, useCallback } from "react"

interface AutoScrollOptions {
  threshold?: number      // Distance from edge to start scrolling (default: 100px)
  maxSpeed?: number       // Max scroll speed in px/frame (default: 15)
}

export function useAutoScroll(options: AutoScrollOptions = {}) {
  const { threshold = 100, maxSpeed = 15 } = options
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollAnimationRef = useRef<number | null>(null)

  const handleDragMove = useCallback((event: { activatorEvent: Event }) => {
    const container = scrollContainerRef.current
    if (!container) return

    // Get pointer position from the activator event
    const pointerEvent = event.activatorEvent as PointerEvent | MouseEvent
    if (!pointerEvent?.clientX) return

    const rect = container.getBoundingClientRect()
    const pointerX = pointerEvent.clientX

    // Calculate distance from edges
    const distanceFromLeft = pointerX - rect.left
    const distanceFromRight = rect.right - pointerX

    // Cancel any existing animation
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
    }

    // Determine scroll direction and speed
    let scrollSpeed = 0
    if (distanceFromLeft < threshold) {
      // Scroll left - speed increases as we get closer to edge
      scrollSpeed = -maxSpeed * (1 - distanceFromLeft / threshold)
    } else if (distanceFromRight < threshold) {
      // Scroll right - speed increases as we get closer to edge
      scrollSpeed = maxSpeed * (1 - distanceFromRight / threshold)
    }

    // Start scroll animation if needed
    if (scrollSpeed !== 0) {
      const scroll = () => {
        if (container) {
          container.scrollLeft += scrollSpeed
          scrollAnimationRef.current = requestAnimationFrame(scroll)
        }
      }
      scrollAnimationRef.current = requestAnimationFrame(scroll)
    }
  }, [threshold, maxSpeed])

  const stopAutoScroll = useCallback(() => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
    }
  }, [])

  return {
    scrollContainerRef,
    handleDragMove,
    stopAutoScroll,
  }
}
