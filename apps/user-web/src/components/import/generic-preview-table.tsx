"use client"

import { useMemo } from "react"
import { AlertCircle, CheckCircle2, Link2Off, User, Briefcase, ListTodo } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { LeadMatchResult } from "@/lib/lead-matcher"

// Base interface for any parsed entity
export interface ParsedEntityBase {
  lead_name: string
  isValid: boolean
  errors: string[]
  leadMatchResult?: LeadMatchResult
}

// Contact entity
export interface ParsedContactEntity extends ParsedEntityBase {
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  notes?: string | null
}

// Opportunity entity
export interface ParsedOpportunityEntity extends ParsedEntityBase {
  name: string
  value: number | null
  probability: number | null
  expected_close_date: string | null
  status: string | null
  notes?: string | null
}

// Task entity
export interface ParsedTaskEntity extends ParsedEntityBase {
  title: string
  description: string | null
  due_date: string | null
  notes?: string | null
}

export type EntityType = 'contact' | 'opportunity' | 'task'

interface GenericPreviewTableProps<T extends ParsedEntityBase> {
  entities: T[]
  entityType: EntityType
  maxRows?: number
}

// Type guards
function isContact(entity: ParsedEntityBase): entity is ParsedContactEntity {
  return 'first_name' in entity
}

function isOpportunity(entity: ParsedEntityBase): entity is ParsedOpportunityEntity {
  return 'value' in entity && 'probability' in entity
}

function isTask(entity: ParsedEntityBase): entity is ParsedTaskEntity {
  return 'title' in entity && 'due_date' in entity && !('value' in entity)
}

const ENTITY_LABELS: Record<EntityType, { singular: string; plural: string; icon: typeof User }> = {
  contact: { singular: 'Contact', plural: 'Contacts', icon: User },
  opportunity: { singular: 'Opportunity', plural: 'Opportunities', icon: Briefcase },
  task: { singular: 'Task', plural: 'Tasks', icon: ListTodo },
}

export function GenericPreviewTable<T extends ParsedEntityBase>({
  entities,
  entityType,
  maxRows = 15,
}: GenericPreviewTableProps<T>) {
  const displayEntities = entities.slice(0, maxRows)
  const hasMore = entities.length > maxRows
  const labels = ENTITY_LABELS[entityType]
  const Icon = labels.icon

  const stats = useMemo(() => {
    const valid = entities.filter((e) => e.isValid).length
    const invalid = entities.length - valid
    const matched = entities.filter((e) => e.leadMatchResult?.matchedLead).length
    const unmatched = entities.filter((e) => e.leadMatchResult && !e.leadMatchResult.matchedLead).length

    return { valid, invalid, matched, unmatched }
  }, [entities])

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  const renderEntityRow = (entity: T, index: number) => {
    const isUnmatched = entity.leadMatchResult && !entity.leadMatchResult.matchedLead

    return (
      <TableRow
        key={index}
        className={
          !entity.isValid
            ? 'bg-destructive/5'
            : isUnmatched
              ? 'bg-amber-50 dark:bg-amber-950/20'
              : ''
        }
      >
        <TableCell>
          {!entity.isValid ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {entity.errors.map((error, i) => (
                    <p key={i} className="text-destructive">{error}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : isUnmatched ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link2Off className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-medium">Lead not found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No matching lead for &quot;{entity.lead_name}&quot;
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </TableCell>
        <TableCell className="max-w-[150px]">
          <span className="truncate text-sm">{entity.lead_name || '-'}</span>
          {entity.leadMatchResult?.matchedLead && entity.leadMatchResult.matchType === 'fuzzy' && (
            <Badge variant="outline" className="ml-2 text-xs">
              ~{entity.leadMatchResult.confidence}%
            </Badge>
          )}
        </TableCell>

        {/* Entity-specific columns */}
        {isContact(entity) && (
          <>
            <TableCell className="font-medium">
              {entity.first_name} {entity.last_name || ''}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {entity.email || '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {entity.phone || '-'}
            </TableCell>
            <TableCell>
              {entity.title ? (
                <Badge variant="secondary" className="text-xs">{entity.title}</Badge>
              ) : '-'}
            </TableCell>
          </>
        )}

        {isOpportunity(entity) && (
          <>
            <TableCell className="font-medium max-w-[150px]">
              <span className="truncate">{entity.name}</span>
            </TableCell>
            <TableCell className="text-sm font-medium text-emerald-600">
              {formatCurrency(entity.value)}
            </TableCell>
            <TableCell className="text-sm">
              {entity.probability !== null ? `${entity.probability}%` : '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(entity.expected_close_date)}
            </TableCell>
            <TableCell>
              {entity.status ? (
                <Badge variant={entity.status === 'won' ? 'default' : entity.status === 'lost' ? 'destructive' : 'secondary'} className="text-xs">
                  {entity.status}
                </Badge>
              ) : '-'}
            </TableCell>
          </>
        )}

        {isTask(entity) && (
          <>
            <TableCell className="font-medium max-w-[200px]">
              <span className="truncate">{entity.title}</span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[200px]">
              <span className="truncate">{entity.description || '-'}</span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(entity.due_date)}
            </TableCell>
          </>
        )}
      </TableRow>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Preview {labels.plural}
            </CardTitle>
            <CardDescription>
              Review the parsed {labels.plural.toLowerCase()} before importing
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{stats.valid} valid</span>
            </div>
            {stats.unmatched > 0 && (
              <div className="flex items-center gap-1.5">
                <Link2Off className="h-4 w-4 text-amber-500" />
                <span>{stats.unmatched} unmatched</span>
              </div>
            )}
            {stats.invalid > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>{stats.invalid} with errors</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total {labels.plural}</p>
            <p className="text-lg font-semibold">{entities.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Valid Rows</p>
            <p className="text-lg font-semibold text-emerald-600">{stats.valid}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Matched Leads</p>
            <p className="text-lg font-semibold text-sky-600">{stats.matched}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Unmatched</p>
            <p className={`text-lg font-semibold ${stats.unmatched > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {stats.unmatched}
            </p>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="w-full">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Lead/Company</TableHead>

                  {/* Entity-specific headers */}
                  {entityType === 'contact' && (
                    <>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Title</TableHead>
                    </>
                  )}
                  {entityType === 'opportunity' && (
                    <>
                      <TableHead>Deal Name</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  )}
                  {entityType === 'task' && (
                    <>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Due Date</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayEntities.map((entity, index) => renderEntityRow(entity, index))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {hasMore && (
          <p className="text-center text-sm text-muted-foreground">
            Showing {maxRows} of {entities.length} {labels.plural.toLowerCase()}
          </p>
        )}

        {/* Errors Summary */}
        {stats.invalid > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  {stats.invalid} row{stats.invalid > 1 ? 's' : ''} with errors
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Rows with errors will be skipped during import. Make sure all required fields are mapped correctly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unmatched Leads Info */}
        {stats.unmatched > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-2">
              <Link2Off className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {stats.unmatched} {labels.plural.toLowerCase()} with unmatched leads
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  These {labels.plural.toLowerCase()} reference leads that don&apos;t exist in your workspace.
                  They will be skipped during import unless you create the leads first.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
