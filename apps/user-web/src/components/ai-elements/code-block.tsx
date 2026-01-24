"use client"

import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"
import React, { useEffect, useState, useCallback } from "react"
import { codeToHtml } from "shiki"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border",
        "border-border bg-card text-card-foreground rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockHeaderProps = {
  language?: string
  onCopy?: () => void
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockHeader({
  language,
  onCopy,
  className,
  children,
  ...props
}: CodeBlockHeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    onCopy?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [onCopy])

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50",
        className
      )}
      {...props}
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {language || children}
      </span>
      {onCopy && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  theme = "github-dark",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>")
        return
      }

      try {
        const html = await codeToHtml(code, { lang: language, theme })
        setHighlightedHtml(html)
      } catch {
        // Fallback to plain code if language is not supported
        setHighlightedHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
      }
    }
    highlight()
  }, [code, language, theme])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4 [&>pre]:min-w-full [&>pre]:bg-transparent",
    className
  )

  // SSR fallback: render plain code if not hydrated yet
  // Note: Using dangerouslySetInnerHTML is safe here because Shiki's codeToHtml
  // produces trusted HTML output from code strings (not user-generated HTML)
  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Helper function to escape HTML for fallback rendering
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export { CodeBlock, CodeBlockHeader, CodeBlockCode, CodeBlockGroup }
