import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH - Move lead to a different stage (optimized for Kanban drag-drop)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { stage_id, pipeline_id } = body

    if (!stage_id) {
      return NextResponse.json({ error: "stage_id is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Verify stage exists and belongs to user's pipeline
    const { data: stage, error: stageError } = await supabase
      .from("lead_pipeline_stages")
      .select(`
        id,
        pipeline_id,
        name,
        pipeline:lead_pipelines(user_id)
      `)
      .eq("id", stage_id)
      .single()

    if (stageError || !stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    // Check pipeline ownership through the joined data
    const pipelineData = stage.pipeline as { user_id: string } | null
    if (!pipelineData || pipelineData.user_id !== session.id) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    // Update the lead's stage (and optionally pipeline if moving between pipelines)
    const updates: Record<string, unknown> = { stage_id }
    if (pipeline_id) {
      updates.pipeline_id = pipeline_id
    } else {
      updates.pipeline_id = stage.pipeline_id
    }

    // Also update the status field to match the stage name for backward compatibility
    updates.status = stage.name.toLowerCase().replace(/\s+/g, "_")

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating lead stage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead stage PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
