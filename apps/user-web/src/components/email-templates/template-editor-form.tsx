"use client"

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmailEditor, EmailEditorRef } from "@/components/mail/email-editor"
import { TemplateVariablesPanel } from "./template-variables-panel"
import type { EmailTemplate, EmailTemplateInput } from "@/types/email-template"
import { EMAIL_TEMPLATE_CATEGORIES } from "@/types/email-template"
import { Loader2Icon } from "lucide-react"

export interface TemplateEditorFormRef {
  submit: () => void
}

interface TemplateEditorFormProps {
  template?: EmailTemplate | null
  onSave: (data: EmailTemplateInput) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
  hideActions?: boolean
}

export const TemplateEditorForm = forwardRef<TemplateEditorFormRef, TemplateEditorFormProps>(
  function TemplateEditorForm({
    template,
    onSave,
    onCancel,
    isSaving = false,
    hideActions = false,
  }, ref) {
    const formRef = useRef<HTMLFormElement>(null)
    const editorRef = useRef<EmailEditorRef>(null)
    const [name, setName] = useState(template?.name || "")
    const [subject, setSubject] = useState(template?.subject || "")
    const [description, setDescription] = useState(template?.description || "")
    const [category, setCategory] = useState(template?.category || "")
    const [error, setError] = useState<string | null>(null)

    // Expose submit method via ref
    useImperativeHandle(ref, () => ({
      submit: () => {
        formRef.current?.requestSubmit()
      },
    }))

    // Set initial content when template loads
    useEffect(() => {
      if (template?.body && editorRef.current) {
        editorRef.current.setContent(template.body)
      }
    }, [template])

    const handleInsertVariable = (variable: string) => {
      // Focus the editor and insert at cursor position
      if (editorRef.current) {
        editorRef.current.focus()
        // For TipTap, we need to insert HTML
        document.execCommand("insertText", false, variable)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!name.trim()) {
        setError("Template name is required")
        return
      }

      if (!subject.trim()) {
        setError("Subject is required")
        return
      }

      const body = editorRef.current?.getHTML() || ""
      if (!body.trim() || body === "<p></p>") {
        setError("Email body is required")
        return
      }

      await onSave({
        name: name.trim(),
        subject: subject.trim(),
        body,
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
                placeholder="e.g., Welcome Email"
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
                    {EMAIL_TEMPLATE_CATEGORIES.map((cat) => (
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
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Welcome to {{workspace_name}}!"
              />
              <p className="text-xs text-muted-foreground">
                You can use template variables like {"{{contact_first_name}}"} in the subject
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email Body</Label>
              <EmailEditor
                ref={editorRef}
                initialContent={template?.body || ""}
                placeholder="Write your email content here..."
              />
              <p className="text-xs text-muted-foreground">
                Use the variables panel to insert dynamic content
              </p>
            </div>
          </div>

          {/* Variables panel */}
          <div className="hidden md:block">
            <TemplateVariablesPanel onInsert={handleInsertVariable} />
          </div>
        </div>

        {/* Mobile variables panel */}
        <div className="md:hidden">
          <TemplateVariablesPanel onInsert={handleInsertVariable} />
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
