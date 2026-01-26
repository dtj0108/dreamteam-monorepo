"use client"

import { useState, useEffect } from "react"
import { useAgents } from "@/providers/agents-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CronPicker } from "./cron-picker"
import { Loader2, Sparkles } from "lucide-react"
import type { AgentSchedule } from "@/lib/types/agents"

interface CreateScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: AgentSchedule | null // For edit mode
  onSuccess?: (schedule: AgentSchedule) => void
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: CreateScheduleDialogProps) {
  const { myAgents, createSchedule, updateSchedule } = useAgents()
  const isEditMode = !!schedule

  // Form state
  const [agentId, setAgentId] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [cronExpression, setCronExpression] = useState("0 9 * * *")
  const [timezone] = useState("UTC")
  const [taskPrompt, setTaskPrompt] = useState("")
  const [requiresApproval, setRequiresApproval] = useState(true)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes or schedule changes
  useEffect(() => {
    if (open) {
      if (schedule) {
        // Edit mode - populate from schedule
        setAgentId(schedule.agent_id)
        setName(schedule.name)
        setDescription(schedule.description || "")
        setCronExpression(schedule.cron_expression)
        setTaskPrompt(schedule.task_prompt)
        setRequiresApproval(schedule.requires_approval)
      } else {
        // Create mode - reset to defaults
        setAgentId(myAgents[0]?.id || "")
        setName("")
        setDescription("")
        setCronExpression("0 9 * * *")
        setTaskPrompt("")
        setRequiresApproval(true)
      }
      setError(null)
    }
  }, [open, schedule, myAgents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!agentId) {
      setError("Please select an agent")
      return
    }
    if (!name.trim()) {
      setError("Please enter a schedule name")
      return
    }
    if (!taskPrompt.trim()) {
      setError("Please enter a task prompt")
      return
    }

    setIsSubmitting(true)

    try {
      let result: AgentSchedule | null = null

      if (isEditMode && schedule) {
        result = await updateSchedule(schedule.id, {
          name,
          description,
          cron_expression: cronExpression,
          timezone,
          task_prompt: taskPrompt,
          requires_approval: requiresApproval,
        })
      } else {
        result = await createSchedule({
          agent_id: agentId,
          name,
          description,
          cron_expression: cronExpression,
          timezone,
          task_prompt: taskPrompt,
          requires_approval: requiresApproval,
        })
      }

      if (result) {
        onSuccess?.(result)
        onOpenChange(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Schedule" : "Create Schedule"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update this scheduled task"
                : "Set up a recurring task for one of your agents"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Agent Selector */}
            <div className="space-y-2">
              <Label htmlFor="agent">Agent</Label>
              <Select
                value={agentId}
                onValueChange={setAgentId}
                disabled={isEditMode}
              >
                <SelectTrigger id="agent">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {myAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        {agent.avatar_url ? (
                          <span className="text-base">{agent.avatar_url}</span>
                        ) : (
                          <Sparkles className="size-4 text-muted-foreground" />
                        )}
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Report"
              />
            </div>

            {/* Description (optional) */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this schedule"
              />
            </div>

            {/* Cron Picker */}
            <div className="space-y-2">
              <CronPicker
                value={cronExpression}
                onChange={setCronExpression}
                timezone={timezone}
              />
            </div>

            {/* Task Prompt */}
            <div className="space-y-2">
              <Label htmlFor="task">Task Prompt</Label>
              <Textarea
                id="task"
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                placeholder="What should the agent do? e.g., 'Generate a summary of this week's transactions and identify any unusual spending patterns.'"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This is the instruction the agent will receive when the schedule runs.
              </p>
            </div>

            {/* Requires Approval */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="requires-approval"
                checked={requiresApproval}
                onCheckedChange={(checked) => setRequiresApproval(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="requires-approval"
                  className="cursor-pointer font-medium leading-none"
                >
                  Require approval before running
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, you'll receive a notification to approve the task before the agent executes it.
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
