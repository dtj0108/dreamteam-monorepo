"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PageEditorProps {
  pageId: string
  initialTitle: string
  initialIcon: string | null
  initialContent: unknown
  onTitleChange: (title: string) => void
  onContentChange: (content: unknown) => void
}

export function PageEditor({
  pageId,
  initialTitle,
  initialIcon,
  initialContent,
  onTitleChange,
  onContentChange,
}: PageEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent: Array.isArray(initialContent) && initialContent.length > 0
      ? initialContent
      : undefined,
  })

  // Handle title change with debounce
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)

    // Debounce the save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      onTitleChange(newTitle)
    }, 1000)
  }

  // Handle content change with debounce
  const handleContentChange = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      const content = editor.document
      onContentChange(content)
    }, 1000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Reset editor when pageId changes
  useEffect(() => {
    setTitle(initialTitle)
    if (editor && Array.isArray(initialContent) && initialContent.length > 0) {
      editor.replaceBlocks(editor.document, initialContent as Parameters<typeof editor.replaceBlocks>[1])
    }
  }, [pageId])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 pb-32">
        {/* Page Icon & Title */}
        <div className="mb-8">
          <div className="flex items-start gap-3">
            <span className="text-4xl">{initialIcon || "📄"}</span>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              className={cn(
                "text-3xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto",
                "placeholder:text-muted-foreground/50"
              )}
            />
          </div>
        </div>

        {/* Block Editor */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <BlockNoteView
            editor={editor}
            onChange={handleContentChange}
            theme="light"
          />
        </div>
      </div>
    </div>
  )
}
