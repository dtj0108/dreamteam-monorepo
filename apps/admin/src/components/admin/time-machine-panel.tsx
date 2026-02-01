'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Clock,
  Play,
  RotateCcw,
  Zap,
  Bot,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  History,
  Calendar,
  ChevronDown,
  ChevronUp,
  FastForward,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Schedule {
  id: string
  name: string
  agent_id: string
  cron_expression: string
  timezone: string
  next_run_at: string | null
  last_run_at: string | null
  is_enabled: boolean
  workspace_id: string | null
  status: 'due' | 'overdue' | 'pending' | 'no_schedule'
  would_be_due_at_simulated_time: boolean
  time_until_due_ms: number | null
  agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface TimeMachineResult {
  id: string
  name: string
  previous_next_run_at: string | null
  new_next_run_at: string | null
  success: boolean
  error?: string
}

interface SimulationResult {
  scheduleId: string
  scheduleName: string
  runTime: string
  executionId: string | null
  status: 'dispatched' | 'failed' | 'skipped'
  error?: string
}

interface ActionResult {
  success: boolean
  action: string
  results: TimeMachineResult[]
  summary: {
    total: number
    success: number
    failed: number
    dispatched?: number
  }
  cron_result?: {
    message: string
    count: number
    results?: Array<{
      schedule_id: string
      schedule_name: string
      status: string
      execution_id?: string
      error?: string
    }>
  }
  simulation?: {
    start_time: string
    end_time: string
    schedules_included: number
    total_runs: number
  }
  // For simulation action, results come as SimulationResult[]
  simulationResults?: SimulationResult[]
}

interface ModificationHistory {
  timestamp: Date
  action: string
  scheduleIds: string[]
  results: TimeMachineResult[]
}

// Time presets for quick actions
const TIME_PRESETS = [
  { label: 'Now', value: () => new Date() },
  { label: '1 hour ago', value: () => new Date(Date.now() - 60 * 60 * 1000) },
  { label: 'Start of today', value: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d } },
  { label: 'End of today', value: () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d } },
  { label: 'End of week', value: () => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); d.setHours(23, 59, 59, 999); return d } },
  { label: 'End of month', value: () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d } },
]

