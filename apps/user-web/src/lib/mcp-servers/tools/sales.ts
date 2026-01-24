/**
 * Sales MCP Tool
 *
 * Manages sales operations: pipelines, deals, activities, and contacts
 */

import { z } from "zod"
import type { MCPToolContext, MCPToolResponse } from "../types"
import { formatActionableError, formatCurrency, truncateText } from "../types"

// ============================================================================
// SCHEMA
// ============================================================================

export const salesSchema = z.object({
  entity: z.enum(["pipelines", "deals", "activities", "contacts"]).describe("The entity to operate on"),
  action: z.enum(["query", "create", "update", "moveStage", "logActivity", "close"]).describe("The action to perform"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),

  // Pipeline params
  pipelineId: z.string().optional().describe("Pipeline ID for filtering or operations"),
  pipelineName: z.string().optional().describe("Name for new pipeline"),
  isDefault: z.boolean().optional().describe("Whether pipeline is the default"),
  stages: z
    .array(
      z.object({
        name: z.string(),
        color: z.string().optional(),
        winProbability: z.number().min(0).max(100).optional(),
      })
    )
    .optional()
    .describe("Stages for new pipeline"),

  // Deal params
  dealId: z.string().optional().describe("Deal ID for operations"),
  dealName: z.string().optional().describe("Name for new deal"),
  stageId: z.string().optional().describe("Stage ID for deal operations"),
  contactId: z.string().optional().describe("Contact ID for deal/activity"),
  value: z.number().optional().describe("Deal value in currency"),
  currency: z.string().optional().default("USD").describe("Currency code"),
  expectedCloseDate: z.string().optional().describe("Expected close date (ISO format)"),
  probability: z.number().min(0).max(100).optional().describe("Deal probability 0-100"),
  status: z.enum(["open", "won", "lost"]).optional().describe("Deal status for close action"),
  notes: z.string().optional().describe("Notes for deal or activity"),

  // Activity params
  activityId: z.string().optional().describe("Activity ID for operations"),
  activityType: z.enum(["call", "email", "meeting", "note", "task"]).optional().describe("Activity type"),
  subject: z.string().optional().describe("Activity subject"),
  description: z.string().optional().describe("Activity description"),
  dueDate: z.string().optional().describe("Due date for task activities"),
  isCompleted: z.boolean().optional().describe("Whether activity is completed"),

  // Query params
  limit: z.number().optional().default(50).describe("Max records to fetch"),
})

type SalesInput = z.infer<typeof salesSchema>

// ============================================================================
// EXECUTE
// ============================================================================

