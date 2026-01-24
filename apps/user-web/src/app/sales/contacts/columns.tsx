"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { MoreHorizontal, Pencil, Trash2, ExternalLink, Mail, Phone } from "lucide-react"
import Link from "next/link"

export interface ContactRow {
  id: string
  lead_id: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  title?: string
  notes?: string
  created_at: string
  lead: {
    id: string
    name: string
  }
}

export type ContactActions = {
  onEdit: (contact: ContactRow) => void
  onDelete: (contact: ContactRow) => void
}

export function getContactColumns(actions: ContactActions): ColumnDef<ContactRow>[] {
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
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const contact = row.original
        const fullName = `${contact.first_name} ${contact.last_name || ""}`.trim()
        const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Link 
                href={`/sales/leads/${contact.lead_id}`}
                className="font-medium hover:underline"
              >
                {fullName}
              </Link>
              {contact.title && (
                <div className="text-sm text-muted-foreground">{contact.title}</div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return email ? (
          <a 
            href={`mailto:${email}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Mail className="size-3.5" />
            {email}
          </a>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <a 
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Phone className="size-3.5" />
            {phone}
          </a>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "lead",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const contact = row.original
        return (
          <Link 
            href={`/sales/leads/${contact.lead_id}`}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {contact.lead?.name}
          </Link>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const contact = row.original

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
                <Link href={`/sales/leads/${contact.lead_id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Lead
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onEdit(contact)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(contact)}
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

