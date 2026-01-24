import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"
import { triggerLeadCreated } from "@/lib/workflow-trigger-service"

// Types for opportunities response
interface OpportunityData {
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

interface LeadTag {
  id: string
  name: string
  color: string
}

interface LeadWithDetails {
  id: string
  name: string
  website: string | null
  industry: string | null
  status: string
  source: string | null
  assigned_to: string | null
  last_activity_at: string | null
  pipeline_id: string | null
  stage_id: string | null
  state: string | null
  country: string | null
  created_at: string
  contacts: { count: number }[]
  stage: { id: string; name: string; color: string | null; position: number; is_won: boolean; is_lost: boolean } | null
  opportunities?: OpportunityData[]
  tasks?: { id: string; is_completed: boolean }[]
  tag_assignments?: { tag: LeadTag }[]
  assigned_user?: { id: string; full_name: string | null; email: string | null } | null
}

// Helper to parse comma-separated query params into arrays
function parseArrayParam(param: string | null): string[] {
  if (!param) return []
  return param.split(",").map(s => s.trim()).filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams

    // Basic filters
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const pipelineId = searchParams.get("pipeline_id")
    const stageId = searchParams.get("stage_id")

    // Array filters (comma-separated)
    const industries = parseArrayParam(searchParams.get("industries"))
    const states = parseArrayParam(searchParams.get("states"))
    const countries = parseArrayParam(searchParams.get("countries"))
    const sources = parseArrayParam(searchParams.get("sources"))
    const assignedTo = parseArrayParam(searchParams.get("assigned_to"))
    const tagIds = parseArrayParam(searchParams.get("tags"))

    // Date range filters
    const createdAfter = searchParams.get("created_after")
    const createdBefore = searchParams.get("created_before")
    const lastActivityAfter = searchParams.get("last_activity_after")
    const lastActivityBefore = searchParams.get("last_activity_before")

    // Boolean toggle filters
    const hasOpportunities = searchParams.get("has_opportunities")
    const hasOpenTasks = searchParams.get("has_open_tasks")
    const hasContacts = searchParams.get("has_contacts")

    // Opportunity-related filters
    const includeOpportunities = searchParams.get("include_opportunities") === "true"
    const closeDateStart = searchParams.get("close_date_start")
    const closeDateEnd = searchParams.get("close_date_end")

    // Build the select query based on what data we need
    // Note: assigned_user and tag_assignments JOINs are excluded because they depend on
    // migrations (065, 066) that may not be applied yet. Once applied, these can be re-enabled.
    let selectParts = [
      "*",
      "contacts:contacts(count)",
      "stage:lead_pipeline_stages(id, name, color, position, is_won, is_lost)",
    ]

    // Always include tasks for filtering (we need to know about open tasks)
    selectParts.push("tasks:lead_tasks(id, is_completed)")

    if (includeOpportunities) {
      selectParts.push(`
        opportunities:lead_opportunities(
          id, name, value, probability, status, value_type,
          expected_close_date, contact_id, user_id,
          contact:contacts(id, first_name, last_name)
        )
      `)
    }

    const selectQuery = selectParts.join(",")

    let query = supabase
      .from("leads")
      .select(selectQuery)
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    // Apply basic filters
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    if (pipelineId) {
      query = query.eq("pipeline_id", pipelineId)
    }

    if (stageId) {
      query = query.eq("stage_id", stageId)
    }

    // Apply array filters
    if (industries.length > 0) {
      query = query.in("industry", industries)
    }

    if (states.length > 0) {
      query = query.in("state", states)
    }

    if (countries.length > 0) {
      query = query.in("country", countries)
    }

    if (sources.length > 0) {
      query = query.in("source", sources)
    }

    if (assignedTo.length > 0) {
      query = query.in("assigned_to", assignedTo)
    }

    // Apply date range filters
    if (createdAfter) {
      query = query.gte("created_at", createdAfter)
    }

    if (createdBefore) {
      query = query.lte("created_at", createdBefore)
    }

    if (lastActivityAfter) {
      query = query.gte("last_activity_at", lastActivityAfter)
    }

    if (lastActivityBefore) {
      query = query.lte("last_activity_at", lastActivityBefore)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching leads:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let processedData = data as LeadWithDetails[] | null

    // Apply post-query filters that require checking related data

    // Filter by tags (leads must have ALL specified tags)
    if (tagIds.length > 0 && processedData) {
      processedData = processedData.filter(lead => {
        const leadTagIds = lead.tag_assignments?.map(ta => ta.tag?.id).filter(Boolean) || []
        return tagIds.every(tagId => leadTagIds.includes(tagId))
      })
    }

    // Filter by has_opportunities toggle
    if (hasOpportunities === "true" && processedData) {
      // Need to fetch opportunities count for each lead
      const leadsWithOpps = await Promise.all(
        processedData.map(async lead => {
          const { count } = await supabase
            .from("lead_opportunities")
            .select("*", { count: "exact", head: true })
            .eq("lead_id", lead.id)
          return { lead, hasOpps: (count || 0) > 0 }
        })
      )
      processedData = leadsWithOpps.filter(l => l.hasOpps).map(l => l.lead)
    } else if (hasOpportunities === "false" && processedData) {
      const leadsWithOpps = await Promise.all(
        processedData.map(async lead => {
          const { count } = await supabase
            .from("lead_opportunities")
            .select("*", { count: "exact", head: true })
            .eq("lead_id", lead.id)
          return { lead, hasOpps: (count || 0) > 0 }
        })
      )
      processedData = leadsWithOpps.filter(l => !l.hasOpps).map(l => l.lead)
    }

    // Filter by has_open_tasks toggle
    if (hasOpenTasks === "true" && processedData) {
      processedData = processedData.filter(lead => {
        const openTasks = lead.tasks?.filter(t => !t.is_completed) || []
        return openTasks.length > 0
      })
    } else if (hasOpenTasks === "false" && processedData) {
      processedData = processedData.filter(lead => {
        const openTasks = lead.tasks?.filter(t => !t.is_completed) || []
        return openTasks.length === 0
      })
    }

    // Filter by has_contacts toggle
    if (hasContacts === "true" && processedData) {
      processedData = processedData.filter(lead => {
        const count = (lead.contacts as { count: number }[])?.[0]?.count || 0
        return count > 0
      })
    } else if (hasContacts === "false" && processedData) {
      processedData = processedData.filter(lead => {
        const count = (lead.contacts as { count: number }[])?.[0]?.count || 0
        return count === 0
      })
    }

    // Filter opportunities by date range if specified
    if (includeOpportunities && (closeDateStart || closeDateEnd) && processedData) {
      processedData = processedData.map(lead => {
        let filteredOpps = lead.opportunities || []

        if (closeDateStart) {
          filteredOpps = filteredOpps.filter(opp =>
            opp.expected_close_date && opp.expected_close_date >= closeDateStart
          )
        }

        if (closeDateEnd) {
          filteredOpps = filteredOpps.filter(opp =>
            opp.expected_close_date && opp.expected_close_date <= closeDateEnd
          )
        }

        return { ...lead, opportunities: filteredOpps }
      })
    }

    // Transform to include computed fields
    const leads = processedData?.map((lead) => ({
      ...lead,
      contactCount: (lead.contacts as { count: number }[])?.[0]?.count || 0,
      openTaskCount: lead.tasks?.filter(t => !t.is_completed).length || 0,
      tags: lead.tag_assignments?.map(ta => ta.tag).filter(Boolean) || [],
      // Clean up internal fields
      tag_assignments: undefined,
      tasks: undefined,
    }))

    // If opportunities included, calculate stage stats
    if (includeOpportunities && leads) {
      const stageStats: Record<string, { opportunityCount: number; annualizedValue: number; weightedValue: number }> = {}

      leads.forEach((lead) => {
        const stageId = lead.stage_id || "no-stage"
        if (!stageStats[stageId]) {
          stageStats[stageId] = { opportunityCount: 0, annualizedValue: 0, weightedValue: 0 }
        }

        const opps = (lead.opportunities || []) as OpportunityData[]
        opps.forEach((opp) => {
          stageStats[stageId].opportunityCount++
          const value = opp.value || 0
          const annualized = opp.value_type === "recurring" ? value * 12 : value
          stageStats[stageId].annualizedValue += annualized
          stageStats[stageId].weightedValue += annualized * ((opp.probability || 0) / 100)
        })
      })

      return NextResponse.json({ leads, stageStats })
    }

    return NextResponse.json(leads)
  } catch (error) {
    console.error("Error in leads GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      website,
      industry,
      status,
      notes,
      address,
      city,
      state,
      country,
      postal_code,
      pipeline_id,
      stage_id,
      source,
      assigned_to,
      tag_ids,
    } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // If no pipeline/stage specified, use the default pipeline and its first stage
    let finalPipelineId = pipeline_id
    let finalStageId = stage_id
    let finalStatus = status || "new"

    if (!finalPipelineId) {
      // Find or create a default pipeline
      const { data: defaultPipeline } = await supabase
        .from("lead_pipelines")
        .select(`
          id,
          stages:lead_pipeline_stages(id, name, position)
        `)
        .eq("user_id", session.id)
        .eq("is_default", true)
        .single()

      if (defaultPipeline) {
        finalPipelineId = defaultPipeline.id
        // Get the first stage (lowest position)
        const stages = defaultPipeline.stages as { id: string; name: string; position: number }[]
        if (stages && stages.length > 0) {
          const sortedStages = stages.sort((a, b) => a.position - b.position)
          finalStageId = finalStageId || sortedStages[0].id
          finalStatus = sortedStages[0].name.toLowerCase().replace(/\s+/g, "_")
        }
      }
    } else if (!finalStageId) {
      // Pipeline specified but no stage - get the first stage
      const { data: stages } = await supabase
        .from("lead_pipeline_stages")
        .select("id, name")
        .eq("pipeline_id", finalPipelineId)
        .order("position", { ascending: true })
        .limit(1)

      if (stages && stages.length > 0) {
        finalStageId = stages[0].id
        finalStatus = stages[0].name.toLowerCase().replace(/\s+/g, "_")
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: session.id,
        workspace_id: workspaceId,
        name,
        website,
        industry,
        status: finalStatus,
        notes,
        address,
        city,
        state,
        country,
        postal_code,
        pipeline_id: finalPipelineId,
        stage_id: finalStageId,
        source: source || null,
        assigned_to: assigned_to || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Assign tags if provided
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagAssignments = tag_ids.map((tagId: string) => ({
        lead_id: data.id,
        tag_id: tagId,
      }))

      const { error: tagError } = await supabase
        .from("lead_tag_assignments")
        .insert(tagAssignments)

      if (tagError) {
        console.error("Error assigning tags to lead:", tagError)
        // Don't fail the whole request, just log it
      }
    }

    // Trigger lead_created workflows (non-blocking)
    triggerLeadCreated(data).catch((err) => {
      console.error("Error triggering lead_created workflows:", err)
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in leads POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
