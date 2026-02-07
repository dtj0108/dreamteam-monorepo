import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { triggerDealStageChanged } from "@/lib/workflow-trigger-service"

// PATCH /api/deals/[id]/stage - Move a deal to a different stage
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { stage_id } = body

  if (!stage_id) {
    return NextResponse.json({ error: "stage_id is required" }, { status: 400 })
  }

  // Get the deal first to verify ownership and get pipeline_id
  const { data: existingDeal, error: dealError } = await supabase
    .from("deals")
    .select("id, pipeline_id, stage_id, name, status, contact_id")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  if (dealError || !existingDeal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 })
  }

  const previousStageId = existingDeal.stage_id

  // Verify the stage belongs to the deal's pipeline
  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id, win_probability")
    .eq("id", stage_id)
    .eq("pipeline_id", existingDeal.pipeline_id)
    .single()

  if (stageError || !stage) {
    return NextResponse.json({ error: "Invalid stage for this pipeline" }, { status: 400 })
  }

  // Update the deal
  const { data: deal, error } = await supabase
    .from("deals")
    .update({
      stage_id,
      probability: stage.win_probability, // Auto-update probability based on stage
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, company),
      stage:pipeline_stages(id, name, color, position, win_probability)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Trigger deal_stage_changed workflow if stage actually changed (non-blocking)
  if (previousStageId && stage_id !== previousStageId) {
    triggerDealStageChanged(
      {
        id: deal.id,
        name: deal.name,
        status: deal.status,
        stage_id: deal.stage_id,
        profile_id: user.id,
        contact_id: deal.contact_id,
      },
      previousStageId
    ).catch((err) => {
      console.error("Error triggering deal_stage_changed workflows:", err)
    })
  }

  return NextResponse.json({ deal })
}
