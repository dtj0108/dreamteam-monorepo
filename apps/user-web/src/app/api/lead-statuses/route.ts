import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("lead_statuses")
      .select("*")
      .eq("user_id", session.id)
      .order("position", { ascending: true })

    if (error) {
      console.error("Error fetching lead statuses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead statuses GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, color = "#6b7280", is_default = false, is_won = false, is_lost = false } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the highest position
    const { data: existing } = await supabase
      .from("lead_statuses")
      .select("position")
      .eq("user_id", session.id)
      .order("position", { ascending: false })
      .limit(1)

    const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from("lead_statuses")
        .update({ is_default: false })
        .eq("user_id", session.id)
    }

    const { data, error } = await supabase
      .from("lead_statuses")
      .insert({
        user_id: session.id,
        name,
        color,
        position,
        is_default,
        is_won,
        is_lost,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating lead status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead statuses POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
