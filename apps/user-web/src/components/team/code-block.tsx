"use client"

import { useEffect, useState } from "react"
import { codeToHtml } from "shiki"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = "plaintext", className }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function highlight() {
      try {
        const result = await codeToHtml(code, {
          lang: language,
          theme: "github-dark",
        })
        if (isMounted) {
          setHtml(result)
          setIsLoading(false)
        }
      } catch {
        // Fallback if language not supported
        if (isMounted) {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
          setIsLoading(false)
        }
      }
    }

    highlight()
    return () => { isMounted = false }
  }, [code, language])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("relative group rounded-lg overflow-hidden my-2 bg-[#24292e]", className)}>
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1f2428] text-xs text-gray-400">
        <span className="font-mono">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-gray-400 hover:text-white hover:bg-white/10"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      {isLoading ? (
        <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
          <code>{code}</code>
        </pre>
      ) : (
        <div
          className="p-4 text-sm overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
