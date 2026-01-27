"use client"

import * as React from "react"
import { useWorkspace } from "@/providers/workspace-provider"
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { SearchIcon, UsersIcon, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { getContactColumns, type ContactRow } from "./columns"
import { BulkActionBar, type BulkAction } from "@/components/sales/bulk-action-bar"

export default function ContactsPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [contacts, setContacts] = React.useState<ContactRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingContact, setDeletingContact] = React.useState<ContactRow | null>(null)

  // Bulk action state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false)

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const fetchContacts = React.useCallback(async () => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return

    try {
      const params = new URLSearchParams()
      if (globalFilter) params.set("search", globalFilter)

      const res = await fetch(`/api/contacts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data)
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceLoading, globalFilter, currentWorkspace?.id])

  React.useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Debounce search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      fetchContacts()
    }, 300)
    return () => clearTimeout(timeout)
  }, [globalFilter, fetchContacts])

  const handleDelete = async () => {
    if (!deletingContact) return

    const res = await fetch(`/api/contacts/${deletingContact.id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      fetchContacts()
    }
    setDeletingContact(null)
    setDeleteDialogOpen(false)
  }

  const columns = React.useMemo(
    () =>
      getContactColumns({
        onEdit: (contact) => {
          // Navigate to lead detail page for editing
          window.location.href = `/sales/leads/${contact.lead_id}`
        },
        onDelete: (contact) => {
          setDeletingContact(contact)
          setDeleteDialogOpen(true)
        },
      }),
    []
  )

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  // Selected contacts for bulk actions (must be after table definition)
  const selectedContacts = React.useMemo(() => {
    return table.getFilteredSelectedRowModel().rows.map((row) => row.original)
  }, [rowSelection, contacts])

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const contactIds = selectedRows.map((row) => row.original.id)

    if (contactIds.length === 0) return

    setIsBulkDeleting(true)
    try {
      const response = await fetch("/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_ids: contactIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete contacts")
      }

      await fetchContacts()
      setRowSelection({})
    } catch (error) {
      console.error("Bulk delete error:", error)
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }

  // Bulk actions configuration
  const bulkActions: BulkAction[] = [
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => setBulkDeleteDialogOpen(true),
      loading: isBulkDeleting,
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <p className="text-muted-foreground">
          All contacts across your leads
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-9"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">Loading contacts...</p>
          </CardContent>
        </Card>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UsersIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No contacts yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Add contacts to your leads to see them here.
            </CardDescription>
            <Button asChild>
              <Link href="/sales/leads">Go to Leads</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No contacts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingContact?.first_name} {deletingContact?.last_name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedContacts.length} contact{selectedContacts.length !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected
              contact{selectedContacts.length !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedContacts.length}
        onClearSelection={() => setRowSelection({})}
        actions={bulkActions}
      />
    </div>
  )
}
