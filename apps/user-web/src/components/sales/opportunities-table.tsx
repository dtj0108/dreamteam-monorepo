"use client"

import { useMemo, useCallback } from "react"
import { DataTable } from "@/components/ui/data-table"
import {
  getOpportunityColumns,
  type OpportunityRow,
  type OpportunityActions,
} from "@/app/sales/opportunities/columns"

interface OpportunitiesTableProps {
  opportunities: OpportunityRow[]
  onEdit: (opportunity: OpportunityRow) => void
  onDelete: (opportunityId: string) => void
}

export function OpportunitiesTable({
  opportunities,
  onEdit,
  onDelete,
}: OpportunitiesTableProps) {
  const actions: OpportunityActions = useMemo(
    () => ({
      onEdit,
      onDelete: (opportunity) => onDelete(opportunity.id),
    }),
    [onEdit, onDelete]
  )

  const columns = useMemo(() => getOpportunityColumns(actions), [actions])

  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No opportunities found</p>
          <p className="text-sm">Create opportunities from leads to see them here</p>
        </div>
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={opportunities}
      showRowSelection={true}
    />
  )
}
