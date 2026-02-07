import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { searchAvailableNumbers, purchasePhoneNumber } from "@/lib/twilio"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

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

    // Store in database
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

    return NextResponse.json({
      success: true,
      number: storedNumber,
    })
  } catch (error) {
    console.error("Error purchasing number:", error)
    return NextResponse.json(
      { error: "Failed to purchase number" },
      { status: 500 }
    )
  }
}
