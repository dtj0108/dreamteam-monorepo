"use client"

import { ColumnDef } from "@tanstack/react-table"
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
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { MoreHorizontal, Pencil, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OpportunityRow {
  id: string
  name: string
  value: number | null
  probability: number
  status: string
  value_type: string
  expected_close_date: string | null
  lead_id: string
  lead_name: string
  stage_id: string | null
  pipeline_name?: string
  stage_name?: string
  stage_color?: string | null
  contact: { id: string; first_name: string | null; last_name: string | null } | null
  user: { id: string; full_name: string | null; email: string | null } | null
}

export type OpportunityActions = {
  onEdit: (opportunity: OpportunityRow) => void
  onDelete: (opportunity: OpportunityRow) => void
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function getOpportunityColumns(
  actions: OpportunityActions
): ColumnDef<OpportunityRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
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
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Opportunity" />
      ),
      cell: ({ row }) => {
        const opportunity = row.original
        return (
          <div>
            <button
              onClick={() => actions.onEdit(opportunity)}
              className="font-medium hover:underline text-left"
            >
              {opportunity.name}
            </button>
          </div>
        )
      },
    },
    {
      accessorKey: "lead_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Lead" />
      ),
      cell: ({ row }) => {
        const leadName = row.getValue("lead_name") as string
        return <span className="text-muted-foreground">{leadName}</span>
      },
    },
    {
      accessorKey: "pipeline_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pipeline" />
      ),
      cell: ({ row }) => {
        const pipelineName = row.getValue("pipeline_name") as string
        return pipelineName ? (
          <span className="text-muted-foreground">{pipelineName}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "stage_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stage" />
      ),
      cell: ({ row }) => {
        const stageName = row.getValue("stage_name") as string
        const stageColor = row.original.stage_color
        return stageName ? (
          <div className="flex items-center gap-2">
            {stageColor && (
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: stageColor }}
              />
            )}
            <span>{stageName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Value" />
      ),
      cell: ({ row }) => {
        const value = row.getValue("value") as number | null
        const valueType = row.original.value_type
        return (
          <div>
            <span className="font-medium">{formatCurrency(value)}</span>
            {value !== null && valueType === "recurring" && (
              <span className="text-xs text-muted-foreground ml-1">/yr</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "probability",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Probability" />
      ),
      cell: ({ row }) => {
        const probability = row.getValue("probability") as number
        const colorClass =
          probability >= 75
            ? "text-green-600"
            : probability >= 50
            ? "text-yellow-600"
            : probability >= 25
            ? "text-orange-600"
            : "text-red-600"
        return <span className={cn("font-medium", colorClass)}>{probability}%</span>
      },
    },
    {
      accessorKey: "expected_close_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Close Date" />
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("expected_close_date") as string | null
        if (!dateStr) {
          return <span className="text-muted-foreground/50">—</span>
        }
        const date = new Date(dateStr)
        const overdue = isOverdue(dateStr)
        return (
          <div className={cn("flex items-center gap-1", overdue && "text-red-600")}>
            {overdue && <AlertCircle className="size-3" />}
            <span>{date.toLocaleDateString()}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "user",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Owner" />
      ),
      cell: ({ row }) => {
        const user = row.original.user
        if (!user) {
          return <span className="text-muted-foreground/50">—</span>
        }
        return (
          <span className="text-muted-foreground">
            {user.full_name || user.email || "Unknown"}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const colorMap: Record<string, string> = {
          active: "#3b82f6",
          won: "#22c55e",
          lost: "#ef4444",
        }
        const color = colorMap[status] || "#6b7280"
        return (
          <Badge style={{ backgroundColor: color }} className="text-white capitalize">
            {status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const opportunity = row.original

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
              <DropdownMenuItem onClick={() => actions.onEdit(opportunity)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(opportunity)}
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