// Simulation range presets
const SIMULATION_PRESETS = [
  { label: 'Next 1 hour', hours: 1 },
  { label: 'Next 6 hours', hours: 6 },
  { label: 'Next 12 hours', hours: 12 },
  { label: 'Next 24 hours', hours: 24 },
  { label: 'Next 2 days', hours: 48 },
  { label: 'Next 7 days', hours: 168 },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'overdue':
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Overdue</Badge>
    case 'due':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="mr-1 h-3 w-3" />Due</Badge>
    case 'pending':
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
    case 'no_schedule':
      return <Badge variant="outline" className="text-muted-foreground">No Schedule</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function TimeMachinePanel() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [simulatedTime, setSimulatedTime] = useState<string>('')
  const [customTime, setCustomTime] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ActionResult | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [history, setHistory] = useState<ModificationHistory[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  
  // Simulation state
  const [simStartTime, setSimStartTime] = useState<string>('')
  const [simEndTime, setSimEndTime] = useState<string>('')
  const [useSimulatedTimeContext, setUseSimulatedTimeContext] = useState<boolean>(true)

  // Convert Date to datetime-local format
  const toDateTimeLocal = (date: Date) => {
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  }

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (simulatedTime) {
        params.set('simulated_time', simulatedTime)
      }
      params.set('include_disabled', 'true')

      const res = await fetch(`/api/admin/time-machine?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [simulatedTime])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === schedules.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(schedules.map(s => s.id)))
    }
  }

  const selectDue = () => {
    setSelectedIds(new Set(
      schedules.filter(s => s.status === 'due' || s.status === 'overdue').map(s => s.id)
    ))
  }

  // Action handlers
  const executeAction = async (action: string, targetTime?: string) => {
    setActionLoading(action)
    try {
      const body: Record<string, unknown> = { action }
      
      if (action !== 'trigger_cron') {
        body.schedule_ids = Array.from(selectedIds)
      }
      
      if (targetTime) {
        body.target_time = targetTime
      }

      const res = await fetch('/api/admin/time-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result: ActionResult = await res.json()
      setLastResult(result)
      setResultDialogOpen(true)

      // Add to history if there are results
      if (result.results && result.results.length > 0) {
        setHistory(prev => [{
          timestamp: new Date(),
          action,
          scheduleIds: Array.from(selectedIds),
          results: result.results
        }, ...prev].slice(0, 20)) // Keep last 20 entries
      }

      // Refresh schedules after action
      await fetchSchedules()
    } catch (err) {
      console.error(`Action ${action} failed:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMakeDue = () => executeAction('make_due')
  const handleReset = () => executeAction('reset')
  const handleTriggerCron = () => executeAction('trigger_cron')
  
  const handleSetTime = () => {
    if (customTime) {
      executeAction('set_time', new Date(customTime).toISOString())
    }
  }

  const handlePresetTime = (preset: typeof TIME_PRESETS[0]) => {
    const time = preset.value()
    setCustomTime(toDateTimeLocal(time))
  }

  const handleSimulateTime = () => {
    if (customTime) {
      setSimulatedTime(new Date(customTime).toISOString())
    }
  }

  // Simulation handlers
  const handleSimulationPreset = (hours: number) => {
    const start = new Date()
    const end = new Date(Date.now() + hours * 60 * 60 * 1000)
    setSimStartTime(toDateTimeLocal(start))
    setSimEndTime(toDateTimeLocal(end))
  }

  const handleRunSimulation = async () => {
    if (!simStartTime || !simEndTime || selectedIds.size === 0) return

    setActionLoading('simulate')
    try {
      const res = await fetch('/api/admin/time-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate',
          schedule_ids: Array.from(selectedIds),
          start_time: new Date(simStartTime).toISOString(),
          end_time: new Date(simEndTime).toISOString(),
          use_simulated_time: useSimulatedTimeContext,
        })
      })

      const result = await res.json()
      
      // Transform the results for display
      const actionResult: ActionResult = {
        success: result.success,
        action: 'simulate',
        results: [],
        summary: {
          total: result.summary?.total || 0,
          success: result.summary?.dispatched || 0,
          failed: result.summary?.failed || 0,
          dispatched: result.summary?.dispatched || 0,
        },
        simulation: result.simulation,
        simulationResults: result.results,
      }
      
      setLastResult(actionResult)
      setResultDialogOpen(true)
      await fetchSchedules()
    } catch (err) {
      console.error('Simulation failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUndoModification = async (modification: ModificationHistory) => {
    // Undo by setting back to previous values
    const scheduleUpdates = modification.results
      .filter(r => r.previous_next_run_at)
      .map(r => ({
        id: r.id,
        next_run_at: r.previous_next_run_at!
      }))

    if (scheduleUpdates.length === 0) return

    setActionLoading('undo')
    try {
      const res = await fetch('/api/admin/time-machine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: scheduleUpdates })
      })

      if (res.ok) {
        // Remove from history
        setHistory(prev => prev.filter(h => h.timestamp !== modification.timestamp))
        await fetchSchedules()
      }
    } catch (err) {
      console.error('Undo failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const dueCount = schedules.filter(s => s.status === 'due' || s.status === 'overdue').length

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Bulk actions for selected schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleMakeDue}
              disabled={selectedIds.size === 0 || actionLoading !== null}
            >
              {actionLoading === 'make_due' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              Make Due Now
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedIds.size}</Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={selectedIds.size === 0 || actionLoading !== null}
            >
              {actionLoading === 'reset' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Reset to Cron
            </Button>
            <Button
              onClick={handleTriggerCron}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'trigger_cron' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Trigger Cron Check
            </Button>
          </div>

          {/* Custom Time Setter */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Custom Time</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="flex-1"
                />
                <Select onValueChange={(v) => {
                  const preset = TIME_PRESETS.find(p => p.label === v)
                  if (preset) handlePresetTime(preset)
                }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Presets" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PRESETS.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <Button
                variant="outline"
                onClick={handleSetTime}
                disabled={!customTime || selectedIds.size === 0 || actionLoading !== null}
              >
                {actionLoading === 'set_time' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                Set Time
              </Button>
              <Button
                variant="ghost"
                onClick={handleSimulateTime}
                disabled={!customTime}
              >
                Preview
              </Button>
            </div>
          </div>

          {/* Simulated Time Indicator */}
          {simulatedTime && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 text-blue-700 text-sm">
              <Clock className="h-4 w-4" />
              <span>Simulating time: {format(new Date(simulatedTime), 'PPpp')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSimulatedTime('')}
                className="h-6 text-blue-700 hover:text-blue-900"
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Simulation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5" />
            Batch Simulation
          </CardTitle>
          <CardDescription>
            Simulate an entire time period - run all schedules that would fire within a time range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simulation Presets */}
          <div className="flex flex-wrap gap-2">
            {SIMULATION_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handleSimulationPreset(preset.hours)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Start Time</Label>
              <Input
                type="datetime-local"
                value={simStartTime}
                onChange={(e) => setSimStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">End Time</Label>
              <Input
                type="datetime-local"
                value={simEndTime}
                onChange={(e) => setSimEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Simulated Time Context Toggle */}
          <div className="flex items-center justify-between py-3 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="use-simulated-time" className="text-sm font-medium">
                Use simulated time context
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, agents will see the simulated run time instead of the actual current time
              </p>
            </div>
            <Switch
              id="use-simulated-time"
              checked={useSimulatedTimeContext}
              onCheckedChange={setUseSimulatedTimeContext}
            />
          </div>

          {/* Run Simulation Button */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {simStartTime && simEndTime && (
                <span>
                  Simulating {format(new Date(simStartTime), 'MMM d, HH:mm')} to {format(new Date(simEndTime), 'MMM d, HH:mm')}
                  {useSimulatedTimeContext && ' (agents see simulated time)'}
                </span>
              )}
            </div>
            <Button
              onClick={handleRunSimulation}
              disabled={!simStartTime || !simEndTime || selectedIds.size === 0 || actionLoading !== null}
            >
              {actionLoading === 'simulate' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FastForward className="mr-2 h-4 w-4" />
              )}
              Run Simulation
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedIds.size} schedules</Badge>
              )}
            </Button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">This will execute real tasks</p>
              <p className="text-yellow-700">Each scheduled run will create an execution record and dispatch to the agent server. Use with caution on production data.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedules
              </CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${schedules.length} schedules, ${dueCount} due or overdue`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === schedules.length ? 'Deselect All' : 'Select All'}
              </Button>
              {dueCount > 0 && (
                <Button variant="outline" size="sm" onClick={selectDue}>
                  Select Due ({dueCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === schedules.length && schedules.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time Until Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="h-10 bg-muted animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No schedules found</p>
                      <p className="text-sm">Create schedules to test time manipulation</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow
                      key={schedule.id}
                      className={selectedIds.has(schedule.id) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(schedule.id)}
                          onCheckedChange={() => toggleSelect(schedule.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{schedule.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {schedule.cron_expression}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {schedule.agent?.avatar_url ? (
                              <img
                                src={schedule.agent.avatar_url}
                                alt={schedule.agent.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Bot className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-sm">{schedule.agent?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.next_run_at ? (
                          <span className="text-sm">
                            {format(new Date(schedule.next_run_at), 'MMM d, HH:mm')}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(schedule.status)}
                        {!schedule.is_enabled && (
                          <Badge variant="outline" className="ml-1 text-muted-foreground">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {schedule.time_until_due_ms !== null ? (
                          schedule.time_until_due_ms < 0 ? (
                            <span className="text-red-600">
                              {formatDistanceToNow(new Date(schedule.next_run_at!), { addSuffix: true })}
                            </span>
                          ) : (
                            formatDistanceToNow(new Date(schedule.next_run_at!), { addSuffix: true })
                          )
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modification History */}
      {history.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    <CardTitle>Recent Modifications</CardTitle>
                    <Badge variant="secondary">{history.length}</Badge>
                  </div>
                  {historyOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {history.map((mod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-md border bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {mod.action.replace('_', ' ')} - {mod.results.length} schedule(s)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(mod.timestamp, { addSuffix: true })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {mod.results.slice(0, 3).map((r) => (
                            <Badge key={r.id} variant="outline" className="text-xs">
                              {r.name}
                            </Badge>
                          ))}
                          {mod.results.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{mod.results.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoModification(mod)}
                        disabled={actionLoading === 'undo'}
                      >
                        {actionLoading === 'undo' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        <span className="ml-1">Undo</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lastResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {lastResult?.action?.replace('_', ' ')} Result
            </DialogTitle>
            <DialogDescription>
              {lastResult?.action === 'simulate' && lastResult?.simulation ? (
                `${lastResult.simulation.total_runs} runs across ${lastResult.simulation.schedules_included} schedules`
              ) : lastResult?.summary ? (
                `${lastResult.summary.success} successful, ${lastResult.summary.failed} failed`
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {/* Simulation Summary */}
          {lastResult?.simulation && (
            <div className="p-3 rounded-md bg-muted text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Range:</span>
                <span>
                  {format(new Date(lastResult.simulation.start_time), 'MMM d, HH:mm')} - {format(new Date(lastResult.simulation.end_time), 'MMM d, HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Runs:</span>
                <span className="font-medium">{lastResult.simulation.total_runs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dispatched:</span>
                <span className="text-green-600 font-medium">{lastResult.summary?.dispatched || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed:</span>
                <span className={lastResult.summary?.failed ? 'text-red-600 font-medium' : ''}>{lastResult.summary?.failed || 0}</span>
              </div>
            </div>
          )}

          {/* Simulation Results */}
          {lastResult?.simulationResults && lastResult.simulationResults.length > 0 && (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {lastResult.simulationResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-md border ${
                      result.status === 'dispatched' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.status === 'dispatched' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{result.scheduleName}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {format(new Date(result.runTime), 'MMM d, HH:mm')}
                      </Badge>
                    </div>
                    {result.executionId && (
                      <p className="mt-1 text-xs text-muted-foreground font-mono">
                        Execution: {result.executionId.slice(0, 8)}...
                      </p>
                    )}
                    {result.error && (
                      <p className="mt-1 text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {lastResult?.cron_result && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Cron Check Result:</p>
              <p className="text-sm text-muted-foreground">{lastResult.cron_result.message}</p>
              {lastResult.cron_result.results && lastResult.cron_result.results.length > 0 && (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {lastResult.cron_result.results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted">
                        {r.status === 'dispatched' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : r.status === 'error' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        <span>{r.schedule_name}</span>
                        <Badge variant="outline" className="ml-auto">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {lastResult?.results && lastResult.results.length > 0 && !lastResult.simulationResults && (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {lastResult.results.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 rounded-md border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{result.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {result.previous_next_run_at && (
                        <span>
                          {format(new Date(result.previous_next_run_at), 'MMM d, HH:mm')}
                        </span>
                      )}
                      {result.previous_next_run_at && result.new_next_run_at && ' → '}
                      {result.new_next_run_at && (
                        <span className="font-medium text-foreground">
                          {format(new Date(result.new_next_run_at), 'MMM d, HH:mm')}
                        </span>
                      )}
                    </div>
                    {result.error && (
                      <p className="mt-1 text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
