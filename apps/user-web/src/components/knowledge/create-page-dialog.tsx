"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, LayoutTemplate, PenTool } from "lucide-react"
import type { KnowledgeTemplate } from "@/providers/knowledge-provider"

interface CreatePageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: KnowledgeTemplate[]
  onCreatePage: (input: { title?: string; templateId?: string }) => Promise<{ id: string } | null>
  onSwitchToWhiteboard?: () => void
}

export function CreatePageDialog({
  open,
  onOpenChange,
  templates,
  onCreatePage,
  onSwitchToWhiteboard,
}: CreatePageDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const page = await onCreatePage({
        title: title || undefined,
        templateId: selectedTemplate || undefined,
      })
      if (page) {
        setTitle("")
        setSelectedTemplate(null)
        router.push(`/knowledge/${page.id}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setSelectedTemplate(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
          <DialogDescription>
            Start with a blank page or choose a template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Page Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Page Title (optional)</Label>
            <Input
              id="title"
              placeholder="Untitled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Start From</Label>
            <ScrollArea className="h-48 rounded-md border p-2">
              <div className="space-y-1">
                {/* Blank Page Option */}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                    selectedTemplate === null
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="size-8 rounded bg-muted flex items-center justify-center">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Blank Page</div>
                    <div className="text-xs text-muted-foreground">
                      Start with an empty page
                    </div>
                  </div>
                </button>

                {/* Templates */}
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                      selectedTemplate === template.id
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="size-8 rounded bg-muted flex items-center justify-center text-lg">
                      {template.icon || "📄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {template.description || template.category}
                      </div>
                    </div>
                    {template.isSystem && (
                      <span className="text-xs text-muted-foreground">
                        <LayoutTemplate className="size-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Switch to Whiteboard */}
        {onSwitchToWhiteboard && (
          <div className="border-t pt-4">
            <button
              onClick={onSwitchToWhiteboard}
              className="w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-accent"
            >
              <div className="size-8 rounded bg-muted flex items-center justify-center">
                <PenTool className="size-4" />
              </div>
              <div>
                <div className="font-medium text-sm">New Whiteboard</div>
                <div className="text-xs text-muted-foreground">
                  Create a canvas to draw and diagram
                </div>
              </div>
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
