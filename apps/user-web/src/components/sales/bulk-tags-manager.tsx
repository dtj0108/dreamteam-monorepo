"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { LeadTag } from "@/components/sales/leads-filter-bar"

type TagAction = "add" | "remove" | "replace"

interface BulkTagsManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: LeadTag[]
  selectedCount: number
  onApply: (action: TagAction, tagIds: string[]) => Promise<void>
}

export function BulkTagsManager({
  open,
  onOpenChange,
  tags,
  selectedCount,
  onApply,
}: BulkTagsManagerProps) {
  const [action, setAction] = useState<TagAction>("add")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleApply = async () => {
    setIsLoading(true)
    try {
      await onApply(action, selectedTagIds)
      setSelectedTagIds([])
      setAction("add")
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedTagIds([])
    setAction("add")
    onOpenChange(false)
  }

  const getActionDescription = () => {
    switch (action) {
      case "add":
        return "Add the selected tags to all selected leads (existing tags are kept)."
      case "remove":
        return "Remove the selected tags from all selected leads."
      case "replace":
        return "Replace all tags on selected leads with only the selected tags."
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Update tags for {selectedCount} lead{selectedCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={action}
          onValueChange={(v) => {
            setAction(v as TagAction)
            setSelectedTagIds([])
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">Add</TabsTrigger>
            <TabsTrigger value="remove">Remove</TabsTrigger>
            <TabsTrigger value="replace">Replace</TabsTrigger>
          </TabsList>

          <TabsContent value={action} className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {getActionDescription()}
            </p>

            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={selectedTagIds.includes(tag.id)}
                    onCheckedChange={() => handleTagToggle(tag.id)}
                  />
                  <Label
                    htmlFor={`tag-${tag.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </Label>
                </div>
              ))}
            </div>

            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tags available. Create tags first.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              (action !== "replace" && selectedTagIds.length === 0) || isLoading
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
