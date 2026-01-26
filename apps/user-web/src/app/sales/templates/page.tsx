"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PlusIcon,
  MailIcon,
  MessageSquareIcon,
  TagIcon,
  Loader2Icon,
} from "lucide-react"
import { EmailTemplatesProvider, useEmailTemplates } from "@/providers/email-templates-provider"
import { SMSTemplatesProvider, useSMSTemplates } from "@/providers/sms-templates-provider"
import { TemplateCard } from "@/components/email-templates"
import { SMSTemplateCard } from "@/components/sms-templates"
import { EMAIL_TEMPLATE_CATEGORIES } from "@/types/email-template"
import { SMS_TEMPLATE_CATEGORIES } from "@/types/sms-template"
import type { EmailTemplate } from "@/types/email-template"
import type { SMSTemplate } from "@/types/sms-template"

function EmailTemplatesContent() {
  const router = useRouter()
  const { templates, isLoading, createTemplate, toggleTemplate, deleteTemplate } = useEmailTemplates()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateCategory, setNewTemplateCategory] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const activeCount = templates.filter(t => t.is_active).length
  const categoriesUsed = new Set(templates.map(t => t.category).filter(Boolean)).size

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return

    setIsCreating(true)
    const template = await createTemplate({
      name: newTemplateName,
      subject: "",
      body: "",
      category: newTemplateCategory || undefined,
    })

    if (template) {
      setCreateDialogOpen(false)
      setNewTemplateName("")
      setNewTemplateCategory("")
      // Navigate to the editor
      router.push(`/sales/templates/${template.id}`)
    }
    setIsCreating(false)
  }

  const handleEdit = (template: EmailTemplate) => {
    router.push(`/sales/templates/${template.id}`)
  }

  const handleToggle = async (template: EmailTemplate, isActive: boolean) => {
    await toggleTemplate(template.id, isActive)
  }

  const handleDelete = async (template: EmailTemplate) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      await deleteTemplate(template.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="size-4 mr-2" />
          Create Email Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <MailIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">Email templates created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <MailIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Available in workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TagIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriesUsed}</div>
            <p className="text-xs text-muted-foreground">Categories in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MailIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No email templates yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Create email templates to use in your automated workflows.
            </CardDescription>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Template</Button>
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Give your template a name. You&apos;ll edit the content in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Email"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select
                value={newTemplateCategory || "none"}
                onValueChange={(val) => setNewTemplateCategory(val === "none" ? "" : val)}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim() || isCreating}>
              {isCreating && <Loader2Icon className="size-4 mr-2 animate-spin" />}
              Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SMSTemplatesContent() {
  const router = useRouter()
  const { templates, isLoading, createTemplate, toggleTemplate, deleteTemplate } = useSMSTemplates()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateCategory, setNewTemplateCategory] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const activeCount = templates.filter(t => t.is_active).length
  const categoriesUsed = new Set(templates.map(t => t.category).filter(Boolean)).size

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return

    setIsCreating(true)
    const template = await createTemplate({
      name: newTemplateName,
      body: "",
      category: newTemplateCategory || undefined,
    })

    if (template) {
      setCreateDialogOpen(false)
      setNewTemplateName("")
      setNewTemplateCategory("")
      // Navigate to the editor
      router.push(`/sales/templates/sms/${template.id}`)
    }
    setIsCreating(false)
  }

  const handleEdit = (template: SMSTemplate) => {
    router.push(`/sales/templates/sms/${template.id}`)
  }

  const handleToggle = async (template: SMSTemplate, isActive: boolean) => {
    await toggleTemplate(template.id, isActive)
  }

  const handleDelete = async (template: SMSTemplate) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      await deleteTemplate(template.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="size-4 mr-2" />
          Create SMS Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <MessageSquareIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">SMS templates created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <MessageSquareIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Available in workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TagIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriesUsed}</div>
            <p className="text-xs text-muted-foreground">Categories in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template) => (
            <SMSTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquareIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No SMS templates yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Create SMS templates to use in your automated workflows.
            </CardDescription>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Template</Button>
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create SMS Template</DialogTitle>
            <DialogDescription>
              Give your template a name. You&apos;ll edit the content in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sms-name">Template Name</Label>
              <Input
                id="sms-name"
                placeholder="e.g., Appointment Reminder"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-category">Category (optional)</Label>
              <Select
                value={newTemplateCategory || "none"}
                onValueChange={(val) => setNewTemplateCategory(val === "none" ? "" : val)}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim() || isCreating}>
              {isCreating && <Loader2Icon className="size-4 mr-2 animate-spin" />}
              Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TemplatesPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const defaultTab = tabParam === "sms" ? "sms" : "email"

  return (
    <div className="p-6">
      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="text-muted-foreground">Manage your email and SMS templates</p>
          </div>
          <TabsList>
            <TabsTrigger value="email">
              <MailIcon className="size-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquareIcon className="size-4 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="email">
          <EmailTemplatesProvider>
            <EmailTemplatesContent />
          </EmailTemplatesProvider>
        </TabsContent>

        <TabsContent value="sms">
          <SMSTemplatesProvider>
            <SMSTemplatesContent />
          </SMSTemplatesProvider>
        </TabsContent>
      </Tabs>
    </div>
  )
}
