import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { triggerLeadStageChanged } from "@/lib/workflow-trigger-service"
import { fireWebhooks } from "@/lib/make-webhooks"

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

    // Verify lead ownership and get current stage
    const { data: currentLead, error: leadError } = await supabase
      .from("leads")
      .select("id, user_id, name, status, stage_id, workspace_id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (leadError || !currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const previousStageId = currentLead.stage_id

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

    // Fire webhooks and workflows if stage changed (non-blocking)
    if (previousStageId && stage_id !== previousStageId && currentLead.workspace_id) {
      // Fire internal workflow triggers
      triggerLeadStageChanged(
        { ...data, user_id: session.id },
        previousStageId
      ).catch((err) => {
        console.error("Error triggering lead_stage_changed workflows:", err)
      })

      // Fire Make.com webhooks
      fireWebhooks(
        "lead.stage_changed",
        {
          lead: data,
          previous_stage_id: previousStageId,
          new_stage_id: stage_id,
          stage_name: stage.name,
        },
        currentLead.workspace_id
      ).catch((err) => {
        console.error("Error firing lead.stage_changed webhooks:", err)
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead stage PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
