"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MailIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { EmailTemplate } from "@/types/email-template"
import { getCategoryLabel } from "@/types/email-template"

interface TemplateCardProps {
  template: EmailTemplate
  onEdit: (template: EmailTemplate) => void
  onDelete: (template: EmailTemplate) => void
  onToggle: (template: EmailTemplate, isActive: boolean) => void
}

export function TemplateCard({ template, onEdit, onDelete, onToggle }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`size-10 rounded-lg flex items-center justify-center ${
            template.is_active ? "bg-emerald-500/10" : "bg-muted"
          }`}
        >
          <MailIcon
            className={`size-5 ${template.is_active ? "text-emerald-500" : "text-muted-foreground"}`}
          />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(template)}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-medium hover:underline truncate">{template.name}</h3>
            {template.category && (
              <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {template.subject}
          </p>
        </div>
        <div className="text-right mr-4 hidden md:block">
          <p className="text-sm text-muted-foreground">
            {template.is_active ? "Active" : "Inactive"}
          </p>
        </div>
        <Switch
          checked={template.is_active}
          onCheckedChange={(checked) => onToggle(template, checked)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(template)}>
              <PencilIcon className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(template)}
            >
              <Trash2Icon className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
