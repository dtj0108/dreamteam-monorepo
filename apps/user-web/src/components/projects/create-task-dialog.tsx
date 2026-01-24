"use client"

import { useState } from "react"
import { useProjects, type TaskStatus, type TaskPriority, type ProjectMember } from "@/providers/projects-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Users, X } from "lucide-react"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultStatus?: TaskStatus
  members?: ProjectMember[]
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatus = "todo",
  members = []
}: CreateTaskDialogProps) {
  const { createTask } = useProjects()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [estimatedHours, setEstimatedHours] = useState("")
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await createTask(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        due_date: dueDate?.toISOString().split("T")[0],
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      } as Parameters<typeof createTask>[1])

      onOpenChange(false)
      resetForm()
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStatus(defaultStatus)
    setPriority("medium")
    setDueDate(undefined)
    setEstimatedHours("")
    setSelectedAssignees([])
  }

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const getSelectedMembers = () => {
    const selected = members.filter(m => selectedAssignees.includes(m.user.id))
    // Include current user if selected but not in members list
    if (user?.id && selectedAssignees.includes(user.id) && !members.some(m => m.user.id === user.id)) {
      selected.unshift({
        id: 'current-user',
        role: 'member',
        hours_per_week: 0,
        user: {
          id: user.id,
          name: user.name || 'Me',
          avatar_url: null,
        }
      })
    }
    return selected
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                placeholder="e.g., Design homepage mockup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
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
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g., 4"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Assignees</Label>
              <div className="flex flex-wrap items-center gap-2">
                {getSelectedMembers().map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.user.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleAssignee(member.user.id)}
                      className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      {selectedAssignees.length === 0 ? "Assign" : "Add"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {/* Assign to me option */}
                      {user?.id && !members.some(m => m.user.id === user.id) && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleAssignee(user.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleAssignee(user.id)}
                          className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-left cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedAssignees.includes(user.id)}
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
                      {members.map((member) => (
                        <div
                          key={member.user.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleAssignee(member.user.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleAssignee(member.user.id)}
                          className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-left cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedAssignees.includes(member.user.id)}
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
                      ))}
                      {members.length === 0 && !user?.id && (
                        <p className="text-sm text-muted-foreground p-2">No team members yet</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

