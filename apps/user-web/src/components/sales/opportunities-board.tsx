"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LeadOpportunityCard, SortableLeadCard, type OpportunityData } from "./lead-opportunity-card"
import type { ValueDisplayType } from "./opportunities-filter-bar"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"

// Types
interface LeadData {
  id: string
  name: string
  website: string | null
  industry: string | null
  status: string
  pipeline_id: string | null
  stage_id: string | null
  created_at: string
  contactCount: number
  stage: LeadPipelineStage | null
  opportunities: OpportunityData[]
}

interface LeadPipelineStage {
  id: string
  name: string
  color: string | null
  position: number
  is_won: boolean
  is_lost: boolean
}

interface ClientStageStats {
  leadCount: number
  opportunityCount: number
  annualizedValue: number
  weightedValue: number
}

interface OpportunitiesBoardProps {
  pipelineId: string | null
  closeDateStart?: string | null
  closeDateEnd?: string | null
  valueDisplay: ValueDisplayType
  needsAttention?: boolean
  userIds?: string[]
  onEditOpportunity?: (leadId: string, opportunity: OpportunityData) => void
}

export function OpportunitiesBoard({
  pipelineId,
  closeDateStart,
  closeDateEnd,
  valueDisplay,
  needsAttention,
  userIds,
  onEditOpportunity,
}: OpportunitiesBoardProps) {
  const [leads, setLeads] = useState<LeadData[]>([])
  const [stages, setStages] = useState<LeadPipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Use ref to track if this is the initial mount to prevent double fetches
  const hasFetched = useRef(false)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Single effect for data fetching - depends only on primitive values
  useEffect(() => {
    let isCancelled = false

    async function fetchData() {
      try {
        setLoading(true)

        // Build leads query params
        const params = new URLSearchParams()
        params.set("include_opportunities", "true")
        if (pipelineId) {
          params.set("pipeline_id", pipelineId)
        }
        if (closeDateStart) {
          params.set("close_date_start", closeDateStart)
        }
        if (closeDateEnd) {
          params.set("close_date_end", closeDateEnd)
        }

        // Fetch leads and stages in parallel
        const [leadsResponse, stagesResponse] = await Promise.all([
          fetch(`/api/leads?${params.toString()}`),
          pipelineId ? fetch(`/api/lead-pipelines/${pipelineId}/stages`) : Promise.resolve(null),
        ])

        if (isCancelled) return

        // Process leads response
        if (leadsResponse.ok) {
          const data = await leadsResponse.json()
          setLeads(data.leads || [])

          // If no pipeline selected, extract stages from leads
          if (!pipelineId) {
            const stageMap = new Map<string, LeadPipelineStage>()
            data.leads?.forEach((lead: LeadData) => {
              if (lead.stage) {
                stageMap.set(lead.stage.id, lead.stage)
              }
            })
            setStages(Array.from(stageMap.values()).sort((a, b) => a.position - b.position))
          }
        }

        // Process stages response (if pipeline selected)
        if (stagesResponse && stagesResponse.ok) {
          const stagesData = await stagesResponse.json()
          if (Array.isArray(stagesData)) {
            setStages(stagesData.sort((a: LeadPipelineStage, b: LeadPipelineStage) => a.position - b.position))
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isCancelled = true
    }
  }, [pipelineId, closeDateStart, closeDateEnd])

  // Group leads by stage and apply needsAttention filter
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, LeadData[]> = {}

    // Initialize all stages
    stages.forEach((stage) => {
      grouped[stage.id] = []
    })

    // Add "No Stage" bucket
    grouped["no-stage"] = []

    // Only include leads that have at least one opportunity
    let filteredLeads = leads.filter((lead) => lead.opportunities.length > 0)

    // Apply needsAttention filter if enabled
    if (needsAttention) {
      filteredLeads = filteredLeads.filter((lead) => {
        // Lead needs attention if it has any overdue active opportunities
        return lead.opportunities.some((opp) => {
          if (!opp.expected_close_date || opp.status !== "active") return false
          return new Date(opp.expected_close_date) < new Date()
        })
      })
    }

    // Apply user filter if any users selected
    if (userIds && userIds.length > 0) {
      filteredLeads = filteredLeads.filter((lead) => {
        // Include lead if any of its opportunities belong to selected users
        return lead.opportunities.some((opp) => opp.user_id && userIds.includes(opp.user_id))
      })
    }

    // Group by stage
    filteredLeads.forEach((lead) => {
      const stageId = lead.stage_id || "no-stage"
      if (!grouped[stageId]) {
        grouped[stageId] = []
      }
      grouped[stageId].push(lead)
    })

    return grouped
  }, [leads, stages, needsAttention, userIds])

  // Calculate stats CLIENT-SIDE from filtered data (so counts match what's displayed)
  const clientStats = useMemo(() => {
    const stats: Record<string, ClientStageStats> = {}

    Object.entries(leadsByStage).forEach(([stageId, stageLeads]) => {
      let oppCount = 0
      let annualizedValue = 0
      let weightedValue = 0

      stageLeads.forEach((lead) => {
        lead.opportunities.forEach((opp) => {
          // Only count active opportunities
          if (opp.status === "active") {
            oppCount++
            const value = opp.value || 0
            const annualized = opp.value_type === "recurring" ? value * 12 : value
            annualizedValue += annualized
            weightedValue += annualized * (opp.probability / 100)
          }
        })
      })

      stats[stageId] = {
        leadCount: stageLeads.length,
        opportunityCount: oppCount,
        annualizedValue,
        weightedValue,
      }
    })

    return stats
  }, [leadsByStage])

  // Refresh function for manual refresh
  const handleRefresh = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("include_opportunities", "true")
    if (pipelineId) params.set("pipeline_id", pipelineId)
    if (closeDateStart) params.set("close_date_start", closeDateStart)
    if (closeDateEnd) params.set("close_date_end", closeDateEnd)

    try {
      const response = await fetch(`/api/leads?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error("Error refreshing:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  // Handle drag end - move lead to new stage
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    // Determine the target stage id
    let newStageId: string | null = null

    // Check if dropped on a stage
    const isStage = stages.some((s) => s.id === overId) || overId === "no-stage"
    if (isStage) {
      newStageId = overId
    } else {
      // Dropped on a lead - find which stage that lead is in
      const targetLead = leads.find((l) => l.id === overId)
      if (targetLead) {
        newStageId = targetLead.stage_id || "no-stage"
      }
    }

    if (!newStageId) return

    // Find the lead and check if stage changed
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const currentStageId = lead.stage_id || "no-stage"
    if (currentStageId === newStageId) return

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage_id: newStageId, stage: stages.find((s) => s.id === newStageId) || null }
          : l
      )
    )

    // API call to update stage
    try {
      const response = await fetch(`/api/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      })

      if (!response.ok) {
        throw new Error("Failed to update lead stage")
      }
    } catch (error) {
      console.error("Error moving lead:", error)
      // Revert optimistic update by refreshing
      handleRefresh()
    }
  }

  // Get the active lead for drag overlay
  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  // Format currency value
  const formatValue = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Get display value based on valueDisplay setting
  const getDisplayValue = (stageId: string): string => {
    const stats = clientStats[stageId]
    if (!stats) return "$0"

    switch (valueDisplay) {
      case "weighted":
        return formatValue(stats.weightedValue)
      case "annualized":
      case "actual":
      default:
        return formatValue(stats.annualizedValue)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex gap-5 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[500px] w-80 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto px-6 pt-4 pb-6">
        <div className="flex gap-5 min-w-max pb-4">
          {/* Regular stages */}
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] || []}
              stats={clientStats[stage.id]}
              valueDisplay={valueDisplay}
              displayValue={getDisplayValue(stage.id)}
              onEditOpportunity={onEditOpportunity}
            />
          ))}

          {/* No stage column (only if there are leads without stages) */}
          {leadsByStage["no-stage"]?.length > 0 && (
            <StageColumn
              stage={{
                id: "no-stage",
                name: "No Stage",
                color: "#94a3b8",
                position: 999,
                is_won: false,
                is_lost: false,
              }}
              leads={leadsByStage["no-stage"]}
              stats={clientStats["no-stage"]}
              valueDisplay={valueDisplay}
              displayValue={getDisplayValue("no-stage")}
              onEditOpportunity={onEditOpportunity}
            />
          )}

          {/* Empty state */}
          {stages.length === 0 && leads.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full py-12 text-center">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No leads with opportunities</h3>
              <p className="text-muted-foreground max-w-md">
                Create leads and add opportunities to start tracking your sales pipeline.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeLead && (
          <LeadOpportunityCard
            lead={activeLead}
            valueDisplay={valueDisplay}
            isDragging
            className="rotate-2 shadow-2xl"
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Stage Column Component
interface StageColumnProps {
  stage: LeadPipelineStage
  leads: LeadData[]
  stats?: ClientStageStats
  valueDisplay: ValueDisplayType
  displayValue: string
  onEditOpportunity?: (leadId: string, opportunity: OpportunityData) => void
}

function StageColumn({ stage, leads, stats, displayValue, onEditOpportunity }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div className="flex flex-col w-80 shrink-0">
      {/* Stage Header - aligned with cards area */}
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: stage.color || "#94a3b8" }}
          />
          <h3 className="font-medium text-sm truncate">{stage.name}</h3>
          {/* Show lead count (what's visible) not opportunity count */}
          <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
            {leads.length}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {displayValue}
        </span>
      </div>

      {/* Cards - Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl p-4 space-y-4",
          "bg-slate-50/80 dark:bg-slate-900/50",
          "border-2 transition-all duration-200",
          isOver
            ? "border-sky-400 bg-sky-50/80 dark:bg-sky-900/30 scale-[1.01]"
            : "border-slate-200/60 dark:border-slate-700/50",
          "min-h-[200px]"
        )}
      >
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <p className="text-sm text-muted-foreground">No leads</p>
          </div>
        ) : (
          leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              id={lead.id}
              lead={lead}
              valueDisplay="annualized"
              onEditOpportunity={onEditOpportunity}
            />
          ))
        )}
      </div>
    </div>
  )
}
