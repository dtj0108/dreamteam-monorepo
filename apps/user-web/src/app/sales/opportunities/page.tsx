"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  OpportunitiesKanbanBoard,
  type KanbanOpportunity,
} from "@/components/sales/opportunities-kanban-board"
import { OpportunitiesTable } from "@/components/sales/opportunities-table"
import type { OpportunityRow } from "./columns"
import {
  OpportunitiesFilterBar,
  type OpportunitiesFilters,
  type LeadPipeline,
  type WorkspaceMember,
} from "@/components/sales/opportunities-filter-bar"
import { OpportunityForm, type LeadOpportunity } from "@/components/sales/opportunity-form"
import { useWorkspace } from "@/providers/workspace-provider"

// Raw opportunity from API
interface RawOpportunity {
  id: string
  name: string
  value: number | null
  probability: number
  status: string
  value_type: string
  expected_close_date: string | null
  contact_id: string | null
  user_id: string | null
  contact: { id: string; first_name: string | null; last_name: string | null } | null
  user: { id: string; full_name: string | null; email: string | null } | null
}

// Raw lead from API
interface RawLead {
  id: string
  name: string
  website: string | null
  industry: string | null
  status: string
  pipeline_id: string | null
  stage_id: string | null
  created_at: string
  contactCount: number
  stage: {
    id: string
    name: string
    color: string | null
    position: number
    is_won: boolean
    is_lost: boolean
  } | null
  opportunities: RawOpportunity[]
}

