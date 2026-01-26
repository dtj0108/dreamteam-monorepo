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
import { MessageSquareIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { SMSTemplate } from "@/types/sms-template"
import { getSMSCategoryLabel, getSegmentInfo } from "@/types/sms-template"

interface SMSTemplateCardProps {
  template: SMSTemplate
  onEdit: (template: SMSTemplate) => void
  onDelete: (template: SMSTemplate) => void
  onToggle: (template: SMSTemplate, isActive: boolean) => void
}

export function SMSTemplateCard({ template, onEdit, onDelete, onToggle }: SMSTemplateCardProps) {
  const segmentInfo = getSegmentInfo(template.body)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`size-10 rounded-lg flex items-center justify-center ${
            template.is_active ? "bg-blue-500/10" : "bg-muted"
          }`}
        >
          <MessageSquareIcon
            className={`size-5 ${template.is_active ? "text-blue-500" : "text-muted-foreground"}`}
          />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(template)}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-medium hover:underline truncate">{template.name}</h3>
            {template.category && (
              <Badge variant="outline">{getSMSCategoryLabel(template.category)}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {template.body || "No content yet"}
          </p>
        </div>
        <div className="text-right mr-4 hidden md:block">
          <p className="text-sm text-muted-foreground">
            {segmentInfo.segments > 0 ? `${segmentInfo.segments} segment${segmentInfo.segments > 1 ? 's' : ''}` : 'Empty'}
          </p>
          <p className="text-xs text-muted-foreground">
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
