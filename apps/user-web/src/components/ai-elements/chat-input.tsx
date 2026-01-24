"use client"

import { useState, useRef, useCallback, type FormEvent, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatStatus, FileUIPart } from "ai"
import {
  ArrowUp,
  Loader2,
  Square,
  X,
  Paperclip,
} from "lucide-react"
import { nanoid } from "nanoid"

export type ChatInputMessage = {
  text: string
  files: FileUIPart[]
}

type AttachmentFile = FileUIPart & { id: string }

export type ChatInputProps = {
  placeholder?: string
  status?: ChatStatus
  className?: string
  onSubmit: (message: ChatInputMessage, event: FormEvent<HTMLFormElement>) => void
}

export function ChatInput({
  placeholder = "Message...",
  status = "ready",
  className,
  onSubmit,
}: ChatInputProps) {
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoading = status === "submitted" || status === "streaming"

  const addFiles = useCallback((files: File[] | FileList) => {
    const incoming = Array.from(files)
    if (incoming.length === 0) return

    setAttachments((prev) =>
      prev.concat(
        incoming.map((file) => ({
          id: nanoid(),
          type: "file" as const,
          url: URL.createObjectURL(file),
          mediaType: file.type,
          filename: file.name,
        }))
      )
    )
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const found = prev.find((f) => f.id === id)
      if (found?.url) {
        URL.revokeObjectURL(found.url)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      for (const f of prev) {
        if (f.url) {
          URL.revokeObjectURL(f.url)
        }
      }
      return []
    })
  }, [])

  const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() && attachments.length === 0) return
    if (isLoading) return

    const text = input
    setInput("")

    const convertedFiles = await Promise.all(
      attachments.map(async ({ id, ...item }) => {
        if (item.url && item.url.startsWith("blob:")) {
          const dataUrl = await convertBlobUrlToDataUrl(item.url)
          return { ...item, url: dataUrl ?? item.url }
        }
        return item
      })
    )

    clearAttachments()
    onSubmit({ text, files: convertedFiles }, event)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (isComposing || e.nativeEvent.isComposing) return
      if (e.shiftKey) return
      e.preventDefault()
      if (isLoading) return
      e.currentTarget.form?.requestSubmit()
    }

    if (e.key === "Backspace" && e.currentTarget.value === "" && attachments.length > 0) {
      e.preventDefault()
      const lastAttachment = attachments.at(-1)
      if (lastAttachment) {
        removeAttachment(lastAttachment.id)
      }
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    if (files.length > 0) {
      event.preventDefault()
      addFiles(files)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      addFiles(event.currentTarget.files)
    }
    event.currentTarget.value = ""
  }

  // Determine button icon based on status
  const ButtonIcon = status === "submitted" ? Loader2 : status === "streaming" ? Square : ArrowUp

  return (
    <form onSubmit={handleSubmit} className={cn("w-full shrink-0", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={cn(
          "relative rounded-2xl border border-border bg-muted/30",
          "focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all"
        )}
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="group relative size-16 rounded-lg overflow-hidden border border-border bg-background"
              >
                {file.mediaType?.startsWith("image/") && file.url ? (
                  <img
                    src={file.url}
                    alt={file.filename || "attachment"}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-muted">
                    <Paperclip className="size-4 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  className="absolute top-0.5 right-0.5 size-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className={cn(
            "w-full resize-none border-none bg-transparent px-4 py-3 text-base outline-none",
            "min-h-[52px] max-h-[200px] field-sizing-content",
            "placeholder:text-muted-foreground/60 disabled:opacity-50"
          )}
        />

        {/* Bottom toolbar - inside the input */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {/* Attachment button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-5" />
            </Button>

            {/* Keyboard shortcut hint */}
            <span className="text-xs text-muted-foreground/60 ml-2 hidden sm:inline">
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to send
            </span>
          </div>

          {/* Submit button - black circular */}
          <Button
            type="submit"
            size="icon"
            className={cn(
              "size-8 rounded-full",
              "bg-foreground text-background hover:bg-foreground/90",
              "disabled:bg-muted-foreground/30 disabled:text-muted-foreground"
            )}
            disabled={(!input.trim() && attachments.length === 0) || status === "submitted"}
          >
            <ButtonIcon className={cn("size-4", status === "submitted" && "animate-spin")} />
          </Button>
        </div>
      </div>
    </form>
  )
}
