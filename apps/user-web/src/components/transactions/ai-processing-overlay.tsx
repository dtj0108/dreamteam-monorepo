"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

interface AIProcessingOverlayProps {
  isOpen: boolean
  transactionCount: number
  currentProgress?: number
}

export function AIProcessingOverlay({
  isOpen,
  transactionCount,
  currentProgress,
}: AIProcessingOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  // Generate particles when opened
  useEffect(() => {
    if (!isOpen) {
      setParticles([])
      setSimulatedProgress(0)
      return
    }

    const newParticles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [isOpen])

  // Simulate progress if not provided externally
  useEffect(() => {
    if (!isOpen || currentProgress !== undefined) return

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 95) return prev
        return prev + Math.random() * 8 + 2
      })
    }, 400)

    return () => clearInterval(interval)
  }, [isOpen, currentProgress])

  const progress = currentProgress ?? simulatedProgress

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />

      {/* Subtle gradient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20">
          <div 
            className="w-full h-full rounded-full bg-gradient-radial from-sky-500 to-transparent blur-3xl"
            style={{ animation: "pulse 3s ease-in-out infinite" }}
          />
        </div>
      </div>

      {/* Floating sparkle particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-sky-500/40 pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `float-sparkle ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          <svg
            width={particle.size}
            height={particle.size}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
      ))}

      {/* Main content card */}
      <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border bg-card/95 backdrop-blur-sm shadow-2xl px-12 py-10 max-w-md mx-4">
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-30">
            <Sparkles className="h-14 w-14 text-sky-500" />
          </div>
          <Sparkles className="h-14 w-14 text-sky-600 dark:text-sky-400 animate-pulse" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-sky-600 to-cyan-600 dark:from-sky-400 dark:to-cyan-400 bg-clip-text text-transparent">
            AI is categorizing...
          </h2>
          <p className="text-sm text-muted-foreground">
            Analyzing {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-2 bg-sky-100 dark:bg-sky-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(Math.min(progress, 100))}% complete
          </p>
        </div>

        {/* Orbiting dots */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div 
            className="relative w-40 h-40"
            style={{ animation: "spin-slow 10s linear infinite" }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 bg-sky-500 rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 90}deg) translateX(75px) translateY(-50%)`,
                  opacity: 0.7 - i * 0.15,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes float-sparkle {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-25px) rotate(180deg);
            opacity: 0.6;
          }
          90% {
            opacity: 1;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.15;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}

