"use client"

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, PenTool, Clock, Star } from "lucide-react"
import { useDemoKnowledge } from "@/providers/demo-provider"
import { formatDistanceToNow, format } from "date-fns"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DemoWhiteboardViewPage({ params }: PageProps) {
  const { id } = use(params)
  const { getWhiteboardById, user } = useDemoKnowledge()

  const whiteboard = getWhiteboardById(id)

  if (!whiteboard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold mb-2">Whiteboard not found</h2>
        <p className="text-muted-foreground mb-4">
          This whiteboard may have been deleted or doesn&apos;t exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/demo/knowledge/whiteboards">
            <ArrowLeft className="size-4 mr-2" />
            Back to Whiteboards
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Whiteboard Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/demo/knowledge/whiteboards">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-2xl shrink-0">{whiteboard.icon}</span>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{whiteboard.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                Updated {formatDistanceToNow(new Date(whiteboard.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {whiteboard.isFavorite && (
            <Star className="size-5 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      </div>

      {/* Whiteboard Canvas Area */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="flex flex-col items-center text-center py-12">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <PenTool className="size-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{whiteboard.title}</h2>
            <p className="text-muted-foreground mb-4">
              This is a demo whiteboard. In the full version, you&apos;d see an
              interactive canvas for drawing, diagramming, and visual collaboration.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Created by {user.name}</p>
              <p>Created {format(new Date(whiteboard.createdAt), "MMMM d, yyyy")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
