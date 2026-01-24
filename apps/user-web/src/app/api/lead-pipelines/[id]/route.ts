import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Get single pipeline with stages
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("lead_pipelines")
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
      }
      console.error("Error fetching lead pipeline:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort stages by position
    if (data.stages) {
      data.stages.sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead pipeline GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update pipeline details
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, description, is_default } = body

    const supabase = createAdminClient()

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("lead_pipelines")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from("lead_pipelines")
        .update({ is_default: false })
        .eq("user_id", session.id)
        .neq("id", id)
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (is_default !== undefined) updates.is_default = is_default

    const { data, error } = await supabase
      .from("lead_pipelines")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .single()

    if (error) {
      console.error("Error updating lead pipeline:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort stages by position
    if (data.stages) {
      data.stages.sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead pipeline PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete pipeline
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const supabase = createAdminClient()

    // Verify ownership and check if it's the only pipeline
    const { data: pipelines, error: countError } = await supabase
      .from("lead_pipelines")
      .select("id, is_default")
      .eq("user_id", session.id)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if (!pipelines || pipelines.length === 0) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const pipelineToDelete = pipelines.find((p: { id: string }) => p.id === id)
    if (!pipelineToDelete) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // Don't allow deleting the last pipeline
    if (pipelines.length === 1) {
      return NextResponse.json(
        { error: "Cannot delete the only pipeline" },
        { status: 400 }
      )
    }

    // If deleting the default pipeline, set another one as default
    if (pipelineToDelete.is_default) {
      const otherPipeline = pipelines.find((p: { id: string }) => p.id !== id)
      if (otherPipeline) {
        await supabase
          .from("lead_pipelines")
          .update({ is_default: true })
          .eq("id", otherPipeline.id)

        // Move leads from deleted pipeline to the new default
        const { data: defaultStage } = await supabase
          .from("lead_pipeline_stages")
          .select("id")
          .eq("pipeline_id", otherPipeline.id)
          .order("position", { ascending: true })
          .limit(1)
          .single()

        if (defaultStage) {
          await supabase
            .from("leads")
            .update({
              pipeline_id: otherPipeline.id,
              stage_id: defaultStage.id,
            })
            .eq("pipeline_id", id)
        }
      }
    }

    // Delete the pipeline (stages will cascade)
    const { error } = await supabase
      .from("lead_pipelines")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting lead pipeline:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in lead pipeline DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
