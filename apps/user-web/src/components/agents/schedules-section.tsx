"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAgents } from "@/providers/agents-provider"
import { CreateScheduleDialog } from "./create-schedule-dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import type { AgentSchedule } from "@/lib/types/agents"
import { describeCron } from "@/lib/cron-utils"

interface SchedulesSectionProps {
  agentId: string
}

export function SchedulesSection({ agentId }: SchedulesSectionProps) {
  const { schedules, fetchSchedules, toggleSchedule, isLoadingSchedules } = useAgents()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Fetch schedules for this agent
  useEffect(() => {
    fetchSchedules({ agentId })
  }, [fetchSchedules, agentId])

  // Filter schedules for this agent (in case provider has all schedules)
  const agentSchedules = schedules.filter(
    s => s.agent_id === agentId
  )

  const handleToggle = async (scheduleId: string, enabled: boolean) => {
    setTogglingIds(prev => new Set(prev).add(scheduleId))
    try {
      await toggleSchedule(scheduleId, enabled)
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(scheduleId)
        return next
      })
    }
  }

  const handleCreateSuccess = () => {
    fetchSchedules({ agentId })
  }

  if (isLoadingSchedules) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Autonomous Actions</h2>
          <p className="text-sm text-muted-foreground">
            Automated tasks for this agent
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="size-4 mr-2" />
          New Action
        </Button>
      </div>

      {agentSchedules.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <Calendar className="size-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No autonomous actions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create an action to have this agent run tasks automatically
          </p>
          <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
            <Plus className="size-4 mr-2" />
            New Action
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {agentSchedules.map(schedule => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              isToggling={togglingIds.has(schedule.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Create Schedule Dialog - pre-select this agent */}
      <CreateScheduleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
        defaultAgentId={agentId}
      />
    </div>
  )
}

interface ScheduleRowProps {
  schedule: AgentSchedule
  isToggling: boolean
  onToggle: (id: string, enabled: boolean) => void
}

function ScheduleRow({ schedule, isToggling, onToggle }: ScheduleRowProps) {
  const frequencyText = describeCron(schedule.cron_expression)
  const nextRun = schedule.next_run_at
    ? new Date(schedule.next_run_at).toLocaleString()
    : "Not scheduled"
  const isLockedByPlan = schedule.agent_in_plan === false

  return (
    <Link
      href={`/agents/schedules/${schedule.id}`}
      className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{schedule.name}</h4>
            {schedule.requires_approval && (
              <Badge variant="outline" className="gap-1 text-xs">
                <ShieldCheck className="size-3" />
                Approval
              </Badge>
            )}
            {schedule.agent_in_plan === false && (
              <Badge variant="outline" className="gap-1 text-xs text-amber-700 border-amber-200 bg-amber-50/60">
                <AlertTriangle className="size-3" />
                Plan change
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {frequencyText}
            </span>
            {schedule.is_enabled && !isLockedByPlan && (
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3 text-green-500" />
                Next: {nextRun}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={e => e.preventDefault()}>
          <Switch
            checked={schedule.is_enabled}
            onCheckedChange={checked => onToggle(schedule.id, checked)}
            disabled={isToggling || isLockedByPlan}
          />
        </div>

        <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}
