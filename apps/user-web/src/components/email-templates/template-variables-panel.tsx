"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyIcon, CheckIcon } from "lucide-react"
import { TEMPLATE_VARIABLES } from "@/types/email-template"

interface TemplateVariablesPanelProps {
  onInsert?: (variable: string) => void
}

export function TemplateVariablesPanel({ onInsert }: TemplateVariablesPanelProps) {
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)

  const handleCopy = async (variable: string) => {
    await navigator.clipboard.writeText(variable)
    setCopiedVariable(variable)
    setTimeout(() => setCopiedVariable(null), 2000)
  }

  const handleClick = (variable: string) => {
    if (onInsert) {
      onInsert(variable)
    } else {
      handleCopy(variable)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Template Variables</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Click to {onInsert ? "insert" : "copy"} a variable into your template
        </p>
        <div className="space-y-1.5">
          {TEMPLATE_VARIABLES.map(({ variable, description }) => (
            <div
              key={variable}
              className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer group"
              onClick={() => handleClick(variable)}
            >
              <div className="min-w-0">
                <code className="text-xs font-mono text-primary">{variable}</code>
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(variable)
                }}
              >
                {copiedVariable === variable ? (
                  <CheckIcon className="size-3 text-green-500" />
                ) : (
                  <CopyIcon className="size-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
