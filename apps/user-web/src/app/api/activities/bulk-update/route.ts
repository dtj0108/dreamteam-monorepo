import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// POST /api/activities/bulk-update - Update multiple activities
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { activity_ids, updates } = body

    if (!Array.isArray(activity_ids) || activity_ids.length === 0) {
      return NextResponse.json(
        { error: "activity_ids required" },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "updates object required" },
        { status: 400 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update activities, ensuring they belong to the current user
    const { error, count } = await supabase
      .from("activities")
      .update(updates)
      .in("id", activity_ids)
      .eq("profile_id", user.id)

    if (error) {
      console.error("Bulk update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: count || 0 })
  } catch (err) {
    console.error("Bulk update uncaught error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
