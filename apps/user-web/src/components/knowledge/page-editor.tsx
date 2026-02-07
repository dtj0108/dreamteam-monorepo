"use client"

import { Component, useCallback, useEffect, useRef, useState } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Error boundary to catch BlockNote/ProseMirror render crashes (e.g. table RangeError)
interface EditorErrorBoundaryProps {
  children: ReactNode
  onReset: () => void
}

interface EditorErrorBoundaryState {
  hasError: boolean
}

class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PageEditor] Editor crashed:", error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false })
    this.props.onReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">Something went wrong with the editor.</p>
          <Button variant="outline" onClick={this.reset}>
            Reload editor
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  const [editorKey, setEditorKey] = useState(0)
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
      try {
        editor.replaceBlocks(editor.document, initialContent as Parameters<typeof editor.replaceBlocks>[1])
      } catch (err) {
        console.error("[PageEditor] Failed to replace blocks, content may be corrupted:", err)
      }
    }
  }, [pageId])

  const handleEditorReset = useCallback(() => {
    setEditorKey((k) => k + 1)
  }, [])

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
          <EditorErrorBoundary key={editorKey} onReset={handleEditorReset}>
            <BlockNoteView
              editor={editor}
              onChange={handleContentChange}
              theme="light"
            />
          </EditorErrorBoundary>
        </div>
      </div>
    </div>
  )
}
