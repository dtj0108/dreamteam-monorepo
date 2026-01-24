import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// PATCH /api/pipelines/[id]/stages - Update/reorder pipeline stages
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id: pipelineId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify pipeline ownership
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .select("id")
    .eq("id", pipelineId)
    .eq("profile_id", user.id)
    .single()

  if (pipelineError || !pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
  }

  const body = await request.json()
  const { stages } = body

  if (!stages || !Array.isArray(stages)) {
    return NextResponse.json({ error: "Stages array is required" }, { status: 400 })
  }

  // Delete existing stages and recreate with new order
  await supabase
    .from("pipeline_stages")
    .delete()
    .eq("pipeline_id", pipelineId)

  // Insert new stages with correct positions
  const stagesWithPositions = stages.map((stage: { id?: string; name: string; color?: string; win_probability?: number }, index: number) => ({
    pipeline_id: pipelineId,
    name: stage.name,
    color: stage.color || null,
    position: index,
    win_probability: stage.win_probability || 0,
  }))

  const { data: newStages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .insert(stagesWithPositions)
    .select()
    .order("position")

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 })
  }

  return NextResponse.json({ stages: newStages })
}