export async function executeSales(
  input: SalesInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { entity, action, responseFormat } = input

  try {
    // ========================================================================
    // PIPELINES
    // ========================================================================
    if (entity === "pipelines") {
      // QUERY pipelines
      if (action === "query") {
        const { data: pipelines, error } = await supabase
          .from("pipelines")
          .select(`
            id, name, description, is_default, created_at,
            stages:pipeline_stages(id, name, color, position, win_probability)
          `)
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw new Error(error.message)

        // Sort stages by position
        const formatted = (pipelines || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          isDefault: p.is_default,
          stages: (p.stages || []).sort((a: any, b: any) => a.position - b.position),
        }))

        if (responseFormat === "concise") {
          const lines = formatted.map(
            (p) => `${p.name}${p.isDefault ? " (default)" : ""}: ${p.stages.length} stages`
          )
          return {
            success: true,
            data: {
              summary: `${formatted.length} pipelines`,
              pipelines: lines.join("\n"),
            },
          }
        }

        return { success: true, data: { pipelines: formatted } }
      }

      // CREATE pipeline
      if (action === "create") {
        const { pipelineName, isDefault, stages } = input
        if (!pipelineName) {
          return { success: false, error: "pipelineName is required to create a pipeline." }
        }

        // If setting as default, unset others first
        if (isDefault) {
          await supabase
            .from("pipelines")
            .update({ is_default: false })
            .eq("profile_id", userId)
        }

        const { data: pipeline, error: pipelineError } = await supabase
          .from("pipelines")
          .insert({
            profile_id: userId,
            name: pipelineName,
            description: input.notes || null,
            is_default: isDefault || false,
          })
          .select()
          .single()

        if (pipelineError) throw new Error(pipelineError.message)

        // Create stages if provided
        if (stages && stages.length > 0) {
          const stageRecords = stages.map((stage, index) => ({
            pipeline_id: pipeline.id,
            name: stage.name,
            color: stage.color || null,
            position: index,
            win_probability: stage.winProbability || 0,
          }))

          const { error: stagesError } = await supabase
            .from("pipeline_stages")
            .insert(stageRecords)

          if (stagesError) {
            // Rollback pipeline
            await supabase.from("pipelines").delete().eq("id", pipeline.id)
            throw new Error(stagesError.message)
          }
        }

        return {
          success: true,
          data: { message: `Pipeline "${pipelineName}" created.`, id: pipeline.id },
        }
      }
    }

    // ========================================================================
    // DEALS
    // ========================================================================
    if (entity === "deals") {
      // QUERY deals
      if (action === "query") {
        const { pipelineId, stageId, status, limit = 50 } = input

        let query = supabase
          .from("deals")
          .select(`
            id, name, value, currency, status, probability,
            expected_close_date, notes, created_at,
            contact:contacts(id, first_name, last_name, email, company),
            stage:pipeline_stages(id, name, color, win_probability)
          `)
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (pipelineId) {
          query = query.eq("pipeline_id", pipelineId)
        }
        if (stageId) {
          query = query.eq("stage_id", stageId)
        }
        if (status) {
          query = query.eq("status", status)
        }

        const { data: deals, error } = await query

        if (error) throw new Error(error.message)

        const formatted = (deals || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          value: d.value,
          currency: d.currency,
          status: d.status,
          probability: d.probability,
          expectedCloseDate: d.expected_close_date,
          contact: d.contact
            ? `${d.contact.first_name} ${d.contact.last_name}`.trim() || d.contact.email
            : null,
          stage: d.stage?.name || null,
          stageColor: d.stage?.color || null,
        }))

        if (responseFormat === "concise") {
          const lines = formatted.map((d) => {
            const valueStr = d.value ? formatCurrency(d.value, d.currency) : "No value"
            return `${d.name} - ${valueStr} (${d.stage || "No stage"}) [${d.status}]`
          })
          return {
            success: true,
            data: {
              summary: `${formatted.length} deals`,
              deals: lines.join("\n"),
            },
          }
        }

        return { success: true, data: { deals: formatted } }
      }

      // CREATE deal
      if (action === "create") {
        const { dealName, pipelineId, stageId, contactId, value, currency, expectedCloseDate, probability, notes } = input
        if (!dealName) {
          return { success: false, error: "dealName is required to create a deal." }
        }

        // Verify stage belongs to pipeline if both provided
        if (stageId && pipelineId) {
          const { data: stage, error: stageError } = await supabase
            .from("pipeline_stages")
            .select("id")
            .eq("id", stageId)
            .eq("pipeline_id", pipelineId)
            .single()

          if (stageError || !stage) {
            return { success: false, error: "Stage does not belong to the specified pipeline." }
          }
        }

        const { data: deal, error } = await supabase
          .from("deals")
          .insert({
            profile_id: userId,
            name: dealName,
            contact_id: contactId || null,
            pipeline_id: pipelineId || null,
            stage_id: stageId || null,
            value: value || null,
            currency: currency || "USD",
            expected_close_date: expectedCloseDate || null,
            probability: probability || null,
            notes: notes || null,
            status: "open",
          })
          .select()
          .single()

        if (error) throw new Error(error.message)

        return {
          success: true,
          data: { message: `Deal "${dealName}" created.`, id: deal.id },
        }
      }

      // UPDATE deal
      if (action === "update") {
        const { dealId, dealName, value, currency, expectedCloseDate, probability, notes } = input
        if (!dealId) {
          return { success: false, error: "dealId is required to update a deal." }
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (dealName !== undefined) updates.name = dealName
        if (value !== undefined) updates.value = value
        if (currency !== undefined) updates.currency = currency
        if (expectedCloseDate !== undefined) updates.expected_close_date = expectedCloseDate
        if (probability !== undefined) updates.probability = probability
        if (notes !== undefined) updates.notes = notes

        const { error } = await supabase
          .from("deals")
          .update(updates)
          .eq("id", dealId)
          .eq("profile_id", userId)

        if (error) throw new Error(error.message)

        return { success: true, data: { message: "Deal updated." } }
      }

      // MOVE STAGE
      if (action === "moveStage") {
        const { dealId, stageId } = input
        if (!dealId || !stageId) {
          return { success: false, error: "dealId and stageId are required to move a deal." }
        }

        // Get deal to verify ownership and pipeline
        const { data: deal, error: dealError } = await supabase
          .from("deals")
          .select("id, pipeline_id")
          .eq("id", dealId)
          .eq("profile_id", userId)
          .single()

        if (dealError || !deal) {
          return { success: false, error: "Deal not found." }
        }

        // Verify stage belongs to deal's pipeline
        const { data: stage, error: stageError } = await supabase
          .from("pipeline_stages")
          .select("id, name, win_probability")
          .eq("id", stageId)
          .eq("pipeline_id", deal.pipeline_id)
          .single()

        if (stageError || !stage) {
          return { success: false, error: "Stage does not belong to the deal's pipeline." }
        }

        // Update deal
        const { error } = await supabase
          .from("deals")
          .update({
            stage_id: stageId,
            probability: stage.win_probability,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dealId)

        if (error) throw new Error(error.message)

        return {
          success: true,
          data: { message: `Deal moved to "${stage.name}" stage.` },
        }
      }

      // CLOSE deal (won/lost)
      if (action === "close") {
        const { dealId, status } = input
        if (!dealId) {
          return { success: false, error: "dealId is required to close a deal." }
        }
        if (!status || (status !== "won" && status !== "lost")) {
          return { success: false, error: "status must be 'won' or 'lost' to close a deal." }
        }

        const { error } = await supabase
          .from("deals")
          .update({
            status,
            probability: status === "won" ? 100 : 0,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", dealId)
          .eq("profile_id", userId)

        if (error) throw new Error(error.message)

        return {
          success: true,
          data: { message: `Deal marked as ${status}.` },
        }
      }
    }

    // ========================================================================
    // ACTIVITIES
    // ========================================================================
    if (entity === "activities") {
      // QUERY activities
      if (action === "query") {
        const { dealId, contactId, limit = 50 } = input

        let query = supabase
          .from("activities")
          .select(`
            id, type, subject, description, due_date, is_completed, completed_at, created_at,
            contact:contacts(id, first_name, last_name, email),
            deal:deals(id, name, value, status)
          `)
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (dealId) {
          query = query.eq("deal_id", dealId)
        }
        if (contactId) {
          query = query.eq("contact_id", contactId)
        }

        const { data: activities, error } = await query

        if (error) throw new Error(error.message)

        const formatted = (activities || []).map((a: any) => ({
          id: a.id,
          type: a.type,
          subject: a.subject,
          description: a.description,
          dueDate: a.due_date,
          isCompleted: a.is_completed,
          contact: a.contact
            ? `${a.contact.first_name} ${a.contact.last_name}`.trim()
            : null,
          deal: a.deal?.name || null,
          createdAt: a.created_at,
        }))

        if (responseFormat === "concise") {
          const lines = formatted.map((a) => {
            const status = a.isCompleted ? "✓" : "○"
            const subject = a.subject ? truncateText(a.subject, 40) : a.type
            return `${status} [${a.type}] ${subject}${a.deal ? ` - ${a.deal}` : ""}`
          })
          return {
            success: true,
            data: {
              summary: `${formatted.length} activities`,
              activities: lines.join("\n"),
            },
          }
        }

        return { success: true, data: { activities: formatted } }
      }

      // LOG ACTIVITY (create)
      if (action === "logActivity" || action === "create") {
        const { activityType, subject, description, dealId, contactId, dueDate, isCompleted } = input
        if (!activityType) {
          return { success: false, error: "activityType is required to log an activity." }
        }

        const { data: activity, error } = await supabase
          .from("activities")
          .insert({
            profile_id: userId,
            type: activityType,
            subject: subject || null,
            description: description || null,
            contact_id: contactId || null,
            deal_id: dealId || null,
            due_date: dueDate || null,
            is_completed: isCompleted || false,
            completed_at: isCompleted ? new Date().toISOString() : null,
          })
          .select()
          .single()

        if (error) throw new Error(error.message)

        return {
          success: true,
          data: { message: `Activity logged: ${activityType}`, id: activity.id },
        }
      }

      // UPDATE activity (mark complete)
      if (action === "update") {
        const { activityId, isCompleted, subject, description } = input
        if (!activityId) {
          return { success: false, error: "activityId is required to update an activity." }
        }

        const updates: Record<string, unknown> = {}
        if (isCompleted !== undefined) {
          updates.is_completed = isCompleted
          updates.completed_at = isCompleted ? new Date().toISOString() : null
        }
        if (subject !== undefined) updates.subject = subject
        if (description !== undefined) updates.description = description

        const { error } = await supabase
          .from("activities")
          .update(updates)
          .eq("id", activityId)
          .eq("profile_id", userId)

        if (error) throw new Error(error.message)

        return { success: true, data: { message: "Activity updated." } }
      }
    }

    // ========================================================================
    // CONTACTS
    // ========================================================================
    if (entity === "contacts") {
      // QUERY contacts
      if (action === "query") {
        const { limit = 50 } = input

        const { data: contacts, error } = await supabase
          .from("contacts")
          .select(`
            id, first_name, last_name, email, phone, company,
            job_title, avatar_url, created_at
          `)
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (error) throw new Error(error.message)

        const formatted = (contacts || []).map((c: any) => ({
          id: c.id,
          name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
          email: c.email,
          phone: c.phone,
          company: c.company,
          jobTitle: c.job_title,
        }))

        if (responseFormat === "concise") {
          const lines = formatted.map((c) => {
            const parts = [c.name]
            if (c.company) parts.push(`(${c.company})`)
            if (c.email) parts.push(`- ${c.email}`)
            return parts.join(" ")
          })
          return {
            success: true,
            data: {
              summary: `${formatted.length} contacts`,
              contacts: lines.join("\n"),
            },
          }
        }

        return { success: true, data: { contacts: formatted } }
      }

      // CREATE contact
      if (action === "create") {
        const { notes: firstName } = input // Reuse notes for firstName temporarily
        // For a proper implementation, we'd need firstName, lastName params
        // Using a simplified approach with minimal params

        return {
          success: false,
          error: "Contact creation via this tool is limited. Use the CRM tool (manageCRM) for full contact management.",
          hint: "Use manageCRM with entity='contacts' for comprehensive contact operations.",
        }
      }
    }

    return { success: false, error: `Unknown entity/action: ${entity}.${action}` }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const salesToolDefinition = {
  name: "manageSales",
  description:
    "Manage sales operations. Query pipelines and deals, move deals between stages, log activities (calls, emails, meetings), and track deal progress.",
  schema: salesSchema,
  execute: executeSales,
}

export type SalesToolName = "manageSales"
