'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Bot, Users, Settings, Search, X, Filter } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string | null
  model: string
  is_enabled: boolean
  is_head: boolean
  current_version: number
  published_version: number | null
  created_at: string
  tier_required: 'startup' | 'teams' | 'enterprise' | null
  product_line: 'v2' | 'v3' | 'v4' | null
  department?: {
    id: string
    name: string
    icon?: string
  } | null
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [productLineFilter, setProductLineFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Create form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newModel, setNewModel] = useState('sonnet')
  const [newPrompt, setNewPrompt] = useState('You are a helpful AI assistant.')

  const fetchAgents = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await fetch('/api/admin/agents')
      const data = await res.json()

      if (res.ok) {
        setAgents(data.agents || [])
      } else {
        setFetchError(data.error || `Failed to fetch agents (${res.status})`)
      }
    } catch {
      setFetchError('Network error - please refresh the page')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Get unique departments for filter
  const departments = Array.from(
    new Map(
      agents
        .filter(a => a.department)
        .map(a => [a.department!.id, a.department!])
    ).values()
  )

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = agent.name.toLowerCase().includes(query)
      const matchesDesc = agent.description?.toLowerCase().includes(query)
      if (!matchesName && !matchesDesc) return false
    }

    // Tier filter
    if (tierFilter !== 'all' && agent.tier_required !== tierFilter) return false

    // Product line filter
    if (productLineFilter !== 'all' && agent.product_line !== productLineFilter) return false

    // Status filter
    if (statusFilter === 'enabled' && !agent.is_enabled) return false
    if (statusFilter === 'disabled' && agent.is_enabled) return false

    // Department filter
    if (departmentFilter !== 'all') {
      if (departmentFilter === 'none' && agent.department) return false
      if (departmentFilter !== 'none' && agent.department?.id !== departmentFilter) return false
    }

    return true
  })

  // Count agents by tier for stats
  const tierCounts = {
    startup: agents.filter(a => a.tier_required === 'startup').length,
    teams: agents.filter(a => a.tier_required === 'teams').length,
    enterprise: agents.filter(a => a.tier_required === 'enterprise').length,
    unassigned: agents.filter(a => !a.tier_required).length,
  }

  async function handleToggleEnabled(agent: Agent) {
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !agent.is_enabled })
    })

    if (res.ok) {
      fetchAgents()
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newPrompt.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription || null,
          model: newModel,
          system_prompt: newPrompt
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCreateOpen(false)
        setNewName('')
        setNewDescription('')
        setNewModel('sonnet')
        setNewPrompt('You are a helpful AI assistant.')
        router.push(`/admin/agents/${data.agent.id}`)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(errorData.error || `Failed to create agent (${res.status})`)
      }
    } catch {
      setCreateError('Network error - please try again')
    }

    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">Configure and manage AI agents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Create a new AI agent and configure it in the Agent Builder
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Sales Assistant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief description of the agent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={newModel} onValueChange={setNewModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haiku">Claude Haiku 4.5 (Fast)</SelectItem>
                    <SelectItem value="sonnet">Claude Sonnet 4.5 (Balanced)</SelectItem>
                    <SelectItem value="opus">Claude Opus 4.5 (Most Capable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Initial System Prompt</Label>
                <Textarea
                  id="prompt"
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {createError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateError(null) }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{agents.length} agents</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700">
          <span className="text-sm font-medium">V2</span>
          <span className="text-sm font-bold">{tierCounts.startup}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
          <span className="text-sm font-medium">V3</span>
          <span className="text-sm font-bold">{tierCounts.teams}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
          <span className="text-sm font-medium">V4</span>
          <span className="text-sm font-bold">{tierCounts.enterprise}</span>
        </div>
        {tierCounts.unassigned > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700">
            <span className="text-sm font-medium">Unassigned</span>
            <span className="text-sm font-bold">{tierCounts.unassigned}</span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <div className="text-destructive font-medium">Error loading agents:</div>
            <div className="text-sm text-destructive/80">{fetchError}</div>
            <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search and filter row */}
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Tier Filter */}
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="startup">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Startup
                    </div>
                  </SelectItem>
                  <SelectItem value="teams">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Teams
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Enterprise
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Product Line Filter */}
              <Select value={productLineFilter} onValueChange={setProductLineFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lines</SelectItem>
                  <SelectItem value="v2">V2</SelectItem>
                  <SelectItem value="v3">V3</SelectItem>
                  <SelectItem value="v4">V4</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filters and results count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(searchQuery || tierFilter !== 'all' || productLineFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all') && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      Showing {filteredAgents.length} of {agents.length} agents
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setTierFilter('all')
                        setProductLineFilter('all')
                        setStatusFilter('all')
                        setDepartmentFilter('all')
                      }}
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear filters
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No agents configured yet. Click &quot;Create Agent&quot; to get started.
                </TableCell>
              </TableRow>
            ) : filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No agents match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/agents/${agent.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.name}</span>
                      {agent.is_head && (
                        <Badge variant="secondary" className="text-xs">Head</Badge>
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {agent.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {agent.product_line && agent.tier_required ? (
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={
                            agent.tier_required === 'startup' ? 'bg-green-50 text-green-700 border-green-200' :
                            agent.tier_required === 'teams' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-purple-50 text-purple-700 border-purple-200'
                          }
                        >
                          {agent.product_line.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{agent.tier_required}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {agent.department?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{agent.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">v{agent.current_version || 1}</Badge>
                      {agent.published_version && (
                        <Badge variant="default" className="text-xs">Published</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_enabled ? 'default' : 'secondary'}>
                      {agent.is_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={agent.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(agent)}
                    />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/agents/${agent.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
