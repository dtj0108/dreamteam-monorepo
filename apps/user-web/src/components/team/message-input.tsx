"use client"

import {
  useState,
  useRef,
  KeyboardEvent,
  useEffect,
  useCallback,
  DragEvent,
  ClipboardEvent,
} from "react"
import {
  SendIcon,
  PaperclipIcon,
  AtSignIcon,
  Plus,
  Loader2,
} from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { FormattingToolbar, FormatType, getFormatSyntax } from "./formatting-toolbar"
import { AttachmentPreviewArea } from "./file-upload"
import { AutocompletePopup, type AutocompleteItem } from "./autocomplete-popup"
import { EmojiPicker } from "./emoji-picker"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useWorkspaceMembers } from "@/hooks/use-workspace-members"
import { type UploadedFile } from "@/types/files"

interface MessageInputProps {
  placeholder?: string
  onSend: (content: string, attachments?: UploadedFile[]) => void | Promise<void>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  className?: string
  currentUser?: {
    name: string
    avatar?: string
  }
  workspaceId: string
  channelId?: string
  dmConversationId?: string
}

export function MessageInput({
  placeholder = "Type a message...",
  onSend,
  onTyping,
  disabled = false,
  className,
  workspaceId,
  channelId,
  dmConversationId,
}: MessageInputProps) {
  const [content, setContent] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dragCounter = useRef(0)

  // Mention autocomplete state
  const [showMentionPopup, setShowMentionPopup] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)

  // Fetch workspace members for mention autocomplete
  const { members, filterByQuery } = useWorkspaceMembers(workspaceId)

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const {
    pendingAttachments,
    isUploading,
    addFiles,
    removeFile,
    retryUpload,
    uploadAll,
    clearAll,
  } = useFileUpload({
    workspaceId,
    channelId,
    dmConversationId,
    onError: (errorMsg) => {
      setError(errorMsg)
    },
  })

  const hasContent = content.trim().length > 0
  const hasAttachments = pendingAttachments.length > 0
  const canSend = (hasContent || hasAttachments) && !disabled && !isSending

  const handleSend = async () => {
    if (!canSend) return

    setIsSending(true)

    try {
      // Upload all pending files first
      let uploadedFiles: UploadedFile[] = []
      if (hasAttachments) {
        uploadedFiles = await uploadAll()
      }

      // Send message with attachments
      await onSend(content.trim(), uploadedFiles.length > 0 ? uploadedFiles : undefined)

      // Clear state on success
      setContent("")
      clearAll()
      setIsTyping(false)
      onTyping?.(false)
      textareaRef.current?.focus()
    } catch (err) {
      setError("Message could not be sent. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention popup navigation
    if (showMentionPopup && mentionItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionSelectedIndex((prev) => (prev + 1) % mentionItems.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionSelectedIndex((prev) => (prev - 1 + mentionItems.length) % mentionItems.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        handleMentionSelect(mentionItems[mentionSelectedIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        closeMentionPopup()
        return
      }
    }

    // Normal send behavior
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Get filtered members for mention popup
  const filteredMembers = filterByQuery(mentionQuery)
  const mentionItems: AutocompleteItem[] = filteredMembers.slice(0, 10).map((m) => ({
    id: m.profileId,
    label: m.displayName || m.name,
    sublabel: m.email,
    avatar: m.avatarUrl || undefined,
  }))

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (item: AutocompleteItem) => {
      if (mentionStartIndex === null) return

      const textarea = textareaRef.current
      const before = content.slice(0, mentionStartIndex)
      const after = content.slice(textarea?.selectionStart ?? content.length)

      // Insert the mention with the user's name
      const newContent = `${before}@${item.label} ${after}`
      setContent(newContent)

      // Close popup and reset state
      setShowMentionPopup(false)
      setMentionQuery("")
      setMentionStartIndex(null)
      setMentionSelectedIndex(0)

      // Focus textarea and set cursor after mention
      setTimeout(() => {
        textarea?.focus()
        const cursorPos = before.length + item.label.length + 2 // +2 for @ and space
        textarea?.setSelectionRange(cursorPos, cursorPos)
      }, 0)
    },
    [content, mentionStartIndex]
  )

  // Close mention popup
  const closeMentionPopup = useCallback(() => {
    setShowMentionPopup(false)
    setMentionQuery("")
    setMentionStartIndex(null)
    setMentionSelectedIndex(0)
  }, [])

  // Trigger mention popup (for @ button)
  const triggerMention = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const before = content.slice(0, cursorPos)
    const after = content.slice(cursorPos)

    // Insert @ at cursor position
    const newContent = `${before}@${after}`
    setContent(newContent)

    // Set mention state
    setMentionStartIndex(cursorPos)
    setMentionQuery("")
    setShowMentionPopup(true)
    setMentionSelectedIndex(0)

    // Focus and set cursor after @
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1)
    }, 0)
  }, [content])

  const handleChange = (value: string) => {
    setContent(value)

    // Detect @ mention
    const textarea = textareaRef.current
    const cursorPos = textarea?.selectionStart ?? value.length

    // Find the last @ before cursor
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      // Check if there's a space between @ and cursor (mention ended)
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      const hasSpace = textAfterAt.includes(" ")

      if (!hasSpace) {
        // We're in a mention
        setShowMentionPopup(true)
        setMentionStartIndex(lastAtIndex)
        setMentionQuery(textAfterAt)
        setMentionSelectedIndex(0)
      } else {
        // Mention ended
        closeMentionPopup()
      }
    } else {
      closeMentionPopup()
    }

    // Handle typing indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true)
      onTyping?.(true)
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      onTyping?.(false)
    }, 2000)
  }

  // File input change handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      // Reset input so same file can be selected again
      e.target.value = ""
    }
  }

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Paste handler for images
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      addFiles(files)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Handle formatting toolbar actions
  const handleFormat = useCallback(
    (format: FormatType) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const { prefix, suffix, placeholder } = getFormatSyntax(format)
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)

      // If text is selected, wrap it with the format syntax
      // Otherwise, insert the format with placeholder
      const textToWrap = selectedText || placeholder
      const newText =
        content.substring(0, start) +
        prefix +
        textToWrap +
        suffix +
        content.substring(end)

      setContent(newText)

      // Set cursor position after the operation
      setTimeout(() => {
        textarea.focus()
        if (selectedText) {
          // If text was selected, place cursor after the formatted text
          const newPos = start + prefix.length + textToWrap.length + suffix.length
          textarea.setSelectionRange(newPos, newPos)
        } else {
          // If no text was selected, select the placeholder
          const newStart = start + prefix.length
          const newEnd = newStart + placeholder.length
          textarea.setSelectionRange(newStart, newEnd)
        }
      }, 0)
    },
    [content]
  )

  // Handle emoji selection from picker
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current
      const cursorPos = textarea?.selectionStart ?? content.length
      const before = content.slice(0, cursorPos)
      const after = content.slice(cursorPos)
      setContent(`${before}${emoji}${after}`)

      // Refocus and position cursor after emoji
      setTimeout(() => {
        textarea?.focus()
        const newPos = cursorPos + emoji.length
        textarea?.setSelectionRange(newPos, newPos)
      }, 0)
    },
    [content]
  )

  return (
    <div
      className={cn("shrink-0 p-3 bg-background relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center">
          <div className="text-primary font-medium">Drop files here</div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-2 px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      <InputGroup
        className="rounded-xl focus-within:ring-0 focus-within:border-border"
        data-disabled={disabled || isSending}
      >
        {/* Formatting toolbar */}
        <InputGroupAddon align="block-start" className="border-b border-border/40">
          <FormattingToolbar onFormat={handleFormat} disabled={disabled || isSending} />
        </InputGroupAddon>

        {/* Attachment preview area */}
        {hasAttachments && (
          <AttachmentPreviewArea
            attachments={pendingAttachments}
            onRemove={removeFile}
            onRetry={retryUpload}
          />
        )}

        <div className="relative w-full">
          {/* Highlight overlay for styled @mentions */}
          <div
            className="absolute inset-0 py-3 px-3 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-sm"
            aria-hidden="true"
          >
            {content.split(/(@\w+(?:\s\w+)?)/g).map((part, i) =>
              part.startsWith("@") ? (
                <span key={i} className="bg-primary/20 rounded px-0.5 text-transparent">
                  {part}
                </span>
              ) : (
                <span key={i} className="text-transparent">{part}</span>
              )
            )}
            {/* Add placeholder spacing if empty */}
            {!content && <span className="text-transparent">{placeholder}</span>}
          </div>

          <InputGroupTextarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-h-[44px] max-h-[200px] py-3 px-3 bg-transparent"
            rows={1}
          />

          {/* Mention autocomplete popup */}
          {showMentionPopup && (
            <AutocompletePopup
              type="mention"
              items={mentionItems}
              selectedIndex={mentionSelectedIndex}
              onSelect={handleMentionSelect}
              onClose={closeMentionPopup}
              className="left-3"
            />
          )}
        </div>

        <InputGroupAddon align="block-end" className="border-t border-border/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="outline"
                className="rounded-full"
                size="icon-xs"
                onClick={openFilePicker}
                disabled={disabled || isSending}
              >
                <Plus className="size-4" />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Attach file
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                disabled={disabled || isSending}
                onClick={triggerMention}
              >
                <AtSignIcon className="size-4" />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Mention someone
            </TooltipContent>
          </Tooltip>

          <EmojiPicker onSelect={handleEmojiSelect} align="end" />

          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                onClick={openFilePicker}
                disabled={disabled || isSending}
              >
                <PaperclipIcon className="size-4" />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Attach file
            </TooltipContent>
          </Tooltip>

          <div className="ml-auto" />

          <Separator orientation="vertical" className="!h-4" />

          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="default"
                className="rounded-full"
                size="icon-xs"
                onClick={handleSend}
                disabled={!canSend}
              >
                {isSending || isUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <SendIcon className="size-3.5" />
                )}
                <span className="sr-only">Send</span>
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isSending || isUploading ? "Sending..." : "Send message"}
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
