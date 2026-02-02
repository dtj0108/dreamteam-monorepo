"use client"

import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { motion } from "motion/react"

// Dynamically import Lottie to reduce bundle size
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

// Import the animation data
import animationData from "../../../../public/animations/ai-sphere.json"

interface WelcomeStepProps {
  userName: string
  onContinue: () => void
}

export function WelcomeStep({ userName, onContinue }: WelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center"
    >
      {/* Lottie Animation */}
      <div className="w-64 h-64 mb-8">
        <Lottie
          animationData={animationData}
          loop
          className="w-full h-full"
        />
      </div>

      {/* Greeting */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold tracking-tight mb-4"
      >
        Welcome to DreamTeam, {userName}!
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-muted-foreground max-w-md mb-4"
      >
        Let&apos;s set up your workspace so you can start building, selling, and scaling with AI.
      </motion.p>

      {/* Agent Memory Messaging */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-sm text-muted-foreground/80 max-w-md mb-8 italic"
      >
        Your answers will help shape the memory of your agents — they&apos;ll remember your preferences from day one.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button size="lg" onClick={onContinue} className="px-8">
          Get Started
        </Button>
      </motion.div>
    </motion.div>
  )
}
