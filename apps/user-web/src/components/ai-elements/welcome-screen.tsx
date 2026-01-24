"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { Suggestion, SuggestionGroup } from "./suggestion"
import {
  FileText,
  Code,
  Palette,
  Search,
  ChevronRight,
  ChevronDown,
} from "lucide-react"

// Dynamic import for Lottie to reduce initial bundle size
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

// Import animation data - will be loaded from public folder
const ANIMATION_PATH = "/animations/ai-sphere.json"

export interface WelcomeScreenProps {
  agentName: string
  agentDescription?: string | null
  agentAvatar?: string | null
  onSuggestionClick: (text: string) => void
  className?: string
}

interface SuggestionCategory {
  id: string
  icon: typeof FileText
  label: string
  suggestions: string[]
}

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    id: "summary",
    icon: FileText,
    label: "Summary",
    suggestions: [
      "Summarize our recent performance",
      "Give me a quick overview of pending tasks",
      "What are the key metrics to focus on?",
      "Summarize the latest updates",
    ],
  },
  {
    id: "code",
    icon: Code,
    label: "Code",
    suggestions: [
      "Help me write a function to calculate revenue",
      "Review this code for improvements",
      "Explain how this algorithm works",
      "Generate a utility function for data parsing",
    ],
  },
  {
    id: "design",
    icon: Palette,
    label: "Design",
    suggestions: [
      "Suggest a color scheme for the dashboard",
      "How can I improve the user experience?",
      "Review the layout of this page",
      "Recommend UI improvements for the form",
    ],
  },
  {
    id: "research",
    icon: Search,
    label: "Research",
    suggestions: [
      "Find best practices for data visualization",
      "What are competitors doing differently?",
      "Research the latest industry trends",
      "Help me understand this concept",
    ],
  },
]

export function WelcomeScreen({
  agentName,
  agentDescription,
  onSuggestionClick,
  className,
}: WelcomeScreenProps) {
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Load animation data on mount
  const loadAnimation = useCallback(async () => {
    try {
      const response = await fetch(ANIMATION_PATH)
      if (response.ok) {
        const data = await response.json()
        setAnimationData(data)
      }
    } catch (error) {
      console.error("Failed to load animation:", error)
    }
  }, [])

  // Load animation when component mounts
  useState(() => {
    loadAnimation()
  })

  const handleCategoryClick = (categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId))
  }

  const handleSuggestionClick = (text: string) => {
    // Auto-send immediately when suggestion is clicked
    onSuggestionClick(text)
  }

  const expandedCategoryData = expandedCategory
    ? SUGGESTION_CATEGORIES.find((c) => c.id === expandedCategory)
    : null

  return (
    <div className={cn("h-full flex flex-col items-center justify-center px-4 py-8", className)}>
      {/* Lottie Animation */}
      <div className="w-56 h-56 mb-6 flex items-center justify-center">
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop
            autoplay
            className="w-full h-full"
          />
        ) : (
          <div className="size-44 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 animate-pulse" />
        )}
      </div>

      {/* Greeting */}
      <h1 className="text-2xl font-semibold mb-2 text-center">
        How can {agentName}{" "}
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          help you today
        </span>
        ?
      </h1>

      {/* Description */}
      {agentDescription && (
        <p className="text-muted-foreground text-center max-w-md mb-8">
          {agentDescription}
        </p>
      )}

      {/* Suggestion Categories */}
      <div className="w-full max-w-lg space-y-4">
        {/* Category chips */}
        <SuggestionGroup className="justify-center">
          {SUGGESTION_CATEGORIES.map((category) => (
            <Suggestion
              key={category.id}
              icon={category.icon}
              label={category.label}
              active={expandedCategory === category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                expandedCategory === category.id && "ring-1 ring-ring"
              )}
            />
          ))}
        </SuggestionGroup>

        {/* Expanded suggestions */}
        {expandedCategoryData && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 px-1">
              <expandedCategoryData.icon className="size-4" />
              <span className="font-medium">{expandedCategoryData.label} suggestions</span>
              <ChevronDown className="size-4 ml-auto" />
            </div>
            <div className="space-y-2">
              {expandedCategoryData.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl",
                    "border border-border bg-background",
                    "hover:bg-muted hover:border-muted-foreground/30",
                    "transition-all duration-200 group cursor-pointer",
                    "flex items-center justify-between gap-3"
                  )}
                >
                  <span className="text-sm">{suggestion}</span>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hint when no category is expanded */}
        {!expandedCategory && (
          <p className="text-center text-sm text-muted-foreground/70">
            Click a category above to see suggestions, or type your own message
          </p>
        )}
      </div>
    </div>
  )
}
