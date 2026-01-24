"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AILoadingAnimation } from "@/components/ui/ai-loading-animation"
import { Check, Copy, RefreshCw, AlertCircle } from "lucide-react"

interface GenerateInstructionsDialogProps {
  projectId: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type State = "idle" | "loading" | "success" | "error"

export function GenerateInstructionsDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: GenerateInstructionsDialogProps) {
  const [state, setState] = useState<State>("idle")
  const [markdown, setMarkdown] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const generateInstructions = useCallback(async () => {
    setState("loading")
    setError("")

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-instructions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate instructions")
      }

      const data = await response.json()
      setMarkdown(data.markdown)
      setState("success")
    } catch (err) {
      console.error("Error generating instructions:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      setState("error")
    }
  }, [projectId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && state === "idle") {
      generateInstructions()
    }
    if (!newOpen) {
      // Reset on close
      setState("idle")
      setMarkdown("")
      setError("")
      setCopied(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Claude Code Instructions</DialogTitle>
        </DialogHeader>

        {(state === "idle" || state === "loading") && (
          <div className="py-8">
            <AILoadingAnimation message="Generating instructions..." />
          </div>
        )}

        {state === "error" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button onClick={generateInstructions} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {state === "success" && (
          <>
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm text-muted-foreground">
                Copy these instructions and paste them into Claude Code to execute the project.
              </p>
              <Button onClick={handleCopy} variant="outline" size="sm">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="flex-1 rounded-md border bg-muted/30">
              <pre className="p-4 text-sm whitespace-pre-wrap font-mono">
                {markdown}
              </pre>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={generateInstructions} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
