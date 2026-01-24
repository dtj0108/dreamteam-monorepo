import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// POST /api/push-tokens - Register or update a push token
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { token, platform, deviceId } = body as {
      token: string
      platform: "ios" | "android" | "expo"
      deviceId?: string
    }

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    if (!platform || !["ios", "android", "expo"].includes(platform)) {
      return NextResponse.json(
        { error: "Valid platform (ios, android, expo) is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if this token already exists for this user
    const { data: existingToken } = await supabase
      .from("user_push_tokens")
      .select("id")
      .eq("user_id", session.id)
      .eq("token", token)
      .single()

    if (existingToken) {
      // Update existing token (updates timestamp and platform if changed)
      const { error: updateError } = await supabase
        .from("user_push_tokens")
        .update({
          platform,
          device_id: deviceId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingToken.id)

      if (updateError) {
        console.error("Error updating push token:", updateError)
        return NextResponse.json({ error: "Failed to update token" }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: "updated" })
    }

    // Insert new token
    const { error: insertError } = await supabase
      .from("user_push_tokens")
      .insert({
        user_id: session.id,
        token,
        platform,
        device_id: deviceId || null,
      })

    if (insertError) {
      console.error("Error inserting push token:", insertError)
      return NextResponse.json({ error: "Failed to register token" }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: "registered" }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/push-tokens:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/push-tokens - Unregister a push token
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete the token for this user
    const { error } = await supabase
      .from("user_push_tokens")
      .delete()
      .eq("user_id", session.id)
      .eq("token", token)

    if (error) {
      console.error("Error deleting push token:", error)
      return NextResponse.json({ error: "Failed to unregister token" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/push-tokens:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
