"use client"

import { useState } from "react"
import { KnowledgeProvider, useKnowledge } from "@/providers/knowledge-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  FileText,
  Palette,
  Loader2,
  Check,
  Link as LinkIcon,
} from "lucide-react"

interface AttachKnowledgeDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedPageIds: string[]
  linkedWhiteboardIds: string[]
  onAttach: () => void
}

export function AttachKnowledgeDialog(props: AttachKnowledgeDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <KnowledgeProvider>
        <AttachKnowledgeDialogContent {...props} />
      </KnowledgeProvider>
    </Dialog>
  )
}

function AttachKnowledgeDialogContent({
  projectId,
  open,
  onOpenChange,
  linkedPageIds,
  linkedWhiteboardIds,
  onAttach,
}: AttachKnowledgeDialogProps) {
  const { pages, whiteboards, isLoading } = useKnowledge()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [selectedWhiteboards, setSelectedWhiteboards] = useState<string[]>([])
  const [attaching, setAttaching] = useState(false)

  // Filter out archived items and apply search
  const availablePages = pages.filter(
    (page) =>
      !page.isArchived &&
      !page.isTemplate &&
      page.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const availableWhiteboards = whiteboards.filter(
    (wb) =>
      !wb.isArchived &&
      wb.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const togglePage = (pageId: string) => {
    if (linkedPageIds.includes(pageId)) return
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    )
  }

  const toggleWhiteboard = (whiteboardId: string) => {
    if (linkedWhiteboardIds.includes(whiteboardId)) return
    setSelectedWhiteboards((prev) =>
      prev.includes(whiteboardId)
        ? prev.filter((id) => id !== whiteboardId)
        : [...prev, whiteboardId]
    )
  }

  const handleAttach = async () => {
    if (selectedPages.length === 0 && selectedWhiteboards.length === 0) return

    setAttaching(true)
    try {
      // Attach pages
      for (const pageId of selectedPages) {
        await fetch(`/api/projects/${projectId}/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "page", itemId: pageId }),
        })
      }

      // Attach whiteboards
      for (const whiteboardId of selectedWhiteboards) {
        await fetch(`/api/projects/${projectId}/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "whiteboard", itemId: whiteboardId }),
        })
      }

      onAttach()
      onOpenChange(false)
      setSelectedPages([])
      setSelectedWhiteboards([])
      setSearchQuery("")
    } catch (error) {
      console.error("Failed to attach knowledge:", error)
    } finally {
      setAttaching(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedPages([])
    setSelectedWhiteboards([])
    setSearchQuery("")
  }

  const totalSelected = selectedPages.length + selectedWhiteboards.length

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Attach Knowledge</DialogTitle>
        <DialogDescription>
          Link existing documentation, SOPs, or whiteboards to this project.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pages">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pages" className="gap-2">
                <FileText className="h-4 w-4" />
                Pages ({availablePages.length})
              </TabsTrigger>
              <TabsTrigger value="whiteboards" className="gap-2">
                <Palette className="h-4 w-4" />
                Whiteboards ({availableWhiteboards.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pages" className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availablePages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pages found
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {availablePages.map((page) => {
                      const isLinked = linkedPageIds.includes(page.id)
                      const isSelected = selectedPages.includes(page.id)

                      return (
                        <div
                          key={page.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isLinked
                              ? "bg-muted/50 cursor-not-allowed opacity-60"
                              : isSelected
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => togglePage(page.id)}
                        >
                          <Checkbox
                            checked={isLinked || isSelected}
                            disabled={isLinked}
                            className={isLinked ? "opacity-50" : ""}
                          />
                          <span className="text-xl">{page.icon || "📄"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{page.title}</p>
                            {page.categories.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                {page.categories.map((c) => c.name).join(", ")}
                              </p>
                            )}
                          </div>
                          {isLinked && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <LinkIcon className="h-3 w-3" />
                              Linked
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="whiteboards" className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableWhiteboards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No whiteboards found
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {availableWhiteboards.map((whiteboard) => {
                      const isLinked = linkedWhiteboardIds.includes(whiteboard.id)
                      const isSelected = selectedWhiteboards.includes(whiteboard.id)

                      return (
                        <div
                          key={whiteboard.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isLinked
                              ? "bg-muted/50 cursor-not-allowed opacity-60"
                              : isSelected
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => toggleWhiteboard(whiteboard.id)}
                        >
                          <Checkbox
                            checked={isLinked || isSelected}
                            disabled={isLinked}
                            className={isLinked ? "opacity-50" : ""}
                          />
                          <span className="text-xl">{whiteboard.icon || "🎨"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{whiteboard.title}</p>
                          </div>
                          {isLinked && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <LinkIcon className="h-3 w-3" />
                              Linked
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
        </Tabs>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleAttach}
          disabled={totalSelected === 0 || attaching}
        >
          {attaching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Attach {totalSelected > 0 ? `(${totalSelected})` : ""}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
