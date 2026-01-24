"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Star, Clock, PenTool, Search, ArrowRight } from "lucide-react"
import { useDemoKnowledge } from "@/providers/demo-provider"
import { formatDistanceToNow } from "date-fns"

export default function DemoKnowledgePage() {
  const { pages, favoritePages, recentPages, whiteboards } = useDemoKnowledge()

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome to Knowledge</h1>
          <p className="text-muted-foreground">
            Your team&apos;s documentation, wikis, and knowledge base in one place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/demo/knowledge/search">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Search className="size-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Search</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/demo/knowledge/all">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <FileText className="size-5 text-primary" />
                </div>
                <span className="text-sm font-medium">All Pages</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/demo/knowledge/whiteboards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <PenTool className="size-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Whiteboards</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/demo/knowledge/all?filter=favorites">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
                  <Star className="size-5 text-yellow-500" />
                </div>
                <span className="text-sm font-medium">Favorites</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Pages */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Recent Pages
            </h2>
            <Link
              href="/demo/knowledge/all"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentPages.slice(0, 5).map((page) => (
              <Link
                key={page.id}
                href={`/demo/knowledge/${page.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <span className="text-xl shrink-0">{page.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{page.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                  </div>
                </div>
                {page.isFavorite && (
                  <Star className="size-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Favorites */}
        {favoritePages.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="size-4 text-yellow-500" />
                Favorites
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {favoritePages.slice(0, 6).map((page) => (
                <Link
                  key={page.id}
                  href={`/demo/knowledge/${page.id}`}
                  className="group"
                >
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                    <CardContent className="p-4">
                      <div className="text-2xl mb-2">{page.icon || "📄"}</div>
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {page.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Whiteboards */}
        {whiteboards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <PenTool className="size-4 text-muted-foreground" />
                Whiteboards
              </h2>
              <Link
                href="/demo/knowledge/whiteboards"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {whiteboards.slice(0, 3).map((whiteboard) => (
                <Link
                  key={whiteboard.id}
                  href={`/demo/knowledge/whiteboards/${whiteboard.id}`}
                  className="group"
                >
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                    <CardContent className="p-4">
                      <div className="aspect-video rounded-md bg-muted mb-3 flex items-center justify-center overflow-hidden">
                        {whiteboard.thumbnail ? (
                          <img
                            src={whiteboard.thumbnail}
                            alt={whiteboard.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PenTool className="size-8 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{whiteboard.icon}</span>
                        <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                          {whiteboard.title}
                        </h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
