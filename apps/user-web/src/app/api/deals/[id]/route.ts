import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  triggerDealStageChanged,
  triggerDealWon,
  triggerDealLost,
} from "@/lib/workflow-trigger-service"

// GET /api/deals/[id] - Get a single deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone, company, job_title, avatar_url),
      stage:pipeline_stages(id, name, color, position, win_probability)
    `)
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 })
  }

  return NextResponse.json({ deal })
}

// PATCH /api/deals/[id] - Update a deal
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

  // Fetch current deal to detect changes
  const { data: currentDeal } = await supabase
    .from("deals")
    .select("stage_id, status, contact_id")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  const previousStageId = currentDeal?.stage_id
  const previousStatus = currentDeal?.status

  const body = await request.json()
  const {
    name,
    contact_id,
    pipeline_id,
    stage_id,
    value,
    currency,
    expected_close_date,
    actual_close_date,
    status,
    probability,
    notes,
  } = body

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (contact_id !== undefined) updates.contact_id = contact_id
  if (pipeline_id !== undefined) updates.pipeline_id = pipeline_id
  if (stage_id !== undefined) updates.stage_id = stage_id
  if (value !== undefined) updates.value = value
  if (currency !== undefined) updates.currency = currency
  if (expected_close_date !== undefined) updates.expected_close_date = expected_close_date
  if (actual_close_date !== undefined) updates.actual_close_date = actual_close_date
  if (status !== undefined) updates.status = status
  if (probability !== undefined) updates.probability = probability
  if (notes !== undefined) updates.notes = notes

  const { data: deal, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, company, avatar_url),
      stage:pipeline_stages(id, name, color, position, win_probability)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build deal context for workflow triggers
  const dealContext = {
    id: deal.id,
    name: deal.name,
    status: deal.status,
    stage_id: deal.stage_id,
    profile_id: user.id,
    contact_id: deal.contact_id,
  }

  // Trigger deal_stage_changed workflow if stage changed (non-blocking)
  if (stage_id && previousStageId && stage_id !== previousStageId) {
    triggerDealStageChanged(dealContext, previousStageId).catch((err) => {
      console.error("Error triggering deal_stage_changed workflows:", err)
    })
  }

  // Trigger deal_won workflow if status changed to won (non-blocking)
  if (status === "won" && previousStatus !== "won") {
    triggerDealWon(dealContext).catch((err) => {
      console.error("Error triggering deal_won workflows:", err)
    })
  }

  // Trigger deal_lost workflow if status changed to lost (non-blocking)
  if (status === "lost" && previousStatus !== "lost") {
    triggerDealLost(dealContext).catch((err) => {
      console.error("Error triggering deal_lost workflows:", err)
    })
  }

  return NextResponse.json({ deal })
}

// DELETE /api/deals/[id] - Delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
