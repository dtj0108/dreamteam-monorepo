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
import { MoreHorizontal, Pencil, Trash2, ExternalLink, Users } from "lucide-react"
import Link from "next/link"
import type { LeadStatus } from "@/types/customization"

export interface LeadRow {
  id: string
  name: string
  website?: string
  industry?: string
  status: string
  notes?: string
  contactCount: number
  created_at: string
  pipeline_id?: string
  stage_id?: string
  stage?: {
    id: string
    name: string
    color: string | null
    position: number
    is_won: boolean
    is_lost: boolean
  }
}

// Default fallback colors and labels
const defaultStatusColors: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#eab308",
  qualified: "#10b981",
  unqualified: "#6b7280",
  converted: "#a855f7",
}

const defaultStatusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
}

export type LeadActions = {
  onEdit: (lead: LeadRow) => void
  onDelete: (lead: LeadRow) => void
}

export function getLeadColumns(
  actions: LeadActions,
  statuses?: LeadStatus[]
): ColumnDef<LeadRow>[] {
  // Build dynamic color and label maps from statuses
  const statusColorMap = statuses?.reduce((acc, s) => {
    acc[s.name.toLowerCase().replace(/\s+/g, "_")] = s.color
    return acc
  }, {} as Record<string, string>) || {}

  const statusLabelMap = statuses?.reduce((acc, s) => {
    acc[s.name.toLowerCase().replace(/\s+/g, "_")] = s.name
    return acc
  }, {} as Record<string, string>) || {}
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
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const lead = row.original
        return (
          <div>
            <Link 
              href={`/sales/leads/${lead.id}`}
              className="font-medium hover:underline"
            >
              {lead.name}
            </Link>
            {lead.website && (
              <div className="text-sm text-muted-foreground">
                {lead.website.replace(/^https?:\/\//, "")}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "industry",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Industry" />
      ),
      cell: ({ row }) => {
        const industry = row.getValue("industry") as string
        return industry ? (
          <span className="text-muted-foreground">{industry}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
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
        // Use dynamic color from custom statuses, or fall back to defaults
        const color = statusColorMap[status] || defaultStatusColors[status] || "#6b7280"
        const label = statusLabelMap[status] || defaultStatusLabels[status] || status
        return (
          <Badge
            style={{ backgroundColor: color }}
            className="text-white"
          >
            {label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "contactCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contacts" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("contactCount") as number
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-4" />
            {count}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <span className="text-muted-foreground">
            {date.toLocaleDateString()}
          </span>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const lead = row.original

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
              <DropdownMenuItem asChild>
                <Link href={`/sales/leads/${lead.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onEdit(lead)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(lead)}
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

