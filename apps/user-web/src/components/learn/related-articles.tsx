"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface RelatedArticle {
  title: string
  href: string
  description?: string
}

interface RelatedArticlesProps {
  articles: RelatedArticle[]
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
      <div className="grid gap-3">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="group flex items-center justify-between p-4 rounded-lg border hover:border-sky-300 hover:bg-sky-50 transition-colors"
          >
            <div>
              <p className="font-medium group-hover:text-sky-700">{article.title}</p>
              {article.description && (
                <p className="text-sm text-muted-foreground">{article.description}</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-600 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}