export default function OpportunitiesPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [pipelines, setPipelines] = useState<LeadPipeline[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [filters, setFilters] = useState<OpportunitiesFilters>({
    dateRange: undefined,
    pipelineId: null,
    userIds: [],
    needsAttention: false,
    valueDisplay: "annualized",
  })
  const [leads, setLeads] = useState<RawLead[]>([])
  const [loading, setLoading] = useState(true)

  // State for editing/creating opportunity
  const [editingOpportunity, setEditingOpportunity] = useState<KanbanOpportunity | null>(null)
  const [creatingForStageId, setCreatingForStageId] = useState<string | null>(null)

  // Get selected pipeline (null means "All Pipelines" - will show table view)
  const selectedPipeline = useMemo(() => {
    if (!filters.pipelineId) return null
    return pipelines.find((p) => p.id === filters.pipelineId) || null
  }, [pipelines, filters.pipelineId])

  // Fetch pipelines on mount
  useEffect(() => {
    if (workspaceLoading || !currentWorkspace?.id) return

    async function fetchPipelines() {
      try {
        const response = await fetch("/api/lead-pipelines")
        if (!response.ok) throw new Error("Failed to fetch pipelines")
        const data = await response.json()
        setPipelines(data || [])

        // Set default pipeline if one exists
        const defaultPipeline = data?.find((p: LeadPipeline) => p.is_default)
        if (defaultPipeline) {
          setFilters((prev) => ({ ...prev, pipelineId: defaultPipeline.id }))
        }
      } catch (error) {
        console.error("Error fetching pipelines:", error)
      }
    }

    fetchPipelines()
  }, [workspaceLoading, currentWorkspace?.id])

  // Fetch workspace members when workspace changes
  useEffect(() => {
    if (workspaceLoading || !currentWorkspace?.id) return
    const workspaceId = currentWorkspace.id

    async function fetchMembers() {
      try {
        const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
        if (!response.ok) throw new Error("Failed to fetch members")
        const data = await response.json()

        const transformed: WorkspaceMember[] = data
          .filter((m: { profile: unknown }) => m.profile !== null)
          .map(
            (m: {
              id: string
              display_name: string | null
              profile: { id: string; name: string; avatar_url: string | null; email: string }
            }) => ({
              id: m.id,
              profileId: m.profile.id,
              name: m.profile.name,
              displayName: m.display_name,
              avatarUrl: m.profile.avatar_url,
              email: m.profile.email,
            })
          )

        setMembers(transformed)
      } catch (error) {
        console.error("Error fetching members:", error)
      }
    }

    fetchMembers()
  }, [workspaceLoading, currentWorkspace?.id])

  // Format dates for API
  const closeDateStart = filters.dateRange?.from
    ? format(filters.dateRange.from, "yyyy-MM-dd")
    : null
  const closeDateEnd = filters.dateRange?.to ? format(filters.dateRange.to, "yyyy-MM-dd") : null

  // Fetch leads with opportunities
  useEffect(() => {
    if (workspaceLoading || !currentWorkspace?.id) return

    async function fetchLeads() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set("include_opportunities", "true")
        if (filters.pipelineId) {
          params.set("pipeline_id", filters.pipelineId)
        }
        if (closeDateStart) {
          params.set("close_date_start", closeDateStart)
        }
        if (closeDateEnd) {
          params.set("close_date_end", closeDateEnd)
        }

        const response = await fetch(`/api/leads?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch leads")
        const data = await response.json()
        setLeads(data.leads || [])
      } catch (error) {
        console.error("Error fetching leads:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [workspaceLoading, filters.pipelineId, closeDateStart, closeDateEnd])

  // Flatten leads into opportunities for the Kanban board
  const opportunities: KanbanOpportunity[] = useMemo(() => {
    const result: KanbanOpportunity[] = []

    leads.forEach((lead) => {
      if (!lead.opportunities || lead.opportunities.length === 0) return

      // Filter to only active opportunities
      let opps = lead.opportunities.filter((opp) => opp.status === "active")

      // Apply needsAttention filter
      if (filters.needsAttention) {
        opps = opps.filter((opp) => {
          if (!opp.expected_close_date) return false
          return new Date(opp.expected_close_date) < new Date()
        })
      }

      // Apply user filter
      if (filters.userIds && filters.userIds.length > 0) {
        opps = opps.filter((opp) => opp.user_id && filters.userIds.includes(opp.user_id))
      }

      // Add flattened opportunities
      opps.forEach((opp) => {
        result.push({
          id: opp.id,
          name: opp.name,
          value: opp.value,
          probability: opp.probability,
          status: opp.status,
          value_type: opp.value_type,
          expected_close_date: opp.expected_close_date,
          lead_id: lead.id,
          lead_name: lead.name,
          stage_id: lead.stage_id,
          contact: opp.contact,
          user: opp.user,
        })
      })
    })

    return result
  }, [leads, filters.needsAttention, filters.userIds])

  // Flatten leads into opportunities for the table view (includes all statuses and pipeline info)
  const tableOpportunities: OpportunityRow[] = useMemo(() => {
    const result: OpportunityRow[] = []

    leads.forEach((lead) => {
      if (!lead.opportunities || lead.opportunities.length === 0) return

      // Find pipeline info for this lead
      const pipeline = pipelines.find((p) => p.id === lead.pipeline_id)

      // Apply filters but include all statuses (not just active)
      let opps = [...lead.opportunities]

      // Apply needsAttention filter
      if (filters.needsAttention) {
        opps = opps.filter((opp) => {
          if (!opp.expected_close_date) return false
          return new Date(opp.expected_close_date) < new Date()
        })
      }

      // Apply user filter
      if (filters.userIds && filters.userIds.length > 0) {
        opps = opps.filter((opp) => opp.user_id && filters.userIds.includes(opp.user_id))
      }

      // Add flattened opportunities with pipeline/stage info
      opps.forEach((opp) => {
        result.push({
          id: opp.id,
          name: opp.name,
          value: opp.value,
          probability: opp.probability,
          status: opp.status,
          value_type: opp.value_type,
          expected_close_date: opp.expected_close_date,
          lead_id: lead.id,
          lead_name: lead.name,
          stage_id: lead.stage_id,
          pipeline_name: pipeline?.name,
          stage_name: lead.stage?.name,
          stage_color: lead.stage?.color,
          contact: opp.contact,
          user: opp.user,
        })
      })
    })

    return result
  }, [leads, pipelines, filters.needsAttention, filters.userIds])

  // Handle opportunity click (edit) - for Kanban
  const handleOpportunityClick = useCallback((opportunity: KanbanOpportunity) => {
    setEditingOpportunity(opportunity)
  }, [])

  // Handle table row edit click
  const handleTableEdit = useCallback((opportunity: OpportunityRow) => {
    // Convert to KanbanOpportunity format for the form
    setEditingOpportunity({
      id: opportunity.id,
      name: opportunity.name,
      value: opportunity.value,
      probability: opportunity.probability,
      status: opportunity.status,
      value_type: opportunity.value_type,
      expected_close_date: opportunity.expected_close_date,
      lead_id: opportunity.lead_id,
      lead_name: opportunity.lead_name,
      stage_id: opportunity.stage_id,
      contact: opportunity.contact,
      user: opportunity.user,
    })
  }, [])

  // Handle add opportunity - navigate to leads page
  const handleAddOpportunity = useCallback((stageId: string) => {
    setCreatingForStageId(stageId)
    // Navigate to leads page to create an opportunity on a lead
    window.location.href = "/sales/leads"
  }, [])

  // Handle delete opportunity
  const handleDeleteOpportunity = useCallback(
    async (opportunityId: string) => {
      // Find the opportunity to get the lead_id
      const opp = opportunities.find((o) => o.id === opportunityId)
      if (!opp) return

      try {
        const response = await fetch(
          `/api/leads/${opp.lead_id}/opportunities/${opportunityId}`,
          {
            method: "DELETE",
          }
        )

        if (!response.ok) {
          throw new Error("Failed to delete opportunity")
        }

        // Update local state
        setLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== opp.lead_id) return lead
            return {
              ...lead,
              opportunities: lead.opportunities.filter((o) => o.id !== opportunityId),
            }
          })
        )
      } catch (error) {
        console.error("Error deleting opportunity:", error)
      }
    },
    [opportunities]
  )

  // Handle move opportunity (moves the parent lead to a new stage)
  const handleMoveOpportunity = useCallback(
    async (opportunityId: string, newStageId: string) => {
      // Find the opportunity to get the lead_id
      const opp = opportunities.find((o) => o.id === opportunityId)
      if (!opp) return

      // Find the lead
      const lead = leads.find((l) => l.id === opp.lead_id)
      if (!lead || lead.stage_id === newStageId) return

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== opp.lead_id) return l
          return { ...l, stage_id: newStageId }
        })
      )

      try {
        const response = await fetch(`/api/leads/${opp.lead_id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage_id: newStageId }),
        })

        if (!response.ok) {
          throw new Error("Failed to move opportunity")
        }
      } catch (error) {
        console.error("Error moving opportunity:", error)
        // Revert on error
        setLeads((prev) =>
          prev.map((l) => {
            if (l.id !== opp.lead_id) return l
            return { ...l, stage_id: lead.stage_id }
          })
        )
      }
    },
    [opportunities, leads]
  )

  // Handle opportunity form submit (update)
  const handleOpportunitySubmit = async (formData: LeadOpportunity) => {
    if (!editingOpportunity) return

    try {
      const response = await fetch(
        `/api/leads/${editingOpportunity.lead_id}/opportunities/${editingOpportunity.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update opportunity")
      }

      // Update local state
      const { opportunity: updated } = await response.json()
      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== editingOpportunity.lead_id) return lead
          return {
            ...lead,
            opportunities: lead.opportunities.map((o) =>
              o.id === editingOpportunity.id ? { ...o, ...updated } : o
            ),
          }
        })
      )

      setEditingOpportunity(null)
    } catch (error) {
      console.error("Error updating opportunity:", error)
      throw error
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Opportunities</h1>
        <p className="text-muted-foreground">
          Track opportunities across your pipeline stages
        </p>
      </div>

      {/* Filter Bar */}
      <OpportunitiesFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        pipelines={pipelines}
        members={members}
      />

      {/* Content: Table or Kanban Board */}
      <div className="flex-1 min-h-0 px-6 py-4 overflow-auto">
        {loading ? (
          <div className="flex gap-5 overflow-hidden h-full">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-full w-80 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : selectedPipeline ? (
          <OpportunitiesKanbanBoard
            pipeline={selectedPipeline}
            opportunities={opportunities}
            onOpportunityClick={handleOpportunityClick}
            onAddOpportunity={handleAddOpportunity}
            onDeleteOpportunity={handleDeleteOpportunity}
            onMoveOpportunity={handleMoveOpportunity}
            valueDisplay={filters.valueDisplay}
          />
        ) : (
          <OpportunitiesTable
            opportunities={tableOpportunities}
            onEdit={handleTableEdit}
            onDelete={handleDeleteOpportunity}
          />
        )}
      </div>

      {/* Edit Opportunity Dialog */}
      <OpportunityForm
        open={editingOpportunity !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOpportunity(null)
          }
        }}
        opportunity={
          editingOpportunity
            ? {
                id: editingOpportunity.id,
                name: editingOpportunity.name,
                value: editingOpportunity.value ?? undefined,
                probability: editingOpportunity.probability,
                expected_close_date: editingOpportunity.expected_close_date ?? undefined,
                status: editingOpportunity.status as "active" | "won" | "lost",
                value_type: editingOpportunity.value_type as "one_time" | "recurring",
                contact_id: editingOpportunity.contact?.id ?? undefined,
              }
            : undefined
        }
        onSubmit={handleOpportunitySubmit}
      />
    </div>
  )
}
