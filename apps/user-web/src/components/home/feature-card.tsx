"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FeatureCardProps {
  emoji: string
  title: string
  description: string
  href: string
  className?: string
}

export function FeatureCard({
  emoji,
  title,
  description,
  href,
  className,
}: FeatureCardProps) {
  return (
    <Link href={href} className={cn("block h-full", className)}>
      <Card className="group h-full hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer">
        <div className="p-4 h-full flex flex-col">
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform duration-200">
            <span className="text-xl">{emoji}</span>
          </div>
          <h3 className="text-base font-semibold mb-0.5">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">
            {description}
          </p>
          <div className="flex items-center text-xs text-primary font-medium mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span>Explore</span>
            <ArrowRight className="ml-1 size-3.5" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
