"use client"

import { useMemo } from "react"
import { AlertCircle, CheckCircle2, Copy, Building2, Globe, MapPin } from "lucide-react"
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
import type { ParsedLead } from "@/lib/lead-csv-parser"
import type { LeadDuplicateCheckResult } from "@/lib/lead-duplicate-detector"

export interface LeadWithDuplicate extends ParsedLead {
  duplicateInfo?: LeadDuplicateCheckResult
}

interface LeadPreviewTableProps {
  leads: LeadWithDuplicate[]
  maxRows?: number
}

export function LeadPreviewTable({ leads, maxRows = 15 }: LeadPreviewTableProps) {
  const displayLeads = leads.slice(0, maxRows)
  const hasMore = leads.length > maxRows

  const stats = useMemo(() => {
    const valid = leads.filter((l) => l.isValid).length
    const invalid = leads.length - valid
    const duplicates = leads.filter((l) => l.duplicateInfo?.isDuplicate).length
    const withWebsite = leads.filter((l) => l.website).length
    const withIndustry = leads.filter((l) => l.industry).length

    // Count by source
    const sources: Record<string, number> = {}
    leads.forEach((l) => {
      const source = l.source || 'Unknown'
      sources[source] = (sources[source] || 0) + 1
    })

    return { valid, invalid, duplicates, withWebsite, withIndustry, sources }
  }, [leads])

  const getMatchReasonText = (reason: string | null): string => {
    switch (reason) {
      case 'exact_name_and_domain':
        return 'Exact match (name + website)'
      case 'similar_name_and_domain':
        return 'Similar name, same website'
      case 'exact_name':
        return 'Same company name'
      default:
        return 'Possible duplicate'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Preview Leads</CardTitle>
            <CardDescription>
              Review the parsed leads before importing
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{stats.valid} valid</span>
            </div>
            {stats.duplicates > 0 && (
              <div className="flex items-center gap-1.5">
                <Copy className="h-4 w-4 text-amber-500" />
                <span>{stats.duplicates} duplicate{stats.duplicates !== 1 ? 's' : ''}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-lg font-semibold">{leads.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Valid Rows</p>
            <p className="text-lg font-semibold text-emerald-600">{stats.valid}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Duplicates</p>
            <p className={`text-lg font-semibold ${stats.duplicates > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {stats.duplicates}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">With Website</p>
            <p className="text-lg font-semibold text-sky-600">{stats.withWebsite}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">With Industry</p>
            <p className="text-lg font-semibold text-violet-600">{stats.withIndustry}</p>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="w-full">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLeads.map((lead, index) => {
                  const isDuplicate = lead.duplicateInfo?.isDuplicate
                  const matchedLead = lead.duplicateInfo?.matchedLead

                  return (
                    <TableRow
                      key={index}
                      className={
                        !lead.isValid
                          ? 'bg-destructive/5'
                          : isDuplicate
                            ? 'bg-amber-50 dark:bg-amber-950/20'
                            : ''
                      }
                    >
                      <TableCell>
                        {!lead.isValid ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                {lead.errors.map((error, i) => (
                                  <p key={i} className="text-destructive">{error}</p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : isDuplicate ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Copy className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-medium">{getMatchReasonText(lead.duplicateInfo?.matchReason || null)}</p>
                                {matchedLead && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Matches: &quot;{matchedLead.name}&quot;
                                    {matchedLead.website && ` (${matchedLead.website})`}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Similarity: {lead.duplicateInfo?.similarity}%
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{lead.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {lead.website ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate text-muted-foreground">{lead.website}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.industry ? (
                          <Badge variant="secondary" className="text-xs">
                            {lead.industry}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.source ? (
                          <Badge variant="outline" className="text-xs">
                            {lead.source}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        {lead.city || lead.state || lead.country ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {hasMore && (
          <p className="text-center text-sm text-muted-foreground">
            Showing {maxRows} of {leads.length} leads
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
                  Rows with errors will be skipped during import. Make sure the Company Name column is mapped correctly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Duplicates Info */}
        {stats.duplicates > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-2">
              <Copy className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {stats.duplicates} potential duplicate{stats.duplicates > 1 ? 's' : ''} detected
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  These leads match existing records by company name and/or website domain.
                  Duplicates will be skipped by default during import.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
