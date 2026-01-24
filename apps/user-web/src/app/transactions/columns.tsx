"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ArrowRightLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  CheckSquare,
  Square,
  Layers
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import type { TransactionWithCategory } from "@/lib/types"

// Action handlers type
export type TransactionActions = {
  onEdit: (transaction: TransactionWithCategory) => void
  onDelete: (transaction: TransactionWithCategory) => void
}

// Header checkbox with select all options
function SelectAllHeader({ table }: { table: import("@tanstack/react-table").Table<TransactionWithCategory> }) {
  const [open, setOpen] = useState(false)
  
  const isAllPageSelected = table.getIsAllPageRowsSelected()
  const isSomePageSelected = table.getIsSomePageRowsSelected()
  const isAllSelected = table.getIsAllRowsSelected()
  const totalRows = table.getFilteredRowModel().rows.length
  const pageSize = table.getState().pagination.pageSize
  const currentPageRows = table.getRowModel().rows.length
  
  // If there's only one page or fewer rows than page size, just use simple checkbox
  if (totalRows <= pageSize) {
    return (
      <Checkbox
        checked={isAllPageSelected || (isSomePageSelected && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    )
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center justify-center h-4 w-4 focus:outline-none"
          aria-label="Select options"
        >
          {isAllSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : isAllPageSelected || isSomePageSelected ? (
            <div className="flex items-center justify-center h-4 w-4 rounded-sm border border-primary bg-primary">
              <div className="h-2 w-2 bg-primary-foreground rounded-sm" />
            </div>
          ) : (
            <div className="h-4 w-4 rounded-sm border border-input bg-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex flex-col gap-1">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left"
            onClick={() => {
              table.toggleAllPageRowsSelected(true)
              setOpen(false)
            }}
          >
            <CheckSquare className="h-4 w-4" />
            Select this page ({currentPageRows})
          </button>
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left"
            onClick={() => {
              table.toggleAllRowsSelected(true)
              setOpen(false)
            }}
          >
            <Layers className="h-4 w-4" />
            Select all {totalRows} transactions
          </button>
          {(isAllPageSelected || isSomePageSelected || isAllSelected) && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left text-muted-foreground"
                onClick={() => {
                  table.toggleAllRowsSelected(false)
                  setOpen(false)
                }}
              >
                <Square className="h-4 w-4" />
                Clear selection
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Create columns with action handlers
export function getColumns(actions: TransactionActions): ColumnDef<TransactionWithCategory>[] {
  return [
    {
      id: "select",
      header: ({ table }) => <SelectAllHeader table={table} />,
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"))
        return (
          <div className="text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const transaction = row.original
        const isIncome = transaction.amount > 0
        const isTransfer = transaction.is_transfer

        return (
          <div className="flex items-center gap-3">
            {isTransfer ? (
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="h-4 w-4 text-gray-600" />
              </div>
            ) : isIncome ? (
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ArrowUpIcon className="h-4 w-4 text-emerald-600" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <ArrowDownIcon className="h-4 w-4 text-gray-600" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium truncate">{transaction.description}</div>
              {transaction.notes && (
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {transaction.notes}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const transaction = row.original
        const category = transaction.category

        if (!category) {
          return <span className="text-muted-foreground text-sm">Uncategorized</span>
        }

        return (
          <Badge
            variant="secondary"
            style={{
              backgroundColor: `${category.color}20`,
              color: category.color,
            }}
          >
            {category.name}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        const category = row.original.category
        if (!category) return value.includes("uncategorized")
        return value.includes(category.id)
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" className="justify-end" />
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Math.abs(amount))

        return (
          <div className={`text-right font-medium ${amount > 0 ? "text-emerald-600" : ""}`}>
            {amount > 0 ? "+" : "-"}{formatted}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const transaction = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(transaction.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onEdit(transaction)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(transaction)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

