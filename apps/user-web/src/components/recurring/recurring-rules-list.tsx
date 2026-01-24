"use client"

import { useState } from "react"
import { format } from "date-fns"
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Pause, 
  Play,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarClock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateRecurringRule, deleteRecurringRule } from "@/lib/queries"
import type { RecurringRule, RecurringFrequency } from "@/lib/types"

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

interface RecurringRulesListProps {
  rules: RecurringRule[]
  onEdit: (rule: RecurringRule) => void
  onUpdate: () => void
}

export function RecurringRulesList({ rules, onEdit, onUpdate }: RecurringRulesListProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount))
  }

  const handleToggleActive = async (rule: RecurringRule) => {
    setLoading(rule.id)
    try {
      await updateRecurringRule(rule.id, { is_active: !rule.is_active })
      onUpdate()
    } catch (error) {
      console.error('Failed to update rule:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (ruleId: string) => {
    setLoading(ruleId)
    try {
      await deleteRecurringRule(ruleId)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete rule:', error)
    } finally {
      setLoading(null)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No recurring transactions set up yet</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Next Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id} className={`group ${!rule.is_active ? 'opacity-50' : ''}`}>
            <TableCell>
              <div className="flex items-center gap-2">
                {rule.amount > 0 ? (
                  <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ArrowUpIcon className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <ArrowDownIcon className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                )}
                <span className="font-medium">{rule.description}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className={`font-medium ${rule.amount > 0 ? 'text-emerald-600' : ''}`}>
                {rule.amount > 0 ? '+' : '-'}{formatCurrency(rule.amount)}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {FREQUENCY_LABELS[rule.frequency]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(rule.next_date), 'MMM d, yyyy')}
            </TableCell>
            <TableCell>
              <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                {rule.is_active ? 'Active' : 'Paused'}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={loading === rule.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(rule)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleActive(rule)}>
                    {rule.is_active ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDelete(rule.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}


