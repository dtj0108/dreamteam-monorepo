"use client"

import { Clock } from "lucide-react"

interface ArticleHeaderProps {
  title: string
  description: string
  readTime?: string
}

export function ArticleHeader({ title, description, readTime = "5 min read" }: ArticleHeaderProps) {
  return (
    <div className="mb-8 border-b pb-6">
      <h1 className="text-3xl font-bold tracking-tight mb-3">{title}</h1>
      <p className="text-lg text-muted-foreground mb-4">{description}</p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{readTime}</span>
      </div>
    </div>
  )
}

