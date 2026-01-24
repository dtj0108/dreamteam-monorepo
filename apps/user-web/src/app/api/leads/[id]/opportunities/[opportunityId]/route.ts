import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { fireWebhooks } from "@/lib/make-webhooks"

// PATCH /api/leads/[id]/opportunities/[opportunityId] - Update an opportunity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; opportunityId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, opportunityId } = await params
    const body = await request.json()
    const { name, value, stage, probability, expected_close_date, notes, status, value_type, contact_id, closed_date } = body

    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get current opportunity to track stage changes
    const { data: currentOpp } = await supabase
      .from("lead_opportunities")
      .select("stage, status, workspace_id")
      .eq("id", opportunityId)
      .single()

    const oldStage = currentOpp?.stage
    const oldStatus = currentOpp?.status

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (value !== undefined) updateData.value = value
    if (stage !== undefined) updateData.stage = stage
    if (probability !== undefined) updateData.probability = probability
    if (expected_close_date !== undefined) updateData.expected_close_date = expected_close_date || null
    if (notes !== undefined) updateData.notes = notes
    if (value_type !== undefined) updateData.value_type = value_type
    if (contact_id !== undefined) updateData.contact_id = contact_id || null

    // Handle status changes - auto-set closed_date when marking won/lost
    if (status !== undefined) {
      updateData.status = status
      if (status === 'won' || status === 'lost') {
        updateData.closed_date = closed_date || new Date().toISOString().split('T')[0]
      } else if (status === 'active') {
        updateData.closed_date = null
      }
    }

    const { data: opportunity, error } = await supabase
      .from("lead_opportunities")
      .update(updateData)
      .eq("id", opportunityId)
      .eq("lead_id", id)
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone, title)
      `)
      .single()

    if (error) {
      console.error("Error updating opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhooks for stage changes
    if (opportunity && currentOpp?.workspace_id) {
      // Fire stage_changed webhook if stage changed
      if (stage !== undefined && stage !== oldStage) {
        fireWebhooks(
          "opportunity.stage_changed",
          { ...opportunity, lead_id: id, old_stage: oldStage, new_stage: stage },
          currentOpp.workspace_id
        )

        // Check if the new stage indicates a win
        const wonStages = ["won", "closed_won", "closed-won"]
        if (wonStages.includes(stage.toLowerCase())) {
          fireWebhooks("opportunity.won", { ...opportunity, lead_id: id }, currentOpp.workspace_id)
        }
      }

      // Also fire for status changes (won/lost)
      if (status !== undefined && status !== oldStatus && status === "won") {
        fireWebhooks("opportunity.won", { ...opportunity, lead_id: id }, currentOpp.workspace_id)
      }
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error("Error in opportunity PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/opportunities/[opportunityId] - Delete an opportunity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; opportunityId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, opportunityId } = await params
    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("lead_opportunities")
      .delete()
      .eq("id", opportunityId)
      .eq("lead_id", id)

    if (error) {
      console.error("Error deleting opportunity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in opportunity DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
