"use client"

import { cn } from "@/lib/utils"

interface ArticleSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ArticleSection({ title, children, className }: ArticleSectionProps) {
  return (
    <section className={cn("mb-8", className)}>
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  )
}

