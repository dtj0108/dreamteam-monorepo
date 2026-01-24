import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, LeadsResult } from "../types"

export const leadsSchema = z.object({
  action: z.enum(["query", "create", "updateStatus"]).default("query").describe("Action to perform: query leads, create a new lead, or update lead status"),
  // Query params
  limit: z.number().optional().default(20).describe("Maximum number of leads to return (for query)"),
  status: z.string().optional().describe("Filter by status (for query) or new status (for updateStatus)"),
  industry: z.string().optional().describe("Filter by industry (for query) or lead industry (for create)"),
  search: z.string().optional().describe("Search term for lead name or website (for query)"),
  // Create params
  name: z.string().optional().describe("Lead/company name (required for create)"),
  website: z.string().optional().describe("Company website (for create)"),
  notes: z.string().optional().describe("Notes about the lead (for create)"),
  // Update params
  leadId: z.string().optional().describe("Lead ID to update (required for updateStatus)"),
})

const VALID_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"]

export function createLeadsTool(context: ToolContext) {
  return tool({
    description: "Manage sales leads. Query leads with filters, create new leads, or update lead status through the pipeline.",
    inputSchema: leadsSchema,
    execute: async (params: z.infer<typeof leadsSchema>): Promise<LeadsResult | { success: boolean; message: string; lead?: any }> => {
      const { supabase, userId } = context
      const { action } = params

      // CREATE: Add a new lead
      if (action === "create") {
        const { name, website, industry, notes } = params

        if (!name) {
          throw new Error("Name is required to create a lead")
        }

        const { data: lead, error } = await supabase
          .from("leads")
          .insert({
            user_id: userId,
            name,
            website: website || null,
            industry: industry || null,
            notes: notes || null,
            status: "new",
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create lead: ${error.message}`)
        }

        return {
          success: true,
          message: `Lead "${name}" created successfully`,
          lead,
        }
      }

      // UPDATE STATUS: Move lead through pipeline
      if (action === "updateStatus") {
        const { leadId, status } = params

        if (!leadId) {
          throw new Error("Lead ID is required to update status")
        }
        if (!status) {
          throw new Error("New status is required")
        }
        if (!VALID_STATUSES.includes(status)) {
          throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`)
        }

        const { data: lead, error } = await supabase
          .from("leads")
          .update({ status })
          .eq("id", leadId)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update lead status: ${error.message}`)
        }

        return {
          success: true,
          message: `Lead status updated to "${status}"`,
          lead,
        }
      }

      // QUERY: Get leads (default)
      const { limit = 20, status, industry, search } = params

      let query = supabase
        .from("leads")
        .select(`
          id,
          name,
          website,
          industry,
          status,
          notes,
          created_at,
          contacts (
            id,
            first_name,
            last_name,
            email,
            phone,
            title
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq("status", status)
      }
      if (industry) {
        query = query.ilike("industry", `%${industry}%`)
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,website.ilike.%${search}%`)
      }

      const { data: leads, error } = await query

      if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`)
      }

      const statusCounts: Record<string, number> = {}
      const formattedLeads = (leads || []).map((lead: any) => {
        const leadStatus = lead.status || "new"
        statusCounts[leadStatus] = (statusCounts[leadStatus] || 0) + 1

        return {
          id: lead.id,
          name: lead.name,
          website: lead.website,
          industry: lead.industry,
          status: leadStatus,
          notes: lead.notes,
          createdAt: lead.created_at,
          contactCount: lead.contacts?.length || 0,
          primaryContact: lead.contacts?.[0] ? {
            name: `${lead.contacts[0].first_name} ${lead.contacts[0].last_name || ""}`.trim(),
            email: lead.contacts[0].email,
            phone: lead.contacts[0].phone,
            title: lead.contacts[0].title,
          } : null,
        }
      })

      return {
        leads: formattedLeads,
        summary: {
          count: formattedLeads.length,
          byStatus: statusCounts,
        },
      }
    },
  })
}
