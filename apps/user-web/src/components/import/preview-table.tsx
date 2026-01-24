"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { AlertCircle, CheckCircle2, XCircle, Copy } from "lucide-react"
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
import type { ParsedTransaction } from "@/lib/csv-parser"
import type { DuplicateCheckResult } from "@/lib/duplicate-detector"

export interface TransactionWithDuplicate extends ParsedTransaction {
  duplicateInfo?: DuplicateCheckResult
}

interface PreviewTableProps {
  transactions: TransactionWithDuplicate[]
  maxRows?: number
}

export function PreviewTable({ transactions, maxRows = 10 }: PreviewTableProps) {
  const displayTransactions = transactions.slice(0, maxRows)
  const hasMore = transactions.length > maxRows

  const stats = useMemo(() => {
    const valid = transactions.filter((t) => t.isValid).length
    const invalid = transactions.length - valid
    const duplicates = transactions.filter((t) => t.duplicateInfo?.isDuplicate).length
    const categorized = transactions.filter((t) => t.categoryId).length
    const totalIncome = transactions
      .filter((t) => t.isValid && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = transactions
      .filter((t) => t.isValid && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return { valid, invalid, duplicates, categorized, totalIncome, totalExpense }
  }, [transactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Preview Transactions</CardTitle>
            <CardDescription>
              Review the parsed transactions before importing
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
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{stats.invalid} with errors</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Transactions</p>
            <p className="text-lg font-semibold">{transactions.length}</p>
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
            <p className="text-xs text-muted-foreground">Categorized</p>
            <p className="text-lg font-semibold text-sky-600">{stats.categorized}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-lg font-semibold text-emerald-600">
              {formatCurrency(stats.totalIncome)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-semibold text-rose-600">
              {formatCurrency(stats.totalExpense)}
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
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[120px]">Amount</TableHead>
                  <TableHead className="w-[150px]">Category</TableHead>
                  <TableHead className="w-[150px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransactions.map((transaction, index) => {
                  const isDuplicate = transaction.duplicateInfo?.isDuplicate
                  const matchedTx = transaction.duplicateInfo?.matchedTransaction
                  
                  return (
                  <TableRow
                    key={index}
                    className={
                      !transaction.isValid 
                        ? 'bg-destructive/5' 
                        : isDuplicate 
                          ? 'bg-amber-50 dark:bg-amber-950/20' 
                          : ''
                    }
                  >
                    <TableCell>
                      {!transaction.isValid ? (
                        <div className="group relative">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-md text-xs">
                            {transaction.errors.map((error, i) => (
                              <p key={i} className="text-destructive">{error}</p>
                            ))}
                          </div>
                        </div>
                      ) : isDuplicate ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Copy className="h-4 w-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-medium">Possible duplicate</p>
                              {matchedTx && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Matches: &quot;{matchedTx.description}&quot; on {formatDate(matchedTx.date)}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Similarity: {transaction.duplicateInfo?.similarity}%
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          transaction.amount >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }
                      >
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.categoryName ? (
                        <Badge variant="secondary" className="text-xs">
                          {transaction.categoryName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]">
                      {transaction.notes || '-'}
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
            Showing {maxRows} of {transactions.length} transactions
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
                  Rows with errors will be skipped during import. You can adjust your
                  column mappings to fix parsing issues.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

