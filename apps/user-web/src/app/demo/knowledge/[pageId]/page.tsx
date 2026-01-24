"use client"

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star, ArrowLeft, Clock, User } from "lucide-react"
import { useDemoKnowledge } from "@/providers/demo-provider"
import { formatDistanceToNow, format } from "date-fns"

interface PageProps {
  params: Promise<{ pageId: string }>
}

export default function DemoKnowledgePageView({ params }: PageProps) {
  const { pageId } = use(params)
  const { getPageById, folders, user } = useDemoKnowledge()

  const page = getPageById(pageId)

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-4">
          This page may have been deleted or doesn&apos;t exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/demo/knowledge">
            <ArrowLeft className="size-4 mr-2" />
            Back to Knowledge
          </Link>
        </Button>
      </div>
    )
  }

  // Get folder/category info
  const folder = page.folderId ? folders.find(f => f.id === page.folderId) : null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/demo/knowledge">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-2xl shrink-0">{page.icon || "📄"}</span>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{page.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
              </span>
              {folder && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${folder.color}20`,
                    color: folder.color,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page.isFavorite && (
            <Star className="size-5 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      </div>

      {/* Page Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6">
          {/* Page Content */}
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent p-0 border-0">
              {page.content}
            </pre>
          </div>

          {/* Page Metadata */}
          <div className="mt-12 pt-6 border-t">
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <User className="size-3" />
                <span>Created by {user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3" />
                <span>Created {format(new Date(page.createdAt), "MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3" />
                <span>Last updated {format(new Date(page.updatedAt), "MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
