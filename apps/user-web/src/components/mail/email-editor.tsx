"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback } from "react"
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
  Code,
  Eye,
  Monitor,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
    const [mode, setMode] = useState<"visual" | "html" | "preview">("visual")
    const [htmlContent, setHtmlContent] = useState(initialContent || "")
    const [htmlError, setHtmlError] = useState<string | null>(null)
    const [showComplexHtmlWarning, setShowComplexHtmlWarning] = useState(false)
    const [previewHeight, setPreviewHeight] = useState(200)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // Auto-resize iframe to fit content
    const handleIframeLoad = useCallback(() => {
      const iframe = iframeRef.current
      if (iframe?.contentDocument?.body) {
        const height = iframe.contentDocument.body.scrollHeight
        setPreviewHeight(Math.max(200, height + 32)) // Add padding
      }
    }, [])

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
      getHTML: () => (mode === "html" || mode === "preview") ? htmlContent : (editor?.getHTML() || ""),
      setContent: (html: string) => {
        setHtmlContent(html)
        editor?.commands.setContent(html)
      },
      clear: () => {
        setHtmlContent("")
        editor?.commands.clearContent()
      },
      focus: () => editor?.commands.focus(),
    }), [mode, htmlContent, editor])

    useEffect(() => {
      if (editor && initialContent) {
        editor.commands.setContent(initialContent)
        setHtmlContent(initialContent)
      }
    }, [editor, initialContent])

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled)
      }
    }, [editor, disabled])

    // Detect if HTML contains complex elements that TipTap can't handle well
    const hasComplexHtml = (html: string) => {
      const complexPatterns = [
        /<table/i,
        /<img/i,
        /<style/i,
        /style\s*=\s*["'][^"']*(?:background|color|padding|margin|border|width|height|display|flex)/i,
        /<button/i,
        /<div[^>]+style/i,
      ]
      return complexPatterns.some(pattern => pattern.test(html))
    }

    const handleModeChange = (newMode: string) => {
      const previousMode = mode

      // Capture content when leaving visual mode
      if (previousMode === "visual" && newMode !== "visual") {
        setHtmlContent(editor?.getHTML() || "")
        setHtmlError(null)
      }

      // Switching to visual mode needs special handling
      if (newMode === "visual" && previousMode !== "visual") {
        // Check for complex HTML that might be damaged
        if (hasComplexHtml(htmlContent)) {
          setShowComplexHtmlWarning(true)
          return
        }
        switchToVisualMode()
        return
      }

      setMode(newMode as "visual" | "html" | "preview")
    }

    const switchToVisualMode = () => {
      try {
        editor?.commands.setContent(htmlContent)
        setHtmlError(null)
        setShowComplexHtmlWarning(false)
        setMode("visual")
      } catch (e) {
        setHtmlError("Invalid HTML - please check your markup")
      }
    }

    const cancelModeSwitch = () => {
      setShowComplexHtmlWarning(false)
    }

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
        <Tabs value={mode} onValueChange={handleModeChange} className="flex flex-col gap-0">
          {/* Header with mode toggle and toolbar */}
          <div className="border-b px-2 py-1.5 flex items-center gap-2 bg-muted/30">
            <TabsList className="h-7">
              <TabsTrigger value="visual" className="h-6 px-2 text-xs gap-1">
                <Eye className="h-3 w-3" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="html" className="h-6 px-2 text-xs gap-1">
                <Code className="h-3 w-3" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-6 px-2 text-xs gap-1">
                <Monitor className="h-3 w-3" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Toolbar - only in visual mode */}
            {mode === "visual" && (
              <>
                <div className="w-px h-5 bg-border" />

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

                <div className="w-px h-5 bg-border mx-0.5" />

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

                <div className="w-px h-5 bg-border mx-0.5" />

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
              </>
            )}
          </div>

          {/* Visual Editor */}
          <TabsContent value="visual" className="mt-0">
            <EditorContent
              editor={editor}
              className="[&_.ProseMirror]:outline-none"
            />
          </TabsContent>

          {/* HTML Editor */}
          <TabsContent value="html" className="mt-0">
            <div className="relative">
              <Textarea
                className="w-full min-h-[200px] p-4 font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                value={htmlContent}
                onChange={(e) => {
                  setHtmlContent(e.target.value)
                  setHtmlError(null)
                }}
                placeholder="Paste your HTML here..."
                disabled={disabled}
              />
              {htmlError && (
                <p className="text-destructive text-sm px-4 py-2 border-t bg-destructive/5">
                  {htmlError}
                </p>
              )}
            </div>
          </TabsContent>

          {/* Preview Mode */}
          <TabsContent value="preview" className="mt-0">
            <div className="min-h-[200px] bg-white">
              {htmlContent ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                          body {
                            margin: 0;
                            padding: 16px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            font-size: 14px;
                            line-height: 1.5;
                            color: #333;
                          }
                        </style>
                      </head>
                      <body>${htmlContent}</body>
                    </html>
                  `}
                  className="w-full border-0"
                  style={{ height: previewHeight }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  onLoad={handleIframeLoad}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                  No content to preview
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Warning dialog for complex HTML */}
        <AlertDialog open={showComplexHtmlWarning} onOpenChange={setShowComplexHtmlWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complex HTML Detected</AlertDialogTitle>
              <AlertDialogDescription>
                Your HTML contains tables, images, or advanced styling that may not display correctly in Visual mode.
                Some formatting may be lost or simplified. For complex email templates, we recommend staying in HTML mode.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelModeSwitch}>Stay in HTML</AlertDialogCancel>
              <AlertDialogAction onClick={switchToVisualMode}>Switch Anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
