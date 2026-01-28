"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PlusIcon,
  GitBranchIcon,
  ZapIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  Trash2Icon,
  PencilIcon,
  Activity,
  Loader2,
} from "lucide-react"
import { WorkflowsProvider, useWorkflows } from "@/providers/workflows-provider"
import { TRIGGERS, getTriggerDefinition, type TriggerType } from "@/types/workflow"

function WorkflowsPageContent() {
  const router = useRouter()
  const { workflows, isLoading, createWorkflow, toggleWorkflow, deleteWorkflow } = useWorkflows()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState("")
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState<TriggerType>("lead_created")
  const [isCreating, setIsCreating] = useState(false)
  const [executionCounts, setExecutionCounts] = useState<Record<string, number>>({})
  const [loadingCounts, setLoadingCounts] = useState(false)

  const activeCount = workflows.filter(w => w.is_active).length

  const fetchExecutionCounts = async () => {
    if (!workflows.length) return

    setLoadingCounts(true)
    try {
      const counts: Record<string, number> = {}

      await Promise.all(
        workflows.map(async (workflow) => {
          const response = await fetch(
            `/api/workflows/${workflow.id}/executions?limit=1&offset=0`
          )
          if (response.ok) {
            const data = await response.json()
            counts[workflow.id] = data.total || 0
          }
        })
      )

      setExecutionCounts(counts)
    } finally {
      setLoadingCounts(false)
    }
  }

  useEffect(() => {
    if (workflows.length > 0) {
      fetchExecutionCounts()
    }
  }, [workflows.length])

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return

    setIsCreating(true)
    const workflow = await createWorkflow({
      name: newWorkflowName,
      trigger_type: newWorkflowTrigger,
    })

    if (workflow) {
      setCreateDialogOpen(false)
      setNewWorkflowName("")
      setNewWorkflowTrigger("lead_created")
      // Navigate to the builder
      router.push(`/sales/workflows/${workflow.id}`)
    }
    setIsCreating(false)
  }

  const handleToggle = async (id: string, checked: boolean) => {
    await toggleWorkflow(id, checked)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow(id)
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
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Automate your sales processes</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="size-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <ZapIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">of {workflows.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <GitBranchIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">Created automations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Triggers Available</CardTitle>
            <ZapIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{TRIGGERS.length}</div>
            <p className="text-xs text-muted-foreground">Lead, Deal, Activity events</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      {workflows.length > 0 ? (
        <div className="space-y-4">
          {workflows.map((workflow) => {
            const trigger = getTriggerDefinition(workflow.trigger_type)
            return (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center ${
                      workflow.is_active ? "bg-emerald-500/10" : "bg-muted"
                    }`}
                  >
                    <GitBranchIcon
                      className={`size-5 ${workflow.is_active ? "text-emerald-500" : "text-muted-foreground"}`}
                    />
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/sales/workflows/${workflow.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium hover:underline">{workflow.name}</h3>
                      <Badge variant="outline">{trigger?.label || workflow.trigger_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {workflow.description || `Triggered by: ${trigger?.description || workflow.trigger_type}`}
                    </p>
                  </div>
                  <div className="text-right mr-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ZapIcon className="h-4 w-4" />
                        <span>{workflow.actions?.length || 0} actions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        <span>
                          {loadingCounts ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : (
                            executionCounts[workflow.id] || 0
                          )} executions
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={(checked) => handleToggle(workflow.id, checked)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/sales/workflows/${workflow.id}`)}>
                        <PencilIcon className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(workflow.id)}
                      >
                        <Trash2Icon className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranchIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No workflows yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Create automated workflows to save time on repetitive tasks.
            </CardDescription>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Workflow</Button>
          </CardContent>
        </Card>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>
              Set up a new automated workflow. You&apos;ll configure the actions in the builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                placeholder="e.g., New Lead Welcome Email"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Event</Label>
              <Select
                value={newWorkflowTrigger}
                onValueChange={(value) => setNewWorkflowTrigger(value as TriggerType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger.type} value={trigger.type}>
                      <div className="flex flex-col">
                        <span>{trigger.label}</span>
                        <span className="text-xs text-muted-foreground">{trigger.description}</span>
                      </div>
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
            <Button onClick={handleCreateWorkflow} disabled={!newWorkflowName.trim() || isCreating}>
              {isCreating && <Loader2Icon className="size-4 mr-2 animate-spin" />}
              Create & Open Builder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WorkflowsPage() {
  return (
    <WorkflowsProvider>
      <WorkflowsPageContent />
    </WorkflowsProvider>
  )
}
