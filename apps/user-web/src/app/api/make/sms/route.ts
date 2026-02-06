import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { formatE164, isValidE164 } from "@/lib/twilio"
import { sendSMSWithCredits } from "@/lib/sms-with-credits"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * POST /api/make/sms
 *
 * Send an SMS message via Make.com automation.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { to, message, from_number_id, lead_id, contact_id } = body

    if (!to) {
      return NextResponse.json({ error: "to (phone number) is required" }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }
    if (!from_number_id) {
      return NextResponse.json({ error: "from_number_id is required" }, { status: 400 })
    }

    const formattedPhone = formatE164(to)
    if (!isValidE164(formattedPhone)) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the API key owner
    const { data: apiKey } = await supabase
      .from("workspace_api_keys")
      .select("created_by")
      .eq("id", auth.keyId)
      .single()

    if (!apiKey?.created_by) {
      return NextResponse.json({ error: "API key has no associated user" }, { status: 400 })
    }

    // Get the user's owned phone number
    const { data: ownedNumber, error: numberError } = await supabase
      .from("twilio_numbers")
      .select("phone_number")
      .eq("id", from_number_id)
      .eq("user_id", apiKey.created_by)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (numberError || !ownedNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 403 })
    }

    // Create communication record first
    const { data: comm, error: insertError } = await supabase
      .from("communications")
      .insert({
        user_id: apiKey.created_by,
        lead_id: lead_id || null,
        contact_id: contact_id || null,
        type: "sms",
        direction: "outbound",
        from_number: ownedNumber.phone_number,
        to_number: formattedPhone,
        body: message,
        twilio_status: "pending",
        triggered_by: "workflow",
        workspace_id: auth.workspaceId,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Send SMS via Twilio with credit check and deduction
    const result = await sendSMSWithCredits({
      workspaceId: auth.workspaceId,
      to: formattedPhone,
      from: ownedNumber.phone_number,
      body: message,
    })

    // Update with Twilio response
    await supabase
      .from("communications")
      .update({
        twilio_sid: result.messageSid || null,
        twilio_status: result.success ? "queued" : "failed",
        error_message: result.error,
      })
      .eq("id", comm.id)

    if (!result.success) {
      const status = result.errorCode === "INSUFFICIENT_CREDITS" ? 402 : 500
      return NextResponse.json({ error: result.error || "Failed to send SMS", errorCode: result.errorCode }, { status })
    }

    // Fire webhook
    fireWebhooks("sms.sent", {
      id: comm.id,
      twilio_sid: result.messageSid,
      from: ownedNumber.phone_number,
      to: formattedPhone,
      body: message,
      status: "queued",
      lead_id,
      contact_id,
    }, auth.workspaceId)

    return NextResponse.json({
      id: comm.id,
      twilio_sid: result.messageSid,
      from: ownedNumber.phone_number,
      to: formattedPhone,
      body: message,
      status: "queued",
    }, { status: 201 })
  } catch (error) {
    console.error("Error in make/sms POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
