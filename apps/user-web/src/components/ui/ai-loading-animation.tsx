"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

interface AILoadingAnimationProps {
  currentItem?: number
  totalItems?: number
  message?: string
  className?: string
}

export function AILoadingAnimation({
  currentItem,
  totalItems,
  message = "AI is analyzing...",
  className,
}: AILoadingAnimationProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Generate random particles
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      duration: Math.random() * 2 + 2,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/30 dark:via-background dark:to-indigo-950/30 p-8 overflow-hidden",
        className
      )}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[100px] animate-pulse opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-radial from-violet-500/40 to-transparent rounded-full blur-3xl" />
        </div>
      </div>

      {/* Floating sparkle particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-violet-500/60 dark:text-violet-400/60 animate-float-sparkle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
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

      {/* Central icon */}
      <div className="relative z-10 mb-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Sparkles className="h-12 w-12 text-violet-500/30" />
          </div>
          <Sparkles className="h-12 w-12 text-violet-600 dark:text-violet-400 animate-pulse" />
        </div>
      </div>

      {/* Message */}
      <p className="relative z-10 text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent animate-pulse">
        {message}
      </p>

      {/* Progress indicator */}
      {currentItem !== undefined && totalItems !== undefined && (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Analyzing transaction {currentItem} of {totalItems}
          </p>
          <div className="w-48 h-2 bg-violet-100 dark:bg-violet-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(currentItem / totalItems) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Orbiting dots */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-32 h-32 animate-spin-slow">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-violet-500 dark:bg-violet-400 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 90}deg) translateX(60px) translateY(-50%)`,
                opacity: 0.6 - i * 0.1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Add required keyframes via style tag */}
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
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
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
        .animate-float-sparkle {
          animation: float-sparkle 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}

