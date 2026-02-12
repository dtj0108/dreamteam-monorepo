import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { searchAvailableNumbers, purchasePhoneNumber } from "@/lib/twilio"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"
import { hasPaymentMethodSaved, getWorkspaceBilling } from "@/lib/billing-queries"
import { addPhoneNumberToSubscription } from "@/lib/addons-queries"
import { PHONE_PRICING, type PhoneNumberType } from "@/types/addons"

// GET /api/twilio/numbers - Search for available phone numbers
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const country = searchParams.get("country") || "US"
    const areaCode = searchParams.get("areaCode") || undefined
    const type = (searchParams.get("type") as "local" | "tollFree" | "mobile") || "local"
    const limit = parseInt(searchParams.get("limit") || "20")

    const result = await searchAvailableNumbers({
      country,
      areaCode,
      type,
      smsEnabled: true,
      voiceEnabled: true,
      limit,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ numbers: result.numbers })
  } catch (error) {
    console.error("Error searching numbers:", error)
    return NextResponse.json(
      { error: "Failed to search numbers" },
      { status: 500 }
    )
  }
}

// POST /api/twilio/numbers - Purchase a phone number
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { phoneNumber, friendlyName } = body
    const numberType: PhoneNumberType = body.numberType || 'local'

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      )
    }

    // Get user's current workspace
    const workspaceId = await getCurrentWorkspaceId(user.id)

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found. Please set up your workspace first." },
        { status: 400 }
      )
    }

    // Require a payment method before purchasing numbers.
    // Check saved payment method first, then fall back to checking for an active
    // subscription (which means Stripe already has a working payment method).
    const hasPayment = await hasPaymentMethodSaved(workspaceId)
    if (!hasPayment) {
      const billing = await getWorkspaceBilling(workspaceId)
      const hasActiveSubscription = billing?.plan_status === 'active' || billing?.agent_status === 'active'
      if (!hasActiveSubscription && !billing?.stripe_customer_id) {
        return NextResponse.json(
          { error: "A payment method is required to purchase phone numbers. Please add a card in Billing settings." },
          { status: 402 }
        )
      }
    }

    // Purchase the number from Twilio
    const result = await purchasePhoneNumber(phoneNumber)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Check if workspace has any existing numbers
    const { count } = await supabase
      .from("twilio_numbers")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)

    const isFirst = count === 0

    // Store in database with billing fields
    const { data: storedNumber, error: dbError } = await supabase
      .from("twilio_numbers")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        twilio_sid: result.sid,
        phone_number: result.phoneNumber,
        friendly_name: friendlyName || result.friendlyName,
        capabilities: { voice: true, sms: true, mms: false },
        is_primary: isFirst, // First number is automatically primary
        number_type: numberType,
        monthly_price_cents: PHONE_PRICING[numberType],
        billing_status: 'active',
      })
      .select()
      .single()

    if (dbError) {
      console.error("Failed to store number in database:", dbError)
      // Return error so frontend knows it failed - include Twilio SID for recovery
      return NextResponse.json(
        {
          error: `Number was purchased from Twilio but failed to save to database. Use "Sync from Twilio" to recover it.`,
          twilioSid: result.sid,
          phoneNumber: result.phoneNumber,
        },
        { status: 500 }
      )
    }

    // Add to Stripe subscription (soft failure - number already purchased from Twilio)
    const billingResult = await addPhoneNumberToSubscription(workspaceId, numberType)
    if (!billingResult.success) {
      console.error("Failed to add phone number to billing:", billingResult.error)
    }

    return NextResponse.json({
      success: true,
      number: storedNumber,
      ...(billingResult && !billingResult.success ? { billingWarning: billingResult.error } : {}),
    })
  } catch (error) {
    console.error("Error purchasing number:", error)
    return NextResponse.json(
      { error: "Failed to purchase number" },
      { status: 500 }
    )
  }
}
