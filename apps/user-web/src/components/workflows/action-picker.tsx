"use client"

import { useState } from "react"
import {
  MessageSquareIcon,
  MailIcon,
  BellIcon,
  ListTodoIcon,
  EditIcon,
  FileTextIcon,
  UserCheckIcon,
  XIcon,
  SearchIcon,
  PhoneIcon,
  ClockIcon,
  GitBranchIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@dreamteam/ui/dialog"
import { Input } from "@dreamteam/ui/input"
import type { ActionType, WorkflowAction } from "@/types/workflow"
import { ACTIONS } from "@/types/workflow"

const actionIcons: Record<ActionType, React.ReactNode> = {
  send_sms: <MessageSquareIcon className="size-5" />,
  make_call: <PhoneIcon className="size-5" />,
  send_email: <MailIcon className="size-5" />,
  send_notification: <BellIcon className="size-5" />,
  create_task: <ListTodoIcon className="size-5" />,
  update_status: <EditIcon className="size-5" />,
  add_note: <FileTextIcon className="size-5" />,
  assign_user: <UserCheckIcon className="size-5" />,
  wait: <ClockIcon className="size-5" />,
  condition: <GitBranchIcon className="size-5" />,
}

interface ActionPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectAction: (action: WorkflowAction) => void
  existingActionsCount: number
}

export function ActionPicker({
  open,
  onOpenChange,
  onSelectAction,
  existingActionsCount,
}: ActionPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "communication" | "crm" | "flow">("all")

  const filteredActions = ACTIONS.filter((action) => {
    const matchesCategory = selectedCategory === "all" || action.category === selectedCategory
    const matchesSearch = searchQuery === "" ||
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleSelectAction = (type: ActionType) => {
    const newAction: WorkflowAction = {
      id: `action-${Date.now()}`,
      type,
      config: {},
      order: existingActionsCount,
    }
    onSelectAction(newAction)
    onOpenChange(false)
    setSearchQuery("")
  }

  const categories = [
    { id: "all" as const, label: "All" },
    { id: "communication" as const, label: "Communication" },
    { id: "crm" as const, label: "CRM" },
    { id: "flow" as const, label: "Flow" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Add Step</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-lg">Add Step</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-4 py-2 border-b bg-muted/30">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Actions list */}
        <div className="max-h-80 overflow-auto">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No actions found
            </div>
          ) : (
            <div className="py-2">
              {filteredActions.map((action) => (
                <button
                  key={action.type}
                  onClick={() => handleSelectAction(action.type)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                    {actionIcons[action.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
