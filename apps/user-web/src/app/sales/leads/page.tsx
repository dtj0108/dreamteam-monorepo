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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { PlusIcon, SearchIcon, BuildingIcon, TableIcon, KanbanIcon, Upload, Trash2, GitBranch, UserPlus, Tags, Loader2 } from "lucide-react"
import { LeadForm, type Lead } from "@/components/sales/lead-form"
import { CSVImportModal } from "@/components/import/csv-import-modal"
import { LeadsKanbanBoard } from "@/components/sales/leads-kanban-board"
import { LeadsFilterBar, type LeadsFilters, type LeadTag, type WorkspaceMember } from "@/components/sales/leads-filter-bar"
import { BulkActionBar, type BulkAction } from "@/components/sales/bulk-action-bar"
import { BulkStagePicker } from "@/components/sales/bulk-stage-picker"
import { BulkAssigneePicker } from "@/components/sales/bulk-assignee-picker"
import { BulkTagsManager } from "@/components/sales/bulk-tags-manager"
import { getLeadColumns, type LeadRow } from "./columns"
import type { LeadStatus, CustomField, CustomFieldWithValue, LeadPipeline } from "@/types/customization"
import { format } from "date-fns"

// Extended LeadRow type to include new fields
interface ExtendedLeadRow extends LeadRow {
  source?: string
  assigned_to?: string
  assigned_user?: { id: string; full_name: string | null; email: string | null } | null
  tags?: LeadTag[]
  openTaskCount?: number
  state?: string
  country?: string
}

