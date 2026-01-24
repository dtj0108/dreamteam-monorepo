"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import { useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

interface RichTextInputProps {
  placeholder?: string
  disabled?: boolean
  className?: string
  onSend?: (markdown: string) => void
  onChange?: (text: string) => void
  onTyping?: (isTyping: boolean) => void
}

export interface RichTextInputRef {
  editor: Editor | null
  focus: () => void
  clear: () => void
  insertText: (text: string) => void
  getMarkdown: () => string
  toggleBold: () => void
  toggleItalic: () => void
  toggleStrike: () => void
  toggleCode: () => void
  setLink: (url: string) => void
}

// Convert Tiptap JSON to Markdown
function editorToMarkdown(editor: Editor): string {
  const json = editor.getJSON()
  return jsonToMarkdown(json)
}

function jsonToMarkdown(node: Record<string, unknown>): string {
  if (!node) return ""

  const content = node.content as Record<string, unknown>[] | undefined

  if (node.type === "doc") {
    return (content || []).map(jsonToMarkdown).join("\n")
  }

  if (node.type === "paragraph") {
    const text = (content || []).map(jsonToMarkdown).join("")
    return text
  }

  if (node.type === "text") {
    let text = (node.text as string) || ""
    const marks = node.marks as { type: string; attrs?: Record<string, unknown> }[] | undefined

    if (marks) {
      for (const mark of marks) {
        switch (mark.type) {
          case "bold":
            text = `**${text}**`
            break
          case "italic":
            text = `_${text}_`
            break
          case "strike":
            text = `~~${text}~~`
            break
          case "code":
            text = `\`${text}\``
            break
          case "link":
            text = `[${text}](${mark.attrs?.href || ""})`
            break
        }
      }
    }
    return text
  }

  if (node.type === "hardBreak") {
    return "\n"
  }

  if (node.type === "codeBlock") {
    const lang = (node.attrs as Record<string, unknown>)?.language || ""
    const code = (content || []).map(jsonToMarkdown).join("")
    return `\`\`\`${lang}\n${code}\n\`\`\``
  }

  if (node.type === "bulletList") {
    return (content || [])
      .map((item) => `- ${jsonToMarkdown(item)}`)
      .join("\n")
  }

  if (node.type === "orderedList") {
    return (content || [])
      .map((item, i) => `${i + 1}. ${jsonToMarkdown(item)}`)
      .join("\n")
  }

  if (node.type === "listItem") {
    return (content || []).map(jsonToMarkdown).join("")
  }

  if (node.type === "blockquote") {
    return (content || [])
      .map((p) => `> ${jsonToMarkdown(p)}`)
      .join("\n")
  }

  return ""
}

export const RichTextInput = forwardRef<RichTextInputRef, RichTextInputProps>(
  function RichTextInput(
    { placeholder = "Type a message...", disabled, className, onSend, onChange, onTyping },
    ref
  ) {
    // Track if user clicked before editor was ready
    const pendingFocusRef = useRef(false)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable heading, horizontalRule - not needed for chat
          heading: false,
          horizontalRule: false,
          // All other extensions (bold, italic, strike, code, etc.) are enabled by default
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline",
          },
        }),
      ],
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm dark:prose-invert max-w-none",
            "outline-none focus:outline-none",
            // Style placeholder
            "[&.is-editor-empty]:before:content-[attr(data-placeholder)]",
            "[&.is-editor-empty]:before:text-muted-foreground",
            "[&.is-editor-empty]:before:float-left",
            "[&.is-editor-empty]:before:h-0",
            "[&.is-editor-empty]:before:pointer-events-none"
          ),
        },
        handleKeyDown: (view, event) => {
          // Enter to send (without shift)
          if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
            event.preventDefault()
            if (onSend && editor && !editor.isEmpty) {
              const markdown = editorToMarkdown(editor)
              if (markdown.trim()) {
                onSend(markdown.trim())
                editor.commands.clearContent()
              }
            }
            return true
          }
          return false
        },
      },
      onUpdate: ({ editor }) => {
        onChange?.(editor.getText())
        onTyping?.(true)
      },
      editable: !disabled,
    })

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      editor,
      focus: () => editor?.commands.focus(),
      clear: () => editor?.commands.clearContent(),
      insertText: (text: string) => editor?.commands.insertContent(text),
      getMarkdown: () => (editor ? editorToMarkdown(editor) : ""),
      toggleBold: () => editor?.chain().focus().toggleBold().run(),
      toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
      toggleStrike: () => editor?.chain().focus().toggleStrike().run(),
      toggleCode: () => editor?.chain().focus().toggleCode().run(),
      setLink: (url: string) => {
        if (url) {
          editor?.chain().focus().setLink({ href: url }).run()
        } else {
          editor?.chain().focus().unsetLink().run()
        }
      },
    }))

    // Update editable state when disabled changes
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled)
      }
    }, [editor, disabled])

    // Focus editor when it becomes available if user clicked during loading
    useEffect(() => {
      if (editor && pendingFocusRef.current) {
        pendingFocusRef.current = false
        editor.commands.focus()
      }
    }, [editor])

    // Show placeholder while editor initializes
    if (!editor) {
      return (
        <div
          data-slot="input-group-control"
          className={cn(
            "relative min-h-[44px] py-3 px-3 cursor-text pointer-events-auto",
            className
          )}
          onClick={() => {
            pendingFocusRef.current = true
          }}
        >
          <span className="text-muted-foreground">{placeholder}</span>
        </div>
      )
    }

    return (
      <div
        data-slot="input-group-control"
        className={cn("relative cursor-text pointer-events-auto", className)}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[44px] [&_.ProseMirror]:max-h-[200px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:py-3 [&_.ProseMirror]:px-3 [&_.ProseMirror]:pointer-events-auto"
        />
      </div>
    )
  }
)
