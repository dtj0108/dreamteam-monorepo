'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { format, formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckCircle,
  Eye,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

interface BillingAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  description?: string | null
  status: string
  created_at: string
  acknowledged_at?: string | null
  resolved_at?: string | null
  workspace?: { id: string; name: string } | null
  acknowledged_by_user?: { id: string; email: string; name: string | null } | null
  resolved_by_user?: { id: string; email: string; name: string | null } | null
}

interface AlertsTableProps {
  alerts: BillingAlert[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary?: {
    new: number
    acknowledged: number
    resolved: number
    dismissed: number
  }
  onPageChange?: (page: number) => void
  onFilterChange?: (filters: Record<string, string>) => void
  onAction?: (alertId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => Promise<void>
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]

const severityOptions = [
  { value: 'all', label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

function getSeverityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'destructive'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'outline'
    default:
      return 'secondary'
  }
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'new':
      return 'destructive'
    case 'acknowledged':
      return 'secondary'
    case 'resolved':
      return 'default'
    case 'dismissed':
      return 'outline'
    default:
      return 'secondary'
  }
}

function formatAlertType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function AlertsTable({
  alerts,
  loading,
  pagination,
  summary,
  onPageChange,
  onFilterChange,
  onAction,
}: AlertsTableProps) {
  const [status, setStatus] = useState('open')
  const [severity, setSeverity] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleFilterChange = (newStatus?: string, newSeverity?: string) => {
    const filters: Record<string, string> = {}
    const s = newStatus || status
    const sev = newSeverity || severity
    if (s !== 'all') filters.status = s
    if (sev !== 'all') filters.severity = sev
    onFilterChange?.(filters)
  }

  const handleAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    setActionLoading(alertId)
    try {
      await onAction?.(alertId, action)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Badge variant="destructive">{summary.new}</Badge> New
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="secondary">{summary.acknowledged}</Badge> Acknowledged
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="default">{summary.resolved}</Badge> Resolved
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            handleFilterChange(v, undefined)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={severity}
          onValueChange={(v) => {
            setSeverity(v)
            handleFilterChange(undefined, v)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {severityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No alerts found</p>
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAlertType(alert.alert_type)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {alert.workspace ? (
                      <Link
                        href={`/admin/billing/workspace/${alert.workspace.id}`}
                        className="hover:underline"
                      >
                        {alert.workspace.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(alert.status)}>
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span title={format(new Date(alert.created_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === alert.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {alert.workspace && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/billing/workspace/${alert.workspace.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Workspace
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {alert.status === 'new' && (
                          <DropdownMenuItem
                            onClick={() => handleAction(alert.id, 'acknowledge')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Acknowledge
                          </DropdownMenuItem>
                        )}
                        {['new', 'acknowledged'].includes(alert.status) && (
                          <DropdownMenuItem
                            onClick={() => handleAction(alert.id, 'resolve')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Mark Resolved
                          </DropdownMenuItem>
                        )}
                        {['new', 'acknowledged'].includes(alert.status) && (
                          <DropdownMenuItem
                            onClick={() => handleAction(alert.id, 'dismiss')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Dismiss
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} alerts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
