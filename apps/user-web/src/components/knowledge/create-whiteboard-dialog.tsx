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
import { PenTool } from "lucide-react"

interface CreateWhiteboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateWhiteboard: (input: { title?: string; icon?: string }) => Promise<{ id: string } | null>
}

export function CreateWhiteboardDialog({
  open,
  onOpenChange,
  onCreateWhiteboard,
}: CreateWhiteboardDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const whiteboard = await onCreateWhiteboard({
        title: title || undefined,
      })
      if (whiteboard) {
        setTitle("")
        router.push(`/knowledge/whiteboards/${whiteboard.id}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      e.preventDefault()
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="size-5" />
            Create New Whiteboard
          </DialogTitle>
          <DialogDescription>
            Create a blank canvas to draw, diagram, and brainstorm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="whiteboard-title">Whiteboard Title (optional)</Label>
            <Input
              id="whiteboard-title"
              placeholder="Untitled Whiteboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Whiteboard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
