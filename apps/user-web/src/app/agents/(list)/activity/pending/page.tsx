"use client"

import { useEffect, useState } from "react"
import { useAgents } from "@/providers/agents-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import type { AgentScheduleExecution } from "@/lib/types/agents"
import { describeCron } from "@/lib/cron-utils"

function PendingExecutionCard({
  execution,
  onApprove,
  onReject,
  isProcessing,
}: {
  execution: AgentScheduleExecution
  onApprove: () => void
  onReject: () => void
  isProcessing: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-xl">
              {execution.agent?.avatar_url || <Sparkles className="size-5 text-muted-foreground" />}
            </div>
            <div>
              <CardTitle className="text-base">{execution.agent?.name || "Unknown Agent"}</CardTitle>
              <CardDescription className="text-xs">
                {execution.schedule?.name || "Scheduled task"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" />
            Pending Approval
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm font-medium mb-1">Task to execute:</p>
          <p className="text-sm text-muted-foreground">
            {execution.schedule?.task_prompt || "No task prompt available"}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Scheduled: {execution.scheduled_for
              ? new Date(execution.scheduled_for).toLocaleString()
              : new Date(execution.created_at).toLocaleString()}
          </span>
          {execution.schedule?.cron_expression && (
            <span>Frequency: {describeCron(execution.schedule.cron_expression)}</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 gap-2">
        <Button size="sm" variant="outline" className="gap-1" onClick={onReject} disabled={isProcessing}>
          <XCircle className="size-4" />
          Reject
        </Button>
        <Button size="sm" className="gap-1" onClick={onApprove} disabled={isProcessing}>
          <CheckCircle2 className="size-4" />
          {isProcessing ? "Processing..." : "Approve"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function PendingApprovalsPage() {
  const {
    pendingApprovals,
    fetchPendingApprovals,
    approveExecution,
    rejectExecution,
    isLoadingActivity,
  } = useAgents()

  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<AgentScheduleExecution | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingApprovals()
  }, [fetchPendingApprovals])

  const handleApprove = async (execution: AgentScheduleExecution) => {
    if (processingIds.has(execution.id)) return

    setProcessingIds(prev => new Set(prev).add(execution.id))
    setError(null)
    try {
      await approveExecution(execution.id)
      // Success - the card will be removed from pendingApprovals automatically
    } catch (err) {
      // If it was already processed, the list was refreshed by the provider
      // The card will disappear, no need to show an error
      if (err instanceof Error && err.message.includes("already processed")) {
        // Silently handled - list was refreshed
        return
      }
      // For other errors, show a message
      setError(err instanceof Error ? err.message : "Failed to approve task")
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(execution.id)
        return next
      })
    }
  }

  const openRejectDialog = (execution: AgentScheduleExecution) => {
    setSelectedExecution(execution)
    setRejectReason("")
    setShowRejectDialog(true)
  }

  const handleReject = async () => {
    if (!selectedExecution) return
    if (processingIds.has(selectedExecution.id)) return

    setProcessingIds(prev => new Set(prev).add(selectedExecution.id))
    setError(null)
    try {
      await rejectExecution(selectedExecution.id, rejectReason)
      setShowRejectDialog(false)
      setSelectedExecution(null)
    } catch (err) {
      // If it was already processed, the list was refreshed by the provider
      if (err instanceof Error && err.message.includes("already processed")) {
        setShowRejectDialog(false)
        setSelectedExecution(null)
        return
      }
      // For other errors, show a message
      setError(err instanceof Error ? err.message : "Failed to reject task")
      setShowRejectDialog(false)
      setSelectedExecution(null)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        if (selectedExecution) next.delete(selectedExecution.id)
        return next
      })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="size-6" />
            Pending Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve agent scheduled tasks before they run
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-6 flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <span className="text-sm flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Pending Count Alert */}
        {pendingApprovals.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
            <AlertTriangle className="size-5 text-amber-500" />
            <span className="text-sm">
              {pendingApprovals.length} task{pendingApprovals.length !== 1 ? "s" : ""} awaiting your approval
            </span>
          </div>
        )}

        {/* Pending Executions List */}
        {isLoadingActivity ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingApprovals.length > 0 ? (
          <div className="space-y-4">
            {pendingApprovals.map((execution) => (
              <PendingExecutionCard
                key={execution.id}
                execution={execution}
                onApprove={() => handleApprove(execution)}
                onReject={() => openRejectDialog(execution)}
                isProcessing={processingIds.has(execution.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground mt-1">
              No tasks pending approval
            </p>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this scheduled task? You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={selectedExecution ? processingIds.has(selectedExecution.id) : false}
            >
              {selectedExecution && processingIds.has(selectedExecution.id) ? "Rejecting..." : "Reject Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
