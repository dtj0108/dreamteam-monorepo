"use client"

import { useState, useEffect, useCallback, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeftIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { SMSTemplateEditorForm, SMSTemplateEditorFormRef } from "@/components/sms-templates"
import type { SMSTemplate, SMSTemplateInput } from "@/types/sms-template"

interface SMSTemplateEditorPageProps {
  params: Promise<{ id: string }>
}

export default function SMSTemplateEditorPage({ params }: SMSTemplateEditorPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const formRef = useRef<SMSTemplateEditorFormRef>(null)
  const [template, setTemplate] = useState<SMSTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplate = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/sms-templates/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError("Template not found")
          return
        }
        throw new Error("Failed to fetch template")
      }
      const data = await res.json()
      setTemplate(data)
    } catch (err) {
      console.error("Error fetching template:", err)
      setError("Failed to load template")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const handleSave = async (data: SMSTemplateInput) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/sms-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to save template")
      }

      router.push("/sales/templates?tab=sms")
    } catch (err) {
      console.error("Error saving template:", err)
      setError("Failed to save template")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/sms-templates/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete template")
      }

      router.push("/sales/templates?tab=sms")
    } catch (err) {
      console.error("Error deleting template:", err)
      setError("Failed to delete template")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    router.push("/sales/templates?tab=sms")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/sales/templates?tab=sms")}>
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/sales/templates?tab=sms")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {template?.name || "Edit SMS Template"}
            </h1>
            <p className="text-muted-foreground">
              Edit your SMS template content and settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={() => formRef.current?.submit()} disabled={isSaving}>
            {isSaving && <Loader2Icon className="size-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2Icon className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{template?.name}&quot;. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting && <Loader2Icon className="size-4 mr-2 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <SMSTemplateEditorForm
            ref={formRef}
            template={template}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
            hideActions
          />
        </CardContent>
      </Card>
    </div>
  )
}
