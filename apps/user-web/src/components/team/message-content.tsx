"use client"

import { Fragment, ReactNode } from "react"
import { CodeBlock } from "./code-block"

interface MessageContentProps {
  content: string
  className?: string
}

// Parse code blocks first (they take priority)
function extractCodeBlocks(content: string): { parts: (string | { type: "code"; language: string; code: string })[] } {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  const parts: (string | { type: "code"; language: string; code: string })[] = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    // Add code block
    parts.push({
      type: "code",
      language: match[1] || "plaintext",
      code: match[2].trim(),
    })
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return { parts }
}

// Parse inline formatting
function parseInlineFormatting(text: string): ReactNode[] {
  // Global key counter to ensure unique keys across all patterns
  let keyCounter = 0
  const getKey = (prefix: string) => `${prefix}-${keyCounter++}`

  // Combined regex for all inline patterns
  // Order matters: longer/more specific patterns first
  const patterns = [
    // Inline code (highest priority for inline)
    { name: "code", regex: /`([^`]+)`/g, render: (match: string, p1: string, key: string) => (
      <code key={key} className="bg-muted px-1.5 py-0.5 rounded text-[0.9em] font-mono">
        {p1}
      </code>
    )},
    // Bold with **
    { name: "bold2", regex: /\*\*([^*]+)\*\*/g, render: (match: string, p1: string, key: string) => (
      <strong key={key} className="font-semibold">{p1}</strong>
    )},
    // Bold with single * (Slack-style)
    { name: "bold1", regex: /(?<![*\w])\*([^*]+)\*(?![*\w])/g, render: (match: string, p1: string, key: string) => (
      <strong key={key} className="font-semibold">{p1}</strong>
    )},
    // Italic with _
    { name: "italic", regex: /(?<![_\w])_([^_]+)_(?![_\w])/g, render: (match: string, p1: string, key: string) => (
      <em key={key}>{p1}</em>
    )},
    // Strikethrough with ~~
    { name: "strike", regex: /~~([^~]+)~~/g, render: (match: string, p1: string, key: string) => (
      <del key={key} className="text-muted-foreground">{p1}</del>
    )},
    // @mentions
    { name: "mention", regex: /@(\w+(?:\s\w+)?)/g, render: (match: string, p1: string, key: string) => (
      <span key={key} className="bg-primary/10 text-primary px-1 rounded font-medium cursor-pointer hover:bg-primary/20">
        @{p1}
      </span>
    )},
    // #channels
    { name: "channel", regex: /#([\w-]+)/g, render: (match: string, p1: string, key: string) => (
      <span key={key} className="bg-primary/10 text-primary px-1 rounded font-medium cursor-pointer hover:bg-primary/20">
        #{p1}
      </span>
    )},
    // URLs
    { name: "url", regex: /(https?:\/\/[^\s<]+[^\s<.,;:!?"'\])>])/g, render: (match: string, p1: string, key: string) => (
      <a
        key={key}
        href={p1}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {p1}
      </a>
    )},
  ]

  // Process text with all patterns
  let result: (string | ReactNode)[] = [text]

  for (const { name, regex, render } of patterns) {
    const newResult: (string | ReactNode)[] = []

    for (const part of result) {
      if (typeof part !== "string") {
        newResult.push(part)
        continue
      }

      let lastIndex = 0
      let match
      // Reset regex lastIndex
      regex.lastIndex = 0

      while ((match = regex.exec(part)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          newResult.push(part.slice(lastIndex, match.index))
        }
        // Add rendered element with unique key
        newResult.push(render(match[0], match[1], getKey(name)))
        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      if (lastIndex < part.length) {
        newResult.push(part.slice(lastIndex))
      } else if (lastIndex === 0) {
        newResult.push(part)
      }
    }

    result = newResult
  }

  // Generate unique keys for remaining string fragments
  return result.map((part) =>
    typeof part === "string" ? <Fragment key={getKey("text")}>{part}</Fragment> : part
  )
}

// Parse a line for block-level formatting
function parseLine(line: string, index: number): ReactNode {
  // Headers (h1-h6)
  const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
  if (headerMatch) {
    const level = headerMatch[1].length
    const text = headerMatch[2]
    const styles: Record<number, string> = {
      1: "text-2xl font-bold mt-4 mb-2",
      2: "text-xl font-bold mt-3 mb-2",
      3: "text-lg font-semibold mt-3 mb-1",
      4: "text-base font-semibold mt-2 mb-1",
      5: "text-sm font-semibold mt-2 mb-1",
      6: "text-sm font-medium mt-1 mb-1",
    }
    return (
      <div key={index} className={styles[level] || styles[3]}>
        {parseInlineFormatting(text)}
      </div>
    )
  }

  // Blockquote
  if (line.startsWith("> ")) {
    return (
      <blockquote key={index} className="border-l-4 border-muted-foreground/30 pl-3 text-muted-foreground italic">
        {parseInlineFormatting(line.slice(2))}
      </blockquote>
    )
  }

  // Bullet list
  if (line.match(/^[-*]\s/)) {
    return (
      <li key={index} className="ml-4 list-disc">
        {parseInlineFormatting(line.slice(2))}
      </li>
    )
  }

  // Numbered list
  const numberedMatch = line.match(/^(\d+)\.\s/)
  if (numberedMatch) {
    return (
      <li key={index} className="ml-4 list-decimal">
        {parseInlineFormatting(line.slice(numberedMatch[0].length))}
      </li>
    )
  }

  // Regular line
  return (
    <span key={index}>
      {parseInlineFormatting(line)}
    </span>
  )
}

export function MessageContent({ content, className }: MessageContentProps) {
  const { parts } = extractCodeBlocks(content)

  return (
    <div className={className}>
      {parts.map((part, partIndex) => {
        if (typeof part === "object" && part.type === "code") {
          return (
            <CodeBlock
              key={partIndex}
              code={part.code}
              language={part.language}
            />
          )
        }

        // Parse text content line by line for block elements
        const text = part as string
        const lines = text.split("\n")

        return (
          <div key={partIndex} className="whitespace-pre-wrap break-words">
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {parseLine(line, lineIndex)}
                {lineIndex < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </div>
        )
      })}
    </div>
  )
}
