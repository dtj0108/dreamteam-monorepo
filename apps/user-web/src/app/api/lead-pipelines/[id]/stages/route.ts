import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Get all stages for a pipeline
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const supabase = createAdminClient()

    // Verify pipeline ownership
    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (pipelineError || !pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("lead_pipeline_stages")
      .select("*")
      .eq("pipeline_id", id)
      .order("position", { ascending: true })

    if (error) {
      console.error("Error fetching pipeline stages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in pipeline stages GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a new stage to pipeline
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, color, is_won, is_lost } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify pipeline ownership
    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (pipelineError || !pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // Get the highest position
    const { data: existing } = await supabase
      .from("lead_pipeline_stages")
      .select("position")
      .eq("pipeline_id", id)
      .order("position", { ascending: false })
      .limit(1)

    const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { data, error } = await supabase
      .from("lead_pipeline_stages")
      .insert({
        pipeline_id: id,
        name,
        color: color || "#6b7280",
        position,
        is_won: is_won || false,
        is_lost: is_lost || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating pipeline stage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in pipeline stages POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update multiple stages (for reordering or bulk updates)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { stages } = body

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Stages array is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify pipeline ownership
    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (pipelineError || !pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // Update each stage
    for (const stage of stages) {
      if (!stage.id) continue

      const updates: Record<string, unknown> = {}
      if (stage.name !== undefined) updates.name = stage.name
      if (stage.color !== undefined) updates.color = stage.color
      if (stage.position !== undefined) updates.position = stage.position
      if (stage.is_won !== undefined) updates.is_won = stage.is_won
      if (stage.is_lost !== undefined) updates.is_lost = stage.is_lost

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("lead_pipeline_stages")
          .update(updates)
          .eq("id", stage.id)
          .eq("pipeline_id", id)
      }
    }

    // Fetch updated stages
    const { data, error } = await supabase
      .from("lead_pipeline_stages")
      .select("*")
      .eq("pipeline_id", id)
      .order("position", { ascending: true })

    if (error) {
      console.error("Error fetching updated stages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in pipeline stages PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete a stage (via query param ?stageId=xxx)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const stageId = searchParams.get("stageId")

    if (!stageId) {
      return NextResponse.json({ error: "stageId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify pipeline ownership
    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (pipelineError || !pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // Check how many stages exist
    const { data: stages } = await supabase
      .from("lead_pipeline_stages")
      .select("id, position")
      .eq("pipeline_id", id)
      .order("position", { ascending: true })

    if (!stages || stages.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only stage in a pipeline" },
        { status: 400 }
      )
    }

    // Find the stage to delete and an adjacent stage
    const stageIndex = stages.findIndex((s: { id: string }) => s.id === stageId)
    if (stageIndex === -1) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    // Move leads to adjacent stage (prefer previous, else next)
    const targetStage = stageIndex > 0 ? stages[stageIndex - 1] : stages[stageIndex + 1]

    await supabase
      .from("leads")
      .update({ stage_id: targetStage.id })
      .eq("stage_id", stageId)

    // Delete the stage
    const { error } = await supabase
      .from("lead_pipeline_stages")
      .delete()
      .eq("id", stageId)

    if (error) {
      console.error("Error deleting pipeline stage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in pipeline stages DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
