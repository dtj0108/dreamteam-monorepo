import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

// GET /api/pipelines - List all pipelines with their stages
export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = await getCurrentWorkspaceId(user.id)
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
  }

  const { data: pipelines, error } = await supabase
    .from("pipelines")
    .select(`
      *,
      stages:pipeline_stages(*)
    `)
    .eq("profile_id", user.id)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort stages by position within each pipeline
  const pipelinesWithSortedStages = pipelines?.map((pipeline: { stages?: { position: number }[] }) => ({
    ...pipeline,
    stages: pipeline.stages?.sort((a, b) => a.position - b.position) || []
  }))

  return NextResponse.json({ pipelines: pipelinesWithSortedStages || [] })
}

// POST /api/pipelines - Create a new pipeline with stages
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = await getCurrentWorkspaceId(user.id)
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
  }

  const body = await request.json()
  const { name, description, is_default, stages } = body

  if (!name) {
    return NextResponse.json({ error: "Pipeline name is required" }, { status: 400 })
  }

  // If setting as default, unset other defaults first
  if (is_default) {
    await supabase
      .from("pipelines")
      .update({ is_default: false })
      .eq("profile_id", user.id)
  }

  // Create pipeline
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .insert({
      profile_id: user.id,
      workspace_id: workspaceId,
      name,
      description,
      is_default: is_default || false,
    })
    .select()
    .single()

  if (pipelineError) {
    return NextResponse.json({ error: pipelineError.message }, { status: 500 })
  }

  // Create stages if provided
  if (stages && stages.length > 0) {
    const stagesWithPipelineId = stages.map((stage: { name: string; color?: string; win_probability?: number }, index: number) => ({
      pipeline_id: pipeline.id,
      workspace_id: workspaceId,
      name: stage.name,
      color: stage.color || null,
      position: index,
      win_probability: stage.win_probability || 0,
    }))

    const { data: createdStages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .insert(stagesWithPipelineId)
      .select()

    if (stagesError) {
      // Rollback pipeline creation
      await supabase.from("pipelines").delete().eq("id", pipeline.id)
      return NextResponse.json({ error: stagesError.message }, { status: 500 })
    }

    return NextResponse.json({
      pipeline: { ...pipeline, stages: createdStages }
    })
  }

  return NextResponse.json({ pipeline: { ...pipeline, stages: [] } })
}
