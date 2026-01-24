"use client"

import { useState, useEffect } from "react"
import { useProjects, type Task, type TaskStatus, type TaskPriority, type ProjectMember } from "@/providers/projects-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  CalendarIcon,
  Clock,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Plus,
  Trash2,
  Link2,
  Users,
  Tag,
  Send,
  X,
} from "lucide-react"

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "To Do", color: "bg-gray-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "review", label: "Review", color: "bg-amber-500" },
  { value: "done", label: "Done", color: "bg-emerald-500" },
]

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-gray-600" },
  { value: "medium", label: "Medium", color: "text-blue-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "urgent", label: "Urgent", color: "text-red-600" },
]

interface WorkspaceMember {
  id: string
  profile: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface TaskDetailSheetProps {
  task: Task | null
  projectId: string
  workspaceId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  members?: ProjectMember[]
}

export function TaskDetailSheet({ task, projectId, workspaceId, open, onOpenChange, members = [] }: TaskDetailSheetProps) {
  const { updateTask, deleteTask, createTask } = useProjects()
  const { user } = useUser()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [estimatedHours, setEstimatedHours] = useState("")
  const [newComment, setNewComment] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [localAssigneeIds, setLocalAssigneeIds] = useState<string[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])

  // Fetch workspace members when dialog opens
  useEffect(() => {
    if (open && workspaceId) {
      fetch(`/api/team/members?workspaceId=${workspaceId}`)
        .then(res => res.json())
        .then(data => setWorkspaceMembers(data.members || []))
        .catch(console.error)
    }
  }, [open, workspaceId])

