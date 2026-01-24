import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, OpportunitiesResult } from "../types"

export const opportunitiesSchema = z.object({
  action: z.enum(["query", "create", "updateStage"]).default("query").describe("Action to perform: query opportunities, create a new opportunity, or update stage"),
  // Query params
  limit: z.number().optional().default(20).describe("Maximum number of opportunities to return (for query)"),
  stage: z.string().optional().describe("Filter by stage (for query) or new stage (for updateStage)"),
  leadId: z.string().optional().describe("Filter by lead ID (for query) or associate opportunity with lead (for create)"),
  minValue: z.number().optional().describe("Minimum opportunity value (for query)"),
  // Create params
  name: z.string().optional().describe("Opportunity name (required for create)"),
  value: z.number().optional().describe("Deal value (required for create)"),
  probability: z.number().optional().describe("Win probability 0-100 (for create)"),
  expectedCloseDate: z.string().optional().describe("Expected close date in ISO format (for create)"),
  notes: z.string().optional().describe("Notes about the opportunity (for create)"),
  // Update params
  opportunityId: z.string().optional().describe("Opportunity ID to update (required for updateStage)"),
})

const VALID_STAGES = ["prospect", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]

export function createOpportunitiesTool(context: ToolContext) {
  return tool({
    description: "Manage sales opportunities. Query pipeline, create new opportunities, or move deals through stages.",
    inputSchema: opportunitiesSchema,
    execute: async (params: z.infer<typeof opportunitiesSchema>): Promise<OpportunitiesResult | { success: boolean; message: string; opportunity?: any }> => {
      const { supabase, userId } = context
      const { action } = params

      // CREATE: Add a new opportunity
      if (action === "create") {
        const { name, value, leadId, stage, probability, expectedCloseDate, notes } = params

        if (!name) {
          throw new Error("Name is required to create an opportunity")
        }
        if (value === undefined) {
          throw new Error("Value is required to create an opportunity")
        }

        const { data: opportunity, error } = await supabase
          .from("lead_opportunities")
          .insert({
            user_id: userId,
            lead_id: leadId || null,
            name,
            value,
            stage: stage || "prospect",
            probability: probability || 20,
            expected_close_date: expectedCloseDate || null,
            notes: notes || null,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create opportunity: ${error.message}`)
        }

        return {
          success: true,
          message: `Opportunity "${name}" created with value $${value.toLocaleString()}`,
          opportunity,
        }
      }

      // UPDATE STAGE: Move through pipeline
      if (action === "updateStage") {
        const { opportunityId, stage } = params

        if (!opportunityId) {
          throw new Error("Opportunity ID is required to update stage")
        }
        if (!stage) {
          throw new Error("New stage is required")
        }
        if (!VALID_STAGES.includes(stage)) {
          throw new Error(`Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`)
        }

        const { data: opportunity, error } = await supabase
          .from("lead_opportunities")
          .update({ stage })
          .eq("id", opportunityId)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update opportunity stage: ${error.message}`)
        }

        return {
          success: true,
          message: `Opportunity moved to "${stage}" stage`,
          opportunity,
        }
      }

      // QUERY: Get opportunities (default)
      const { limit = 20, stage, leadId, minValue } = params

      let query = supabase
        .from("lead_opportunities")
        .select(`
          id,
          name,
          value,
          stage,
          probability,
          expected_close_date,
          notes,
          created_at,
          lead:leads (
            id,
            name
          )
        `)
        .eq("user_id", userId)
        .order("value", { ascending: false, nullsFirst: false })
        .limit(limit)

      if (stage) {
        query = query.eq("stage", stage)
      }
      if (leadId) {
        query = query.eq("lead_id", leadId)
      }
      if (minValue !== undefined) {
        query = query.gte("value", minValue)
      }

      const { data: opportunities, error } = await query

      if (error) {
        throw new Error(`Failed to fetch opportunities: ${error.message}`)
      }

      let totalValue = 0
      let weightedValue = 0
      const stageCounts: Record<string, number> = {}

      const formattedOpportunities = (opportunities || []).map((opp: any) => {
        const oppStage = opp.stage || "prospect"
        const oppValue = Number(opp.value) || 0
        const probability = opp.probability || 0

        totalValue += oppValue
        weightedValue += oppValue * (probability / 100)
        stageCounts[oppStage] = (stageCounts[oppStage] || 0) + 1

        return {
          id: opp.id,
          name: opp.name,
          value: oppValue,
          stage: oppStage,
          probability,
          expectedCloseDate: opp.expected_close_date,
          notes: opp.notes,
          createdAt: opp.created_at,
          leadName: opp.lead?.name || null,
          leadId: opp.lead?.id || null,
        }
      })

      return {
        opportunities: formattedOpportunities,
        summary: {
          count: formattedOpportunities.length,
          totalValue,
          weightedValue: Math.round(weightedValue * 100) / 100,
          byStage: stageCounts,
        },
      }
    },
  })
}
