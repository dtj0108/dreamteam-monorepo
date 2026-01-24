"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import { forwardRef, useImperativeHandle, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export interface EmailEditorRef {
  getHTML: () => string
  setContent: (html: string) => void
  clear: () => void
  focus: () => void
}

interface EmailEditorProps {
  placeholder?: string
  initialContent?: string
  className?: string
  disabled?: boolean
}

export const EmailEditor = forwardRef<EmailEditorRef, EmailEditorProps>(
  function EmailEditor({ placeholder = "Write your message...", initialContent, className, disabled }, ref) {
    const [linkUrl, setLinkUrl] = useState("")
    const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          horizontalRule: false,
          codeBlock: false,
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline cursor-pointer",
          },
        }),
      ],
      content: initialContent || "",
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm dark:prose-invert max-w-none",
            "outline-none focus:outline-none",
            "min-h-[200px] px-4 py-3",
            "[&.is-editor-empty]:before:content-[attr(data-placeholder)]",
            "[&.is-editor-empty]:before:text-muted-foreground",
            "[&.is-editor-empty]:before:float-left",
            "[&.is-editor-empty]:before:h-0",
            "[&.is-editor-empty]:before:pointer-events-none"
          ),
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      setContent: (html: string) => editor?.commands.setContent(html),
      clear: () => editor?.commands.clearContent(),
      focus: () => editor?.commands.focus(),
    }))

    useEffect(() => {
      if (editor && initialContent) {
        editor.commands.setContent(initialContent)
      }
    }, [editor, initialContent])

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled)
      }
    }, [editor, disabled])

    const addLink = () => {
      if (linkUrl && editor) {
        editor.chain().focus().setLink({ href: linkUrl }).run()
        setLinkUrl("")
        setLinkPopoverOpen(false)
      }
    }

    const removeLink = () => {
      if (editor) {
        editor.chain().focus().unsetLink().run()
        setLinkPopoverOpen(false)
      }
    }

    if (!editor) {
      return (
        <div className={cn("border rounded-lg bg-background", className)}>
          <div className="border-b px-2 py-1.5 flex items-center gap-0.5">
            {/* Skeleton toolbar */}
            <div className="h-7 w-7 bg-muted rounded animate-pulse" />
            <div className="h-7 w-7 bg-muted rounded animate-pulse" />
            <div className="h-7 w-7 bg-muted rounded animate-pulse" />
          </div>
          <div className="min-h-[200px] px-4 py-3">
            <span className="text-muted-foreground">{placeholder}</span>
          </div>
        </div>
      )
    }

    return (
      <div className={cn("border rounded-lg bg-background overflow-hidden", className)}>
        {/* Toolbar */}
        <div className="border-b px-2 py-1.5 flex items-center gap-0.5 bg-muted/30">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            disabled={disabled}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            disabled={disabled}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            disabled={disabled}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  editor.isActive("link")
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  disabled && "opacity-50 pointer-events-none"
                )}
                title="Link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addLink()
                      }
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  {editor.isActive("link") && (
                    <Button variant="ghost" size="sm" onClick={removeLink}>
                      Remove link
                    </Button>
                  )}
                  <Button size="sm" onClick={addLink} className="ml-auto">
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            disabled={disabled}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            disabled={disabled}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Editor */}
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:outline-none"
        />
      </div>
    )
  }
)

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-7 w-7 rounded flex items-center justify-center transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {children}
    </button>
  )
}