  // Sync state with task prop
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setStatus(task.status)
      setPriority(task.priority)
      setDueDate(task.due_date ? new Date(task.due_date) : undefined)
      setEstimatedHours(task.estimated_hours?.toString() || "")
      // Sync local assignee state for optimistic UI
      setLocalAssigneeIds(task.task_assignees?.map(a => a.user?.id).filter(Boolean) as string[] || [])
    }
  }, [task])

  const handleSave = async () => {
    if (!task) return

    await updateTask(projectId, task.id, {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate?.toISOString().split("T")[0] || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
    })
  }

  const handleDelete = async () => {
    if (!task) return
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(projectId, task.id)
      onOpenChange(false)
    }
  }

  const handleAddSubtask = async () => {
    if (!task || !newSubtask.trim()) return

    await createTask(projectId, {
      title: newSubtask.trim(),
      parent_id: task.id,
      status: "todo",
      priority: "medium",
    })

    setNewSubtask("")
    setShowSubtaskInput(false)
  }

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return

    try {
      await fetch(`/api/projects/${projectId}/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      setNewComment("")
    } catch (error) {
      console.error("Failed to add comment:", error)
    }
  }

  const handleToggleAssignee = async (userId: string) => {
    if (!task) return

    const isCurrentlyAssigned = localAssigneeIds.includes(userId)

    const newAssignees = isCurrentlyAssigned
      ? localAssigneeIds.filter(id => id !== userId)
      : [...localAssigneeIds, userId]

    // Optimistic update - update local state immediately
    setLocalAssigneeIds(newAssignees)

    await updateTask(projectId, task.id, { assignees: newAssignees } as Parameters<typeof updateTask>[2])
  }

  const handleRemoveAssignee = async (userId: string) => {
    if (!task) return

    const newAssignees = localAssigneeIds.filter(id => id !== userId)

    // Optimistic update - update local state immediately
    setLocalAssigneeIds(newAssignees)

    await updateTask(projectId, task.id, { assignees: newAssignees } as Parameters<typeof updateTask>[2])
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">Task Details</DialogTitle>
          <DialogDescription className="sr-only">
            View and edit task details
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Title */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className="text-lg font-semibold border-none px-0 focus-visible:ring-0"
                placeholder="Task title"
              />
            </div>

            {/* Status & Priority Row */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(v) => {
                    setStatus(v as TaskStatus)
                    setTimeout(handleSave, 0)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Priority</Label>
                <Select 
                  value={priority} 
                  onValueChange={(v) => {
                    setPriority(v as TaskPriority)
                    setTimeout(handleSave, 0)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date & Estimated Hours */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date)
                        setTimeout(handleSave, 0)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Estimated Hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    onBlur={handleSave}
                    className="pl-9"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Assignees</Label>
              <div className="flex flex-wrap items-center gap-2">
                {task.task_assignees?.map((assignee, index) => (
                  <div key={assignee.id || assignee.user?.id || index} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={assignee.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {assignee.user?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignee.user?.name}</span>
                    <button
                      type="button"
                      onClick={() => assignee.user?.id && handleRemoveAssignee(assignee.user.id)}
                      className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Assign
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {/* Use workspace members if available, otherwise fall back to project members */}
                      {workspaceMembers.length > 0 ? (
                        <>
                          {workspaceMembers.map((member) => {
                            const isAssigned = localAssigneeIds.includes(member.profile.id)
                            return (
                              <div
                                key={member.profile.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleToggleAssignee(member.profile.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleToggleAssignee(member.profile.id)}
                                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-left cursor-pointer"
                              >
                                <Checkbox
                                  checked={isAssigned}
                                  className="pointer-events-none"
                                />
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profile.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {member.profile.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">
                                  {member.profile.name}
                                  {member.profile.id === user?.id && " (me)"}
                                </span>
                              </div>
                            )
                          })}
                        </>
                      ) : (
                        <>
                          {/* Fallback to project members if no workspace members */}
                          {user?.id && !members.some(m => m.user.id === user.id) && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleAssignee(user.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleToggleAssignee(user.id)}
                              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-left cursor-pointer"
                            >
                              <Checkbox
                                checked={localAssigneeIds.includes(user.id)}
                                className="pointer-events-none"
                              />
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={undefined} />
                                <AvatarFallback className="text-xs">
                                  {user.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">{user.name} (me)</span>
                            </div>
                          )}
                          {members.map((member) => {
                            const isAssigned = localAssigneeIds.includes(member.user.id)
                            return (
                              <div
                                key={member.user.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleToggleAssignee(member.user.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleToggleAssignee(member.user.id)}
                                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-left cursor-pointer"
                              >
                                <Checkbox
                                  checked={isAssigned}
                                  className="pointer-events-none"
                                />
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.user.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {member.user.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">
                                  {member.user.name}
                                  {member.user.id === user?.id && " (me)"}
                                </span>
                              </div>
                            )
                          })}
                          {members.length === 0 && !user?.id && (
                            <p className="text-sm text-muted-foreground p-2">No team members yet</p>
                          )}
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Labels */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Labels</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {task.task_labels?.map((tl) => (
                  <Badge
                    key={tl.label.id}
                    variant="secondary"
                    style={{ backgroundColor: tl.label.color + "20", color: tl.label.color }}
                  >
                    {tl.label.name}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="h-6">
                  <Tag className="h-3 w-3 mr-1" />
                  Add label
                </Button>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Add a description..."
                rows={4}
              />
            </div>

            <Separator />

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Subtasks</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6"
                  onClick={() => setShowSubtaskInput(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {task.subtasks?.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                  >
                    <CheckSquare
                      className={cn(
                        "h-4 w-4",
                        subtask.status === "done" ? "text-emerald-500" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        subtask.status === "done" && "line-through text-muted-foreground"
                      )}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}

                {showSubtaskInput && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Subtask title"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSubtask()
                        if (e.key === "Escape") {
                          setShowSubtaskInput(false)
                          setNewSubtask("")
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddSubtask}>
                      Add
                    </Button>
                  </div>
                )}

                {!task.subtasks?.length && !showSubtaskInput && (
                  <p className="text-sm text-muted-foreground">No subtasks yet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Comments</Label>

              <div className="space-y-3 mb-4">
                {/* Placeholder for comments - would be loaded from API */}
                <p className="text-sm text-muted-foreground">No comments yet</p>
              </div>

              <div className="flex items-start gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-auto">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Task
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

