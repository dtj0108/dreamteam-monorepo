"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BookOpen } from "lucide-react"
import { learnSections } from "@/components/learn/learn-catalog"

function isTopicActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function LearnSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 overflow-y-auto border-r bg-muted/30">
      <div className="p-4 border-b">
        <Link href="/learn" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5 text-sky-600" />
          <span>Learning Center</span>
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-4">
          {learnSections.map((section) => {
            const sectionActive = section.topics.some((topic) => isTopicActive(pathname, topic.href))

            return (
              <li key={section.id} className="space-y-1">
                <div
                  className={cn(
                    "px-2 pb-1 text-xs font-semibold uppercase tracking-wide",
                    sectionActive ? "text-sky-700" : "text-muted-foreground"
                  )}
                >
                  <span className="mr-1">{section.emoji}</span>
                  {section.title}
                </div>
                <ul className="space-y-1">
                  {section.topics.map((topic) => {
                    const active = isTopicActive(pathname, topic.href)
                    return (
                      <li key={topic.href}>
                        <Link
                          href={topic.href}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-sky-100 font-medium text-sky-700"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                          <span>{topic.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
