import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/leads
 *
 * List all leads in the workspace.
 * Returns data in RPC dropdown format: { data: [{ id, name, ...}] }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")

    let query = supabase
      .from("leads")
      .select("id, name, website, industry, status, notes, address, city, state, country, postal_code, pipeline_id, stage_id, created_at, updated_at")
      .eq("workspace_id", auth.workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching leads:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in leads GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/leads
 *
 * Create a new lead.
 * Fires lead.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the user ID associated with this API key
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    if (!apiKey?.created_by) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // If no pipeline/stage specified, use the default pipeline and its first stage
    let finalPipelineId = pipeline_id
    let finalStageId = stage_id
    let finalStatus = status || "new"

    if (!finalPipelineId) {
      // Find the default pipeline for this user
      const { data: defaultPipeline } = await supabase
        .from("lead_pipelines")
        .select(`
          id,
          stages:lead_pipeline_stages(id, name, position)
        `)
        .eq("user_id", apiKey.created_by)
        .eq("is_default", true)
        .single()

      if (defaultPipeline) {
        finalPipelineId = defaultPipeline.id
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
        user_id: apiKey.created_by,
        workspace_id: auth.workspaceId,
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
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook
    await fireWebhooks("lead.created", data, auth.workspaceId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in leads POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
