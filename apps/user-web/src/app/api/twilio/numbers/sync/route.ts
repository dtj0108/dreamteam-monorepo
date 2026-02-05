import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { listOwnedNumbers } from "@/lib/twilio"

// POST /api/twilio/numbers/sync - Sync phone numbers from Twilio to database
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's default workspace
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_workspace_id")
      .eq("id", user.id)
      .single()

    if (!profile?.default_workspace_id) {
      return NextResponse.json(
        { error: "No workspace found. Please set up your workspace first." },
        { status: 400 }
      )
    }

    // Get all numbers from Twilio
    const twilioResult = await listOwnedNumbers()

    if (!twilioResult.success || !twilioResult.numbers) {
      return NextResponse.json(
        { error: twilioResult.error || "Failed to fetch numbers from Twilio" },
        { status: 500 }
      )
    }

    // Get existing numbers from database
    const { data: existingNumbers } = await supabase
      .from("twilio_numbers")
      .select("twilio_sid")
      .eq("user_id", user.id)

    const existingSids = new Set(existingNumbers?.map((n) => n.twilio_sid) || [])

    // Find numbers that are in Twilio but not in database
    const missingNumbers = twilioResult.numbers.filter(
      (n) => !existingSids.has(n.sid)
    )

    if (missingNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All numbers are already synced",
        synced: 0,
      })
    }

    // Check if user has any existing numbers (for primary designation)
    const hasExisting = existingNumbers && existingNumbers.length > 0

    // Insert missing numbers
    const { data: insertedNumbers, error: insertError } = await supabase
      .from("twilio_numbers")
      .insert(
        missingNumbers.map((n, index) => ({
          user_id: user.id,
          workspace_id: profile.default_workspace_id,
          twilio_sid: n.sid,
          phone_number: n.phoneNumber,
          friendly_name: n.friendlyName,
          capabilities: {
            voice: n.capabilities.voice,
            sms: n.capabilities.sms,
            mms: n.capabilities.mms,
          },
          // First synced number becomes primary if user has no existing numbers
          is_primary: !hasExisting && index === 0,
        }))
      )
      .select()

    if (insertError) {
      console.error("Failed to sync numbers:", insertError)
      return NextResponse.json(
        { error: "Failed to save synced numbers to database" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${insertedNumbers?.length || 0} number(s) from Twilio`,
      synced: insertedNumbers?.length || 0,
      numbers: insertedNumbers,
    })
  } catch (error) {
    console.error("Error syncing numbers:", error)
    return NextResponse.json(
      { error: "Failed to sync numbers" },
      { status: 500 }
    )
  }
}
