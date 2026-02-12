import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { releasePhoneNumber, updatePhoneNumber } from "@/lib/twilio"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"
import { removePhoneNumberFromSubscription } from "@/lib/addons-queries"
import { type PhoneNumberType } from "@/types/addons"

// GET /api/twilio/numbers/owned - List workspace's phone numbers
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current workspace
    const workspaceId = await getCurrentWorkspaceId(user.id)

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    // Fetch numbers for this workspace (RLS will also enforce this)
    const { data: numbers, error } = await supabase
      .from("twilio_numbers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch numbers:", error)
      return NextResponse.json(
        { error: "Failed to fetch numbers" },
        { status: 500 }
      )
    }

    return NextResponse.json({ numbers })
  } catch (error) {
    console.error("Error fetching owned numbers:", error)
    return NextResponse.json(
      { error: "Failed to fetch numbers" },
      { status: 500 }
    )
  }
}

// DELETE /api/twilio/numbers/owned - Release a phone number
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, twilioSid } = body

    if (!id || !twilioSid) {
      return NextResponse.json(
        { error: "Number ID and Twilio SID are required" },
        { status: 400 }
      )
    }

    // Get user's current workspace
    const workspaceId = await getCurrentWorkspaceId(user.id)

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    // Verify number belongs to user's workspace
    const { data: number, error: fetchError } = await supabase
      .from("twilio_numbers")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single()

    if (fetchError || !number) {
      return NextResponse.json(
        { error: "Number not found or unauthorized" },
        { status: 404 }
      )
    }

    // Release from Twilio
    const result = await releasePhoneNumber(twilioSid)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Remove from Stripe subscription before deleting from DB
    const numberType: PhoneNumberType = number.number_type || 'local'
    const billingResult = await removePhoneNumberFromSubscription(workspaceId, numberType)
    if (!billingResult.success) {
      console.error("Failed to remove phone number from billing:", billingResult.error)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("twilio_numbers")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Failed to delete from database:", deleteError)
      return NextResponse.json({
        success: true,
        warning: "Number released from Twilio but failed to remove from database",
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error releasing number:", error)
    return NextResponse.json(
      { error: "Failed to release number" },
      { status: 500 }
    )
  }
}

// PATCH /api/twilio/numbers/owned - Update a phone number (set primary, update name)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, twilioSid, isPrimary, friendlyName } = body

    if (!id) {
      return NextResponse.json(
        { error: "Number ID is required" },
        { status: 400 }
      )
    }

    // Get user's current workspace
    const workspaceId = await getCurrentWorkspaceId(user.id)

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    // Verify number belongs to user's workspace
    const { data: number, error: fetchError } = await supabase
      .from("twilio_numbers")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single()

    if (fetchError || !number) {
      return NextResponse.json(
        { error: "Number not found or unauthorized" },
        { status: 404 }
      )
    }

    // Update on Twilio if friendly name changed
    if (friendlyName && twilioSid) {
      await updatePhoneNumber(twilioSid, { friendlyName })
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (friendlyName !== undefined) updates.friendly_name = friendlyName
    if (isPrimary !== undefined) updates.is_primary = isPrimary

    // Update in database (trigger will handle unsetting other primaries)
    const { data: updatedNumber, error: updateError } = await supabase
      .from("twilio_numbers")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Failed to update number:", updateError)
      return NextResponse.json(
        { error: "Failed to update number" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, number: updatedNumber })
  } catch (error) {
    console.error("Error updating number:", error)
    return NextResponse.json(
      { error: "Failed to update number" },
      { status: 500 }
    )
  }
}
