"use client"

import { useState } from "react"
import { format } from "date-fns"
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowRightLeft
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TransactionWithCategory } from "@/lib/types"

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  onEdit?: (transaction: TransactionWithCategory) => void
  onDelete?: (transaction: TransactionWithCategory) => void
  showAccount?: boolean
}

type SortField = 'date' | 'amount' | 'description'
type SortDirection = 'asc' | 'desc'

export function TransactionTable({ 
  transactions, 
  onEdit, 
  onDelete,
  showAccount = false 
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0
    
    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case 'amount':
        comparison = a.amount - b.amount
        break
      case 'description':
        comparison = a.description.localeCompare(b.description)
        break
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount))
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions yet
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => handleSort('date')}
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => handleSort('description')}
            >
              Description
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="-mr-3 h-8"
              onClick={() => handleSort('amount')}
            >
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTransactions.map((transaction) => (
          <TableRow key={transaction.id} className="group">
            <TableCell className="text-muted-foreground">
              {format(new Date(transaction.date), 'MMM d')}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {transaction.is_transfer ? (
                  <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                ) : transaction.amount > 0 ? (
                  <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ArrowUpIcon className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <ArrowDownIcon className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                )}
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  {transaction.notes && (
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {transaction.notes}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {transaction.category ? (
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: `${transaction.category.color}20`,
                    color: transaction.category.color 
                  }}
                >
                  {transaction.category.name}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">Uncategorized</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <span className={`font-medium ${transaction.amount > 0 ? 'text-emerald-600' : ''}`}>
                {transaction.amount > 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(transaction)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}


