'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Wrench,
  ListTodo,
  FileJson,
  MessageSquare,
  DollarSign,
  Zap,
  Copy,
  Check
} from 'lucide-react'
import { format } from 'date-fns'
import { AgentScheduleExecution } from '@/types/agents'

interface ExecutionDetailsProps {
  execution: AgentScheduleExecution & {
    schedule?: {
      id: string
      name: string
      task_prompt: string
      cron_expression: string
      timezone?: string | null
      requires_approval?: boolean | null
      created_by?: string | null
      workspace_id?: string | null
      workspace?: {
        id: string
        name: string
        slug: string
      } | null
      created_by_profile?: {
        id: string
        email: string
        name: string | null
      } | null
    }
    agent?: {
      id: string
      name: string
      avatar_url: string | null
      model?: string | null
      provider?: string | null
    }
    approved_by_user?: {
      id: string
      email: string
      name: string | null
    } | null
  }
  rawApiResponse?: Record<string, unknown>
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending_approval':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
    case 'approved':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>
    case 'rejected':
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
    case 'running':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Running</Badge>
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
    case 'failed':
      return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatCost(costUsd: number | null): string {
  if (costUsd === null || costUsd === undefined) return '-'
  return `$${costUsd.toFixed(4)}`
}

function formatTokens(count: number | null): string {
  if (count === null || count === undefined) return '-'
  return count.toLocaleString()
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function ExecutionDetails({ execution, rawApiResponse }: ExecutionDetailsProps) {
  const [copied, setCopied] = useState(false)
  const result = execution.result as Record<string, unknown> | null
  const toolCalls = execution.tool_calls as Record<string, unknown>[] | null
  const scheduleName = execution.schedule?.name || 'Unknown Schedule'
  const agentName = execution.agent?.name || 'Unknown Agent'
  const workspaceName = execution.schedule?.workspace?.name || 'Unknown Workspace'
  const jsonPayload = rawApiResponse || execution

  // Try to extract message and todos from result
  const message = result?.message as string | undefined
  const todos = result?.todos as Array<{ id: string; content: string; completed: boolean }> | undefined

  const copyToClipboard = async (data: unknown) => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{scheduleName}</p>
          <p className="text-sm text-muted-foreground">
            {agentName} • {workspaceName}
          </p>
          <p className="text-xs text-muted-foreground font-mono">Execution {execution.id}</p>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2">
          {getStatusBadge(execution.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(jsonPayload)}
          >
            {copied ? (
              <Check className="mr-1 h-4 w-4" />
            ) : (
              <Copy className="mr-1 h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Task</CardTitle>
          <CardAction>
            {execution.schedule?.cron_expression ? (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {execution.schedule.cron_expression}
                {execution.schedule.timezone ? ` • ${execution.schedule.timezone}` : ''}
              </Badge>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[180px]">
            <div className="text-sm whitespace-pre-wrap">
              {execution.schedule?.task_prompt || 'No task prompt'}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Status and Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div>{getStatusBadge(execution.status)}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Duration
          </Label>
          <p className="text-sm font-medium">{formatDuration(execution.duration_ms)}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" /> Tokens
          </Label>
          <p className="text-sm font-medium">
            {formatTokens(execution.tokens_input)} / {formatTokens(execution.tokens_output)}
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Cost
          </Label>
          <p className="text-sm font-medium">{formatCost(execution.cost_usd)}</p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Scheduled For</Label>
          <p>{format(new Date(execution.scheduled_for), 'MMM d, yyyy HH:mm:ss')}</p>
        </div>
        {execution.started_at && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Started At</Label>
            <p>{format(new Date(execution.started_at), 'MMM d, yyyy HH:mm:ss')}</p>
          </div>
        )}
        {execution.completed_at && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Completed At</Label>
            <p>{format(new Date(execution.completed_at), 'MMM d, yyyy HH:mm:ss')}</p>
          </div>
        )}
      </div>

      {/* Context */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Context</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Workspace</Label>
            <p className="font-medium">
              {execution.schedule?.workspace?.name || 'Unknown Workspace'}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {execution.schedule?.workspace?.slug || execution.schedule?.workspace_id || '-'}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Agent</Label>
            <p className="font-medium">{execution.agent?.name || 'Unknown Agent'}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {execution.agent?.id || execution.agent_id}
            </p>
            {(execution.agent?.provider || execution.agent?.model) && (
              <p className="text-xs text-muted-foreground">
                {execution.agent?.provider || 'Unknown provider'}
                {execution.agent?.model ? ` • ${execution.agent.model}` : ''}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schedule</Label>
            <p className="font-medium">{execution.schedule?.name || 'Unknown Schedule'}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {execution.schedule?.id || execution.schedule_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {execution.schedule?.cron_expression || 'No cron expression'}
              {execution.schedule?.timezone ? ` • ${execution.schedule.timezone}` : ''}
            </p>
            {execution.schedule?.requires_approval !== undefined && (
              <p className="text-xs text-muted-foreground">
                Requires approval: {execution.schedule?.requires_approval ? 'Yes' : 'No'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">People</Label>
            <p className="text-sm">
              Created by:{' '}
              <span className="font-medium">
                {execution.schedule?.created_by_profile?.name || 'Unknown'}
              </span>
              {execution.schedule?.created_by_profile?.email ? (
                <span className="text-xs text-muted-foreground">
                  {' '}
                  ({execution.schedule.created_by_profile.email})
                </span>
              ) : null}
            </p>
            <p className="text-sm">
              Approved by:{' '}
              <span className="font-medium">
                {execution.approved_by_user?.name || (execution.approved_by ? 'Unknown' : 'N/A')}
              </span>
              {execution.approved_by_user?.email ? (
                <span className="text-xs text-muted-foreground">
                  {' '}
                  ({execution.approved_by_user.email})
                </span>
              ) : null}
            </p>
            {execution.approved_at && (
              <p className="text-xs text-muted-foreground">
                Approved at: {format(new Date(execution.approved_at), 'MMM d, yyyy HH:mm:ss')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {execution.error_message && (
        <div className="space-y-2">
          <Label className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Error
          </Label>
          <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive font-mono">
            {execution.error_message}
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {execution.rejection_reason && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Rejection Reason</Label>
          <div className="p-3 bg-muted rounded-md text-sm">
            {execution.rejection_reason}
          </div>
        </div>
      )}

      {/* Tabbed Results (only show if we have data) */}
      {(message || toolCalls?.length || todos?.length || result) && (
        <Tabs defaultValue="response" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="response" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Response
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              Tool Calls
              {toolCalls && toolCalls.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {toolCalls.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Todos
              {todos && todos.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {todos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-1.5">
              <FileJson className="h-3.5 w-3.5" />
              Raw JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="response" className="mt-3">
            {message ? (
              <ScrollArea className="h-[200px]">
                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                  {message}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No response message available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tools" className="mt-3">
            {toolCalls && toolCalls.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {toolCalls.map((call, index) => (
                    <div key={index} className="p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {(call as { name?: string }).name || `Tool ${index + 1}`}
                        </span>
                      </div>
                      {(call as { input?: Record<string, unknown> }).input && (
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">Input</Label>
                          <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify((call as { input?: Record<string, unknown> }).input, null, 2)}
                          </pre>
                        </div>
                      )}
                      {(call as { output?: Record<string, unknown> }).output && (
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">Output</Label>
                          <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify((call as { output?: Record<string, unknown> }).output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tool calls recorded</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="todos" className="mt-3">
            {todos && todos.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {todos.map((todo, index) => (
                    <div
                      key={todo.id || index}
                      className="flex items-start gap-2 p-3 bg-muted rounded-md"
                    >
                      <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                        todo.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground'
                      }`}>
                        {todo.completed && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {todo.content}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No todos created</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(rawApiResponse || execution)}
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                {JSON.stringify(rawApiResponse || execution, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
