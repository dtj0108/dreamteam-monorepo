"use client"

import { useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SMSTemplateVariablesPanel } from "./sms-template-variables-panel"
import type { SMSTemplate, SMSTemplateInput } from "@/types/sms-template"
import { SMS_TEMPLATE_CATEGORIES, getSegmentInfo } from "@/types/sms-template"
import { Loader2Icon, AlertTriangleIcon } from "lucide-react"

export interface SMSTemplateEditorFormRef {
  submit: () => void
}

interface SMSTemplateEditorFormProps {
  template?: SMSTemplate | null
  onSave: (data: SMSTemplateInput) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
  hideActions?: boolean
}

export const SMSTemplateEditorForm = forwardRef<SMSTemplateEditorFormRef, SMSTemplateEditorFormProps>(
  function SMSTemplateEditorForm({
    template,
    onSave,
    onCancel,
    isSaving = false,
    hideActions = false,
  }, ref) {
    const formRef = useRef<HTMLFormElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [name, setName] = useState(template?.name || "")
    const [body, setBody] = useState(template?.body || "")
    const [description, setDescription] = useState(template?.description || "")
    const [category, setCategory] = useState(template?.category || "")
    const [error, setError] = useState<string | null>(null)

    const segmentInfo = getSegmentInfo(body)

    // Expose submit method via ref
    useImperativeHandle(ref, () => ({
      submit: () => {
        formRef.current?.requestSubmit()
      },
    }))

    const handleInsertVariable = (variable: string) => {
      if (textareaRef.current) {
        const textarea = textareaRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newBody = body.substring(0, start) + variable + body.substring(end)
        setBody(newBody)

        // Restore focus and cursor position after the inserted variable
        setTimeout(() => {
          textarea.focus()
          const newCursorPosition = start + variable.length
          textarea.setSelectionRange(newCursorPosition, newCursorPosition)
        }, 0)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!name.trim()) {
        setError("Template name is required")
        return
      }

      if (!body.trim()) {
        setError("SMS body is required")
        return
      }

      await onSave({
        name: name.trim(),
        body: body.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      })
    }

    return (
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          {/* Main form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Appointment Reminder"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category || "none"}
                  onValueChange={(val) => setCategory(val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {SMS_TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">SMS Message</Label>
              <Textarea
                ref={textareaRef}
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your SMS message here..."
                className="min-h-[200px] resize-y font-mono text-sm"
              />

              {/* Character counter and segment info */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className={segmentInfo.charCount > 0 ? "text-muted-foreground" : "text-muted-foreground/50"}>
                    {segmentInfo.charCount} characters
                  </span>
                  <span className="text-muted-foreground">
                    {segmentInfo.encoding}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {segmentInfo.segments > 1 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangleIcon className="size-3" />
                      <span>Multiple segments</span>
                    </div>
                  )}
                  <span className={segmentInfo.segments > 1 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                    {segmentInfo.segments} segment{segmentInfo.segments !== 1 ? "s" : ""} ({segmentInfo.segments} credit{segmentInfo.segments !== 1 ? "s" : ""})
                  </span>
                </div>
              </div>

              {/* Progress bar for current segment */}
              {segmentInfo.charCount > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        segmentInfo.segments > 1 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min((segmentInfo.charCount / segmentInfo.maxChars) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {segmentInfo.remaining} characters remaining in segment{segmentInfo.segments > 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Use the variables panel to insert dynamic content. Keep messages concise for better delivery.
              </p>
            </div>
          </div>

          {/* Variables panel */}
          <div className="hidden md:block">
            <SMSTemplateVariablesPanel onInsert={handleInsertVariable} />
          </div>
        </div>

        {/* Mobile variables panel */}
        <div className="md:hidden">
          <SMSTemplateVariablesPanel onInsert={handleInsertVariable} />
        </div>

        {/* Actions - only show if not hidden */}
        {!hideActions && (
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2Icon className="size-4 mr-2 animate-spin" />}
              {template ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        )}
      </form>
    )
  }
)
