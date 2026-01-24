import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { triggerDealCreated } from "@/lib/workflow-trigger-service"

// GET /api/deals - List all deals, optionally filtered by pipeline
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const pipelineId = searchParams.get("pipeline_id")

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let query = supabase
    .from("deals")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, company, avatar_url),
      stage:pipeline_stages(id, name, color, position, win_probability)
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId)
  }

  const { data: deals, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deals: deals || [] })
}

// POST /api/deals - Create a new deal
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    name,
    contact_id,
    pipeline_id,
    stage_id,
    value,
    currency,
    expected_close_date,
    probability,
    notes,
  } = body

  if (!name) {
    return NextResponse.json({ error: "Deal name is required" }, { status: 400 })
  }

  // If stage_id is provided, verify it belongs to the pipeline
  if (stage_id && pipeline_id) {
    const { data: stage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id, win_probability")
      .eq("id", stage_id)
      .eq("pipeline_id", pipeline_id)
      .single()

    if (stageError || !stage) {
      return NextResponse.json({ error: "Invalid stage for pipeline" }, { status: 400 })
    }
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      profile_id: user.id,
      name,
      contact_id,
      pipeline_id,
      stage_id,
      value: value || null,
      currency: currency || "USD",
      expected_close_date: expected_close_date || null,
      probability: probability || null,
      notes: notes || null,
      status: "open",
    })
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, company, avatar_url),
      stage:pipeline_stages(id, name, color, position, win_probability)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Trigger deal_created workflows (non-blocking)
  triggerDealCreated({
    id: deal.id,
    name: deal.name,
    status: deal.status,
    stage_id: deal.stage_id,
    profile_id: user.id,
    contact_id: deal.contact_id,
  }).catch((err) => {
    console.error("Error triggering deal_created workflows:", err)
  })

  return NextResponse.json({ deal })
}
