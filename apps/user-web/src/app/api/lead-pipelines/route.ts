import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

// GET - List all pipelines for current user (with stages)
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("lead_pipelines")
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .eq("user_id", session.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching lead pipelines:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort stages by position within each pipeline
    const pipelinesWithSortedStages = data?.map((pipeline: { stages?: { position: number }[] }) => ({
      ...pipeline,
      stages: pipeline.stages?.sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      ),
    }))

    return NextResponse.json(pipelinesWithSortedStages)
  } catch (error) {
    console.error("Error in lead pipelines GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new pipeline with optional stages
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, is_default, stages } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // If this is being set as default, unset other defaults first
    if (is_default) {
      await supabase
        .from("lead_pipelines")
        .update({ is_default: false })
        .eq("user_id", session.id)
    }

    // Create the pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .insert({
        user_id: session.id,
        name,
        description: description || null,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (pipelineError) {
      console.error("Error creating lead pipeline:", pipelineError)
      return NextResponse.json({ error: pipelineError.message }, { status: 500 })
    }

    // Create stages if provided
    if (stages && Array.isArray(stages) && stages.length > 0) {
      const stagesData = stages.map(
        (
          stage: { name: string; color?: string; is_won?: boolean; is_lost?: boolean },
          index: number
        ) => ({
          pipeline_id: pipeline.id,
          name: stage.name,
          color: stage.color || "#6b7280",
          position: index,
          is_won: stage.is_won || false,
          is_lost: stage.is_lost || false,
        })
      )

      const { error: stagesError } = await supabase
        .from("lead_pipeline_stages")
        .insert(stagesData)

      if (stagesError) {
        console.error("Error creating pipeline stages:", stagesError)
        // Don't fail the whole operation, pipeline was created successfully
      }
    }

    // Fetch the complete pipeline with stages
    const { data: completePipeline, error: fetchError } = await supabase
      .from("lead_pipelines")
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .eq("id", pipeline.id)
      .single()

    if (fetchError) {
      return NextResponse.json(pipeline)
    }

    // Sort stages by position
    if (completePipeline.stages) {
      completePipeline.stages.sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      )
    }

    return NextResponse.json(completePipeline)
  } catch (error) {
    console.error("Error in lead pipelines POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