export default function LeadsPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [leads, setLeads] = React.useState<ExtendedLeadRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingLead, setEditingLead] = React.useState<ExtendedLeadRow | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingLead, setDeletingLead] = React.useState<ExtendedLeadRow | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [addingToStageId, setAddingToStageId] = React.useState<string | undefined>()
  const [importModalOpen, setImportModalOpen] = React.useState(false)

  // Bulk action state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false)
  const [showStagePicker, setShowStagePicker] = React.useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = React.useState(false)
  const [showTagsManager, setShowTagsManager] = React.useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false)

  // Customization state
  const [statuses, setStatuses] = React.useState<LeadStatus[]>([])
  const [customFields, setCustomFields] = React.useState<CustomField[]>([])
  const [editingLeadCustomValues, setEditingLeadCustomValues] = React.useState<Record<string, string>>({})

  // Pipeline state
  const [pipelines, setPipelines] = React.useState<LeadPipeline[]>([])
  const [viewMode, setViewMode] = React.useState<"table" | "kanban">("table")

  // Filter state
  const [filters, setFilters] = React.useState<LeadsFilters>({
    dateRange: undefined,
    pipelineId: null,
    stageId: null,
    statusIds: [],
    industries: [],
    states: [],
    countries: [],
    sources: [],
    assignedTo: [],
    tagIds: [],
    hasOpportunities: null,
    hasOpenTasks: null,
    hasContacts: null,
  })

  // Filter options state
  const [tags, setTags] = React.useState<LeadTag[]>([])
  const [members, setMembers] = React.useState<WorkspaceMember[]>([])
  const [availableIndustries, setAvailableIndustries] = React.useState<string[]>([])
  const [availableStates, setAvailableStates] = React.useState<string[]>([])
  const [availableCountries, setAvailableCountries] = React.useState<string[]>([])
  const [availableSources, setAvailableSources] = React.useState<string[]>([])

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch customization data (statuses, custom fields, pipelines, tags, members) on mount
  React.useEffect(() => {
    if (workspaceLoading) return

    async function fetchCustomization() {
      try {
        const [statusesRes, fieldsRes, pipelinesRes, tagsRes, membersRes] = await Promise.all([
          fetch("/api/lead-statuses"),
          fetch("/api/custom-fields?entity_type=lead"),
          fetch("/api/lead-pipelines"),
          fetch("/api/lead-tags"),
          fetch("/api/workspace-members"),
        ])

        if (statusesRes.ok) {
          const data = await statusesRes.json()
          setStatuses(data)
        }
        if (fieldsRes.ok) {
          const data = await fieldsRes.json()
          setCustomFields(data)
        }
        if (pipelinesRes.ok) {
          const data: LeadPipeline[] = await pipelinesRes.json()
          setPipelines(data)
          // Auto-select default pipeline
          const defaultPipeline = data.find((p) => p.is_default)
          if (defaultPipeline) {
            setFilters(prev => ({ ...prev, pipelineId: defaultPipeline.id }))
          } else if (data.length > 0) {
            setFilters(prev => ({ ...prev, pipelineId: data[0].id }))
          }
        }
        if (tagsRes.ok) {
          const data = await tagsRes.json()
          setTags(data)
        }
        if (membersRes.ok) {
          const data = await membersRes.json()
          setMembers(data)
        }
      } catch (error) {
        console.error("Error fetching customization data:", error)
      }
    }
    fetchCustomization()
  }, [workspaceLoading, currentWorkspace?.id])

  // Fetch unique values for filter dropdowns
  const fetchFilterOptions = React.useCallback(async (leadsData: ExtendedLeadRow[]) => {
    const industries = new Set<string>()
    const states = new Set<string>()
    const countries = new Set<string>()
    const sources = new Set<string>()

    leadsData.forEach(lead => {
      if (lead.industry) industries.add(lead.industry)
      if (lead.state) states.add(lead.state)
      if (lead.country) countries.add(lead.country)
      if (lead.source) sources.add(lead.source)
    })

    setAvailableIndustries(Array.from(industries).sort())
    setAvailableStates(Array.from(states).sort())
    setAvailableCountries(Array.from(countries).sort())
    setAvailableSources(Array.from(sources).sort())
  }, [])

  const fetchLeads = React.useCallback(async () => {
    if (workspaceLoading) return

    try {
      const params = new URLSearchParams()

      // Basic filters
      if (filters.pipelineId) params.set("pipeline_id", filters.pipelineId)
      if (filters.stageId) params.set("stage_id", filters.stageId)

      // Array filters
      if (filters.industries.length > 0) params.set("industries", filters.industries.join(","))
      if (filters.states.length > 0) params.set("states", filters.states.join(","))
      if (filters.countries.length > 0) params.set("countries", filters.countries.join(","))
      if (filters.sources.length > 0) params.set("sources", filters.sources.join(","))
      if (filters.assignedTo.length > 0) params.set("assigned_to", filters.assignedTo.join(","))
      if (filters.tagIds.length > 0) params.set("tags", filters.tagIds.join(","))

      // Date range filters
      if (filters.dateRange?.from) {
        params.set("created_after", format(filters.dateRange.from, "yyyy-MM-dd"))
      }
      if (filters.dateRange?.to) {
        params.set("created_before", format(filters.dateRange.to, "yyyy-MM-dd"))
      }

      // Boolean filters
      if (filters.hasOpportunities !== null) {
        params.set("has_opportunities", filters.hasOpportunities.toString())
      }
      if (filters.hasOpenTasks !== null) {
        params.set("has_open_tasks", filters.hasOpenTasks.toString())
      }
      if (filters.hasContacts !== null) {
        params.set("has_contacts", filters.hasContacts.toString())
      }

      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
        // Update filter options based on all leads (need to fetch unfiltered for this)
        if (params.toString() === "" || params.toString() === `pipeline_id=${filters.pipelineId}`) {
          fetchFilterOptions(data)
        }
      }
    } catch (error) {
      console.error("Error fetching leads:", error)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceLoading, filters, currentWorkspace?.id, fetchFilterOptions])

  // Initial fetch for filter options (unfiltered)
  React.useEffect(() => {
    if (workspaceLoading) return

    async function fetchInitialOptions() {
      try {
        const res = await fetch("/api/leads")
        if (res.ok) {
          const data = await res.json()
          fetchFilterOptions(data)
        }
      } catch (error) {
        console.error("Error fetching initial filter options:", error)
      }
    }
    fetchInitialOptions()
  }, [workspaceLoading, fetchFilterOptions])

  React.useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleSubmit = async (lead: Lead, customFieldValues?: Record<string, string>) => {
    const url = editingLead ? `/api/leads/${editingLead.id}` : "/api/leads"
    const method = editingLead ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to save lead" }))
      throw new Error(error.error || "Failed to save lead")
    }

    const savedLead = await res.json()

    // Save custom field values if any
    if (customFieldValues && Object.keys(customFieldValues).length > 0) {
      await fetch("/api/custom-field-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_id: savedLead.id,
          values: customFieldValues,
        }),
      })
    }

    setEditingLead(undefined)
    setEditingLeadCustomValues({})
    fetchLeads()
  }

  // Fetch custom field values when editing a lead
  const handleEdit = async (lead: ExtendedLeadRow) => {
    setEditingLead(lead)
    // Fetch custom field values for this lead
    try {
      const res = await fetch(`/api/custom-field-values?entity_id=${lead.id}&entity_type=lead`)
      if (res.ok) {
        const fieldsWithValues: CustomFieldWithValue[] = await res.json()
        const valuesMap = fieldsWithValues.reduce((acc, f) => {
          if (f.value !== null && f.value !== undefined) {
            acc[f.id] = f.value
          }
          return acc
        }, {} as Record<string, string>)
        setEditingLeadCustomValues(valuesMap)
      }
    } catch (error) {
      console.error("Error fetching custom field values:", error)
    }
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingLead) return

    const res = await fetch(`/api/leads/${deletingLead.id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      fetchLeads()
    }
    setDeletingLead(null)
    setDeleteDialogOpen(false)
  }

  // Handler for moving leads between stages (Kanban drag-drop)
  const handleMoveLead = async (leadId: string, stageId: string) => {
    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    })

    if (res.ok) {
      // Update local state optimistically
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? { ...lead, stage_id: stageId }
            : lead
        )
      )
    }
  }

  // Handler for adding lead from Kanban column
  const handleAddLeadFromKanban = (stageId: string) => {
    setAddingToStageId(stageId)
    setEditingLead(undefined)
    setFormOpen(true)
  }

  // Get the selected pipeline with stages
  const selectedPipeline = React.useMemo(() => {
    return pipelines.find((p) => p.id === filters.pipelineId) || null
  }, [pipelines, filters.pipelineId])

  const columns = React.useMemo(
    () =>
      getLeadColumns(
        {
          onEdit: handleEdit,
          onDelete: (lead) => {
            setDeletingLead(lead as ExtendedLeadRow)
            setDeleteDialogOpen(true)
          },
        },
        statuses
      ),
    [statuses]
  )

  // Filter leads by search
  const filteredLeads = React.useMemo(() => {
    if (!globalFilter) return leads
    return leads.filter((lead) =>
      lead.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
      lead.industry?.toLowerCase().includes(globalFilter.toLowerCase()) ||
      lead.website?.toLowerCase().includes(globalFilter.toLowerCase())
    )
  }, [leads, globalFilter])

  const table = useReactTable({
    data: filteredLeads,
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

  // Selected leads for bulk actions
  const selectedLeads = React.useMemo(() => {
    return table.getFilteredSelectedRowModel().rows.map((row) => row.original)
  }, [rowSelection, filteredLeads])

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const leadIds = selectedRows.map((row) => row.original.id)
    if (leadIds.length === 0) return

    setIsBulkDeleting(true)
    try {
      const response = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: leadIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete leads")
      }

      await fetchLeads()
      setRowSelection({})
    } catch (error) {
      console.error("Bulk delete error:", error)
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }

  // Bulk change stage handler
  const handleBulkChangeStage = async (stageId: string) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const leadIds = selectedRows.map((row) => row.original.id)
    if (leadIds.length === 0) return

    setIsBulkUpdating(true)
    try {
      const response = await fetch("/api/leads/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids: leadIds,
          updates: { stage_id: stageId },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update leads")
      }

      await fetchLeads()
      setRowSelection({})
    } catch (error) {
      console.error("Bulk update error:", error)
    } finally {
      setIsBulkUpdating(false)
    }
  }

  // Bulk assign handler
  const handleBulkAssign = async (userId: string | null) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const leadIds = selectedRows.map((row) => row.original.id)
    if (leadIds.length === 0) return

    setIsBulkUpdating(true)
    try {
      const response = await fetch("/api/leads/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids: leadIds,
          updates: { assigned_to: userId },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to assign leads")
      }

      await fetchLeads()
      setRowSelection({})
    } catch (error) {
      console.error("Bulk assign error:", error)
    } finally {
      setIsBulkUpdating(false)
    }
  }

  // Bulk tags handler
  const handleBulkUpdateTags = async (action: "add" | "remove" | "replace", tagIds: string[]) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const leadIds = selectedRows.map((row) => row.original.id)
    if (leadIds.length === 0) return

    setIsBulkUpdating(true)
    try {
      const response = await fetch("/api/leads/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids: leadIds,
          action,
          tag_ids: tagIds,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update tags")
      }

      await fetchLeads()
      setRowSelection({})
    } catch (error) {
      console.error("Bulk tags error:", error)
    } finally {
      setIsBulkUpdating(false)
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
    {
      id: "stage",
      label: "Change Stage",
      icon: <GitBranch className="h-4 w-4" />,
      onClick: () => setShowStagePicker(true),
      disabled: isBulkUpdating,
    },
    {
      id: "assign",
      label: "Assign",
      icon: <UserPlus className="h-4 w-4" />,
      onClick: () => setShowAssigneePicker(true),
      disabled: isBulkUpdating,
    },
    {
      id: "tags",
      label: "Tags",
      icon: <Tags className="h-4 w-4" />,
      onClick: () => setShowTagsManager(true),
      disabled: isBulkUpdating,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Manage your companies and organizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="size-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => {
            setEditingLead(undefined)
            setFormOpen(true)
          }}>
            <PlusIcon className="size-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      {mounted && (
        <LeadsFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          pipelines={pipelines}
          members={members}
          tags={tags}
          availableIndustries={availableIndustries}
          availableStates={availableStates}
          availableCountries={availableCountries}
          availableSources={availableSources}
        />
      )}

      <div className="p-6 pt-4 flex-1 flex flex-col">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <BuildingIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {leads.filter((l) => l.status === "new").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {leads.filter((l) => l.status === "qualified").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.reduce((sum, l) => sum + l.contactCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and View Mode Toggle */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          {mounted && (
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "table" | "kanban")}
              className="ml-auto"
            >
              <TabsList>
                <TabsTrigger value="table" className="gap-2">
                  <TableIcon className="size-4" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <KanbanIcon className="size-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">Loading leads...</p>
            </CardContent>
          </Card>
        ) : leads.length === 0 && viewMode === "table" ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BuildingIcon className="size-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No leads yet</CardTitle>
              <CardDescription className="text-center max-w-sm mb-4">
                Add your first lead to start tracking companies and their
                contacts.
              </CardDescription>
              <Button onClick={() => setFormOpen(true)}>Add Your First Lead</Button>
            </CardContent>
          </Card>
        ) : viewMode === "kanban" ? (
          <div className="flex-1 min-h-[500px]">
            <LeadsKanbanBoard
              pipeline={selectedPipeline}
              leads={filteredLeads.map((lead) => ({
                ...lead,
                stage_id: lead.stage_id,
                contactCount: lead.contactCount || 0,
              }))}
              onLeadClick={(lead) => handleEdit(lead as ExtendedLeadRow)}
              onAddLead={handleAddLeadFromKanban}
              onDeleteLead={(leadId) => {
                const lead = leads.find((l) => l.id === leadId)
                if (lead) {
                  setDeletingLead(lead)
                  setDeleteDialogOpen(true)
                }
              }}
              onMoveLead={handleMoveLead}
            />
          </div>
        ) : (
          <div className="space-y-4 flex-1">
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
                        No leads found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} />
          </div>
        )}
      </div>

      {/* Lead Form */}
      <LeadForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingLead(undefined)
            setEditingLeadCustomValues({})
            setAddingToStageId(undefined)
          }
        }}
        lead={editingLead}
        onSubmit={handleSubmit}
        statuses={statuses}
        customFields={customFields}
        customFieldValues={editingLeadCustomValues}
        pipelines={pipelines}
        defaultPipelineId={filters.pipelineId || undefined}
        defaultStageId={addingToStageId}
        members={members}
        tags={tags}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLead?.name}"? This will also
              delete all contacts associated with this lead. This action cannot
              be undone.
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

      {/* CSV Import Modal */}
      <CSVImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={fetchLeads}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected
              lead{selectedLeads.length !== 1 ? "s" : ""} and all associated contacts.
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

      {/* Bulk Stage Picker */}
      <BulkStagePicker
        open={showStagePicker}
        onOpenChange={setShowStagePicker}
        pipelines={pipelines}
        selectedCount={selectedLeads.length}
        onApply={handleBulkChangeStage}
      />

      {/* Bulk Assignee Picker */}
      <BulkAssigneePicker
        open={showAssigneePicker}
        onOpenChange={setShowAssigneePicker}
        members={members}
        selectedCount={selectedLeads.length}
        onApply={handleBulkAssign}
      />

      {/* Bulk Tags Manager */}
      <BulkTagsManager
        open={showTagsManager}
        onOpenChange={setShowTagsManager}
        tags={tags}
        selectedCount={selectedLeads.length}
        onApply={handleBulkUpdateTags}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedLeads.length}
        onClearSelection={() => setRowSelection({})}
        actions={bulkActions}
      />
    </div>
  )
}
